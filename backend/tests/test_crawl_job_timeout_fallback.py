import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import routes.crawl as crawl
import db.chapter as chapter_db
from crawl_queue import CrawlChapterItem, CrawlChapterStatus, CrawlJobStatus, CrawlQueueManager
import services.crawl_service as crawl_service


@pytest.mark.asyncio
async def test_persist_crawl_job_swallows_db_errors(monkeypatch):
    async def fake_save_crawl_job(*args, **kwargs):
        raise RuntimeError("db unavailable")

    monkeypatch.setattr(crawl_service.db_mod, "save_crawl_job", fake_save_crawl_job)

    job = SimpleNamespace(
        job_id="job-1",
        book_url="https://example.com/book",
        status=CrawlJobStatus.queued,
        title_vi="Title",
        author_vi=None,
        description_vi=None,
        cover_url=None,
        total_chapters=0,
        crawled_chapters=0,
        current_chapter_index=0,
        current_chapter_title=None,
        current_chapter_url=None,
        book_id=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    await crawl_service.persist_crawl_job(job)


def test_crawl_queue_add_job_creates_job_with_expected_state():
    manager = CrawlQueueManager()
    job = manager.add_job("https://example.com/book")

    assert job.book_url == "https://example.com/book"
    assert job.status == CrawlJobStatus.queued
    assert job.total_chapters == 0
    assert job.chapters == []


@pytest.mark.asyncio
async def test_job_payload_falls_back_to_job_level_progress_when_chapters_missing():
    job = SimpleNamespace(
        job_id="job-1",
        book_url="https://example.com/book",
        title_vi="Tiêu đề",
        author_vi="Tác giả",
        description_vi="Mô tả",
        cover_url=None,
        status=CrawlJobStatus.running,
        total_chapters=12,
        crawled_chapters=3,
        current_chapter_index=3,
        current_chapter_title="Chương 4",
        current_chapter_url="https://example.com/ch4",
        created_at=crawl.datetime.now(crawl.timezone.utc),
        updated_at=crawl.datetime.now(crawl.timezone.utc),
        chapters=[],
    )

    payload = await crawl._job_to_payload(job, db_chapter_count=12, include_chapters=False)

    assert payload["total_chapters"] == 12
    assert payload["crawled_chapters"] == 3
    assert payload["total_nonvip_chapters"] == 12
    assert payload["crawled_nonvip_chapters"] == 3
    assert payload["remaining_nonvip_chapters"] == 9


@pytest.mark.asyncio
async def test_load_job_chapters_falls_back_to_empty_when_db_times_out(monkeypatch):
    async def fake_find_many(*args, **kwargs):
        raise TimeoutError("db timeout")

    fake_chapter_client = SimpleNamespace(find_many=fake_find_many)
    monkeypatch.setattr(crawl.db_mod.client, "chapter", fake_chapter_client)

    job = SimpleNamespace(
        book_url="https://example.com/book",
        chapters=None,
        total_chapters=0,
        crawled_chapters=0,
    )

    await crawl._load_job_chapters(job)

    assert job.chapters == []
    assert job.total_chapters == 0
    assert job.crawled_chapters == 0


@pytest.mark.asyncio
async def test_save_chapters_uses_bounded_concurrency(monkeypatch):
    active = 0
    peak_active = 0

    async def fake_find_unique(*args, **kwargs):
        return SimpleNamespace(source_url="https://example.com/book")

    async def fake_upsert(*args, **kwargs):
        nonlocal active, peak_active
        active += 1
        peak_active = max(peak_active, active)
        try:
            await asyncio.sleep(0.02)
            return {"ok": True}
        finally:
            active -= 1

    fake_client = SimpleNamespace(
        book=SimpleNamespace(find_unique=fake_find_unique),
        chapter=SimpleNamespace(upsert=fake_upsert),
    )
    monkeypatch.setattr(chapter_db, "client", fake_client)

    chapters = [{"title": f"Chương {i}", "url": f"https://example.com/ch{i}", "slug": f"chuong-{i}", "chapter_no": i, "access": "regular"} for i in range(1, 21)]

    await chapter_db.save_chapters("https://example.com/book", chapters)

    assert peak_active <= 8, f"expected bounded concurrency, got peak_active={peak_active}"


@pytest.mark.asyncio
async def test_crawl_worker_pauses_without_failing_chapter_on_stv_access_denial(monkeypatch):
    manager = CrawlQueueManager()
    job = manager.add_job("https://sangtacviet.com/truyen/qidian/1/123/")
    chapter_url = f"{job.book_url}456/"

    async def fake_scrape_basic_info(_url):
        return {}

    async def fake_scrape_chapters(_url):
        return [{"title_vi": "Chương 1", "url": chapter_url}]

    async def fake_find_unique(**_kwargs):
        return None

    async def fake_scrape_chapter(_url, job_id=None):
        assert job_id == job.job_id
        raise crawl_service.scr.STVAccessBlocked("21", captcha_detected=True)

    async def no_op(*_args, **_kwargs):
        return None

    monkeypatch.setattr(crawl_service.scr, "scrape_stv_basic_info", fake_scrape_basic_info)
    monkeypatch.setattr(crawl_service.scr, "scrape_stv_chapters", fake_scrape_chapters)
    monkeypatch.setattr(crawl_service.scr, "scrape_stv_chapter_content", fake_scrape_chapter)
    close_browser = AsyncMock()
    monkeypatch.setattr(crawl_service.scr, "close_browser", close_browser)
    monkeypatch.setattr(crawl_service, "save_book_info", no_op)
    monkeypatch.setattr(crawl_service.db_mod, "save_chapters", no_op)
    monkeypatch.setattr(crawl_service, "persist_crawl_job", no_op)
    monkeypatch.setattr(
        crawl_service.db_mod,
        "client",
        SimpleNamespace(chapter=SimpleNamespace(find_unique=fake_find_unique)),
    )

    await crawl_service.crawl_job_worker(job, manager)

    assert job.status == CrawlJobStatus.paused
    assert job.chapters[0].status == CrawlChapterStatus.pending
    close_browser.assert_not_awaited()
