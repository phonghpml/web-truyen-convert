import asyncio
import random
from datetime import datetime, timezone
from typing import Optional

from slugify import slugify

import database as db_mod
import scraper as scr
import translator_utils as tr
from crawl_queue import CrawlQueueManager, CrawlJobStatus, CrawlChapterStatus, CrawlChapterItem


DELAY_SECONDS_PER_CHAPTER = 15


def _generate_slug(title: str) -> str:
    base = slugify(title or "truyen")
    suffix = str(random.randint(1000, 9999))
    return f"{base}-{suffix}"


def _crawl_job_to_db_dict(job: CrawlJobData) -> dict:
    return {
        "job_id": job.job_id,
        "book_url": job.book_url,
        "status": job.status.value,
        "title_vi": job.title_vi,
        "author_vi": job.author_vi,
        "description_vi": job.description_vi,
        "cover_url": job.cover_url,
        "total_chapters": job.total_chapters,
        "crawled_chapters": job.crawled_chapters,
        "current_chapter_index": job.current_chapter_index,
        "current_chapter_title": job.current_chapter_title,
        "current_chapter_url": job.current_chapter_url,
        "createdAt": job.created_at,
        "updatedAt": job.updated_at,
    }


async def _persist_crawl_job(job: CrawlJobData) -> None:
    if not job:
        return
    await db_mod.save_crawl_job(_crawl_job_to_db_dict(job))


async def crawl_job_worker(job: 'CrawlJobData', manager: CrawlQueueManager) -> None:
    try:
        if job.status == CrawlJobStatus.paused:
            return

        job.status = CrawlJobStatus.running
        job.updated_at = datetime.now(timezone.utc)
        await _persist_crawl_job(job)

        raw_info = None
        if not job.title_vi:
            raw_info = await scr.scrape_stv_basic_info(job.book_url)
            if raw_info:
                job.title_vi = raw_info.get("title_vi") or job.title_vi
                job.cover_url = raw_info.get("cover_url") or job.cover_url
                job.author_vi = raw_info.get("author_vi") or job.author_vi
                job.description_vi = raw_info.get("description_vi") or job.description_vi

        if not job.title_vi:
            job.title_vi = "Truyện từ SangTacViet"

        await db_mod.save_book({
            "source_url": job.book_url,
            "title_vi": job.title_vi,
            "author_vi": raw_info.get("author_vi") if raw_info else None,
            "description_vi": raw_info.get("description_vi") if raw_info else None,
            "cover_url": job.cover_url or "",
            "status": "info_only",
            "slug": _generate_slug(job.title_vi),
        })

        raw_chapters = await scr.scrape_stv_chapters(job.book_url)
        if not raw_chapters:
            manager.fail_job(job.job_id)
            await _persist_crawl_job(job)
            return

        chapter_items = []
        chapter_batch = []
        for index, raw in enumerate(raw_chapters, start=1):
            title_vi = raw.get("title_vi") or raw.get("title_cn") or f"Chương {index}"
            chapter_items.append(CrawlChapterItem(chapter_no=index, title_vi=title_vi, url=raw.get("url", "")))
            chapter_batch.append({
                "chapter_no": index,
                "title_vi": title_vi,
                "url": raw.get("url", ""),
                "slug": _generate_slug(title_vi),
            })

        manager.add_chapters(job.job_id, chapter_items)
        await _persist_crawl_job(job)
        await db_mod.save_chapters(job.book_url, chapter_batch)

        for index, chapter in enumerate(job.chapters, start=1):
            if manager.is_paused(job.job_id):
                job.status = CrawlJobStatus.paused
                job.updated_at = datetime.now(timezone.utc)
                return

            manager.update_current_chapter(job.job_id, chapter)
            existing = await db_mod.client.chapter.find_unique(where={"url": chapter.url})
            if existing and getattr(existing, "content", None):
                chapter.status = CrawlChapterStatus.skipped
                manager.record_chapter_status(job.job_id, chapter.chapter_no, CrawlChapterStatus.skipped)
                manager.update_progress(job.job_id, job.crawled_chapters, index)
                await _persist_crawl_job(job)
                continue

            raw_content = await scr.scrape_stv_chapter_content(chapter.url)
            if not raw_content:
                chapter.status = CrawlChapterStatus.failed
                manager.record_chapter_status(job.job_id, chapter.chapter_no, CrawlChapterStatus.failed)
                manager.update_progress(job.job_id, job.crawled_chapters, index)
                await _persist_crawl_job(job)
                continue

            paragraphs = [p.strip() for p in raw_content.split("\n") if p.strip()]
            await db_mod.save_chapter_content(chapter.url, paragraphs)
            chapter.status = CrawlChapterStatus.crawled
            manager.record_chapter_status(job.job_id, chapter.chapter_no, CrawlChapterStatus.crawled)
            manager.update_progress(job.job_id, job.crawled_chapters, index)
            await _persist_crawl_job(job)
            await asyncio.sleep(DELAY_SECONDS_PER_CHAPTER)

        manager.complete_job(job.job_id)
        await _persist_crawl_job(job)
    except Exception:
        manager.fail_job(job.job_id)
