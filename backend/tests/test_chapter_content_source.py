import pytest

import main
from db import chapter as db_chapter


@pytest.mark.asyncio
async def test_resolve_chapter_content_prefers_db(monkeypatch):
    async def fake_get_content(url: str):
        assert url == "https://example.com/chapter"
        return "Đoạn 1\nĐoạn 2"

    async def fake_scrape(url: str):
        raise AssertionError("should not crawl when database content exists")

    monkeypatch.setattr(main.db_mod, "get_chapter_content_by_url", fake_get_content)
    monkeypatch.setattr(main.scr, "scrape_chapter_content", fake_scrape)

    paragraphs, source = await main.resolve_chapter_content("https://example.com/chapter")

    assert paragraphs == ["Đoạn 1", "Đoạn 2"]
    assert source == "db"


@pytest.mark.asyncio
async def test_resolve_chapter_content_falls_back_to_crawler(monkeypatch):
    async def fake_get_content(url: str):
        return None

    async def fake_scrape(url: str):
        return "Dòng 1\nDòng 2"

    async def fake_save_content(url: str, paragraphs, chapter_title=None):
        assert url == "https://example.com/chapter"
        assert paragraphs == ["Dòng 1", "Dòng 2"]

    async def fake_get_chapter(url: str):
        return None

    monkeypatch.setattr(main.db_mod, "get_chapter_content_by_url", fake_get_content)
    monkeypatch.setattr(main.scr, "scrape_chapter_content", fake_scrape)
    monkeypatch.setattr(main.db_mod, "save_chapter_content", fake_save_content)
    monkeypatch.setattr(main.db_mod, "get_chapter_by_url", fake_get_chapter)
    monkeypatch.setattr(main.tr, "translate_text", lambda text: text)

    paragraphs, source = await main.resolve_chapter_content("https://example.com/chapter")

    assert paragraphs == ["Dòng 1", "Dòng 2"]
    assert source == "crawler"


@pytest.mark.asyncio
async def test_resolve_chapter_content_uses_raw_for_stv(monkeypatch):
    async def fake_get_content(url: str):
        return None

    async def fake_scrape_stv(url: str):
        return "Đây là thử nghiệm\nDòng 2"

    async def fake_save_content(url: str, paragraphs, chapter_title=None):
        assert url == "https://sangtacviet.com/chapter"
        assert paragraphs == ["Đây là thử nghiệm", "Dòng 2"]

    async def fake_get_chapter(url: str):
        return None

    monkeypatch.setattr(main.db_mod, "get_chapter_content_by_url", fake_get_content)
    monkeypatch.setattr(main.scr, "scrape_stv_chapter_content", fake_scrape_stv)
    monkeypatch.setattr(main.db_mod, "save_chapter_content", fake_save_content)
    monkeypatch.setattr(main.db_mod, "get_chapter_by_url", fake_get_chapter)

    paragraphs, source = await main.resolve_chapter_content("https://sangtacviet.com/chapter")

    assert paragraphs == ["Đây là thử nghiệm", "Dòng 2"]
    assert source == "crawler"


@pytest.mark.asyncio
async def test_resolve_chapter_content_prepends_title_when_saving(monkeypatch):
    """Verify that chapter title is passed to save_chapter_content when available."""
    
    async def fake_get_content(url: str):
        return None

    async def fake_scrape(url: str):
        return "Nội dung đoạn 1\nNội dung đoạn 2"

    saved_title = None

    async def fake_save_content(url: str, paragraphs, chapter_title=None):
        nonlocal saved_title
        assert url == "https://example.com/chapter"
        assert paragraphs == ["Nội dung đoạn 1", "Nội dung đoạn 2"]
        saved_title = chapter_title
        assert chapter_title == "Chương 1", f"Expected title 'Chương 1' but got {chapter_title}"

    class FakeChapter:
        url = "https://example.com/chapter"
        title_vi = "Chương 1"

    async def fake_get_chapter(url: str):
        if url == "https://example.com/chapter":
            return FakeChapter()
        return None

    monkeypatch.setattr(main.db_mod, "get_chapter_content_by_url", fake_get_content)
    monkeypatch.setattr(main.scr, "scrape_chapter_content", fake_scrape)
    monkeypatch.setattr(main.db_mod, "save_chapter_content", fake_save_content)
    monkeypatch.setattr(main.db_mod, "get_chapter_by_url", fake_get_chapter)
    monkeypatch.setattr(main.tr, "translate_text", lambda text: text)

    paragraphs, source = await main.resolve_chapter_content("https://example.com/chapter")

    assert paragraphs == ["Nội dung đoạn 1", "Nội dung đoạn 2"]
    assert source == "crawler"
    assert saved_title == "Chương 1"
