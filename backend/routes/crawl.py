import asyncio
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

import database as db_mod
from crawl_queue import CrawlJobData, CrawlJobStatus, CrawlQueueManager, CrawlChapterStatus
from crawl_worker import crawl_job_worker

router = APIRouter(prefix="/crawl", tags=["crawl"])

queue_manager = CrawlQueueManager()
_background_tasks: Dict[str, asyncio.Task] = {}


class CrawlSubmitRequest(BaseModel):
    url: str


class CrawlJobSummary(BaseModel):
    job_id: str
    book_url: str
    title_vi: Optional[str]
    author_vi: Optional[str]
    description_vi: Optional[str]
    cover_url: Optional[str]
    status: CrawlJobStatus
    total_chapters: int
    crawled_chapters: int
    current_chapter_index: int
    current_chapter_title: Optional[str]
    current_chapter_url: Optional[str]
    remaining_chapters: int
    created_at: str
    updated_at: str
    chapters: List[Dict]


def _normalize_source_url(url: str) -> str:
    normalized = url.strip()
    return normalized if normalized.endswith("/") else normalized + "/"


def _job_to_payload(job: CrawlJobData) -> Dict:
    return {
        "job_id": job.job_id,
        "book_url": job.book_url,
        "title_vi": job.title_vi,
        "author_vi": job.author_vi,
        "description_vi": job.description_vi,
        "cover_url": job.cover_url,
        "status": job.status.value,
        "total_chapters": job.total_chapters,
        "crawled_chapters": job.crawled_chapters,
        "current_chapter_index": job.current_chapter_index,
        "current_chapter_title": job.current_chapter_title,
        "current_chapter_url": job.current_chapter_url,
        "remaining_chapters": queue_manager.get_remaining_chapters(job.job_id),
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
        "chapters": [
            {
                "chapter_no": chapter.chapter_no,
                "title_vi": chapter.title_vi,
                "url": chapter.url,
                "status": chapter.status.value,
            }
            for chapter in job.chapters
        ],
    }


def _ensure_background_task(job_id: str) -> None:
    existing = _background_tasks.get(job_id)
    if existing and not existing.done():
        return

    async def _runner():
        job = queue_manager.get_job(job_id)
        if not job:
            return
        await crawl_job_worker(job, queue_manager)

    _background_tasks[job_id] = asyncio.create_task(_runner())


def _job_to_db_dict(job: CrawlJobData) -> dict:
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


def _row_to_job(row: dict) -> CrawlJobData:
    status_value = getattr(row, "status", None)
    try:
        status = CrawlJobStatus(status_value)
    except ValueError:
        status = CrawlJobStatus.queued

    created_at = getattr(row, "createdAt", None) or getattr(row, "created_at", None)
    updated_at = getattr(row, "updatedAt", None) or getattr(row, "updated_at", None)

    return CrawlJobData(
        job_id=getattr(row, "job_id", ""),
        book_url=getattr(row, "book_url", ""),
        created_at=created_at,
        updated_at=updated_at,
        status=status,
        total_chapters=getattr(row, "total_chapters", 0),
        crawled_chapters=getattr(row, "crawled_chapters", 0),
        current_chapter_index=getattr(row, "current_chapter_index", 0),
        current_chapter_title=getattr(row, "current_chapter_title", None),
        current_chapter_url=getattr(row, "current_chapter_url", None),
        title_vi=getattr(row, "title_vi", None),
        author_vi=getattr(row, "author_vi", None),
        description_vi=getattr(row, "description_vi", None),
        cover_url=getattr(row, "cover_url", None),
        chapters=[],
    )


async def _persist_job(job: CrawlJobData) -> None:
    if not job:
        return
    await db_mod.save_crawl_job(_job_to_db_dict(job))


async def _load_job_into_memory(job_id: str) -> Optional[CrawlJobData]:
    existing = queue_manager.get_job(job_id)
    if existing:
        return existing

    row = await db_mod.get_crawl_job_by_job_id(job_id)
    if not row:
        return None

    job = _row_to_job(row)
    queue_manager.restore_job(job)
    return job


async def restore_jobs_from_db() -> None:
    rows = await db_mod.get_crawl_jobs()
    for row in rows:
        job = _row_to_job(row)
        if job.status == CrawlJobStatus.running:
            job.status = CrawlJobStatus.paused
            job.updated_at = datetime.utcnow()
        queue_manager.restore_job(job)
        if job.status == CrawlJobStatus.queued:
            _ensure_background_task(job.job_id)
        if job.status == CrawlJobStatus.running:
            await db_mod.update_crawl_job(job.job_id, _job_to_db_dict(job))


@router.post("/submit")
async def submit_crawl(request: CrawlSubmitRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL không được để trống")
    if "sangtacviet.com" not in url.lower():
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ URL từ sangtacviet.com")

    job = queue_manager.add_job(url)
    await _persist_job(job)
    _ensure_background_task(job.job_id)
    return {"success": True, "data": _job_to_payload(job)}


@router.get("/check")
async def check_crawl_in_db(url: str):
    normalized_url = _normalize_source_url(url)
    book = await db_mod.client.book.find_unique(where={"source_url": normalized_url})
    if not book:
        return {"success": True, "data": None}

    chapters = await db_mod.client.chapter.find_many(
        where={"book_source_url": normalized_url},
        order={"chapter_no": "asc"},
    )

    return {
        "success": True,
        "data": {
            "book": db_mod.serialize_book_row(book, len(chapters)),
            "chapters": [db_mod.serialize_chapter_row(ch) for ch in chapters],
        },
    }


@router.get("/jobs")
async def list_crawl_jobs():
    rows = await db_mod.get_crawl_jobs()
    for row in rows:
        job_id = getattr(row, "job_id", None)
        if not job_id or queue_manager.get_job(job_id):
            continue
        job = _row_to_job(row)
        queue_manager.restore_job(job)

    jobs = [ _job_to_payload(job) for job in queue_manager.get_all_jobs() ]
    return {"success": True, "data": jobs}


@router.post("/jobs/{job_id}/pause")
async def pause_crawl_job(job_id: str):
    job = queue_manager.pause_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job không tìm thấy")
    await _persist_job(job)
    return {"success": True, "data": _job_to_payload(job)}


@router.post("/jobs/{job_id}/resume")
async def resume_crawl_job(job_id: str):
    job = queue_manager.resume_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job không tìm thấy")
    await _persist_job(job)
    _ensure_background_task(job_id)
    return {"success": True, "data": _job_to_payload(job)}


@router.delete("/jobs/{job_id}")
async def delete_crawl_job(job_id: str):
    job = queue_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job không tìm thấy")
    queue_manager.remove_job(job_id)
    await db_mod.delete_crawl_job(job_id)
    return {"success": True, "message": "Đã xóa job"}
