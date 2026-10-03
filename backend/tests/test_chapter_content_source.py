import os
from types import SimpleNamespace

import pytest

import main
import scraper
from db import chapter as db_chapter


def test_get_latest_debug_screenshot_returns_newest_png(tmp_path, monkeypatch):
    monkeypatch.setattr(scraper, "DEBUG_ARTIFACT_DIR", tmp_path)
    older_image = tmp_path / "debug_1_timeout.png"
    newer_image = tmp_path / "debug_2_crash.png"
    html_dump = tmp_path / "debug_3_crash.html"

    for path in (older_image, newer_image, html_dump):
        path.write_bytes(b"debug")

    os.utime(older_image, (1, 1))
    os.utime(newer_image, (2, 2))
    os.utime(html_dump, (3, 3))

    assert scraper.get_latest_debug_screenshot() == newer_image


@pytest.mark.parametrize(
    "raw_data, expected_fragments",
    [
        (
            "<p>\n    <span style='color:gray;font-size:12px;'>@Bạn đang đọc bản lưu trong hệ thống</span>\n</p>\n\t<i h='nam hải' t='南海' v='Nam Hải/nam hải/Nam hải' p='ns'>Nam Hải</i>\n<i h='đạo' t='道' v='đạo/nói/đường/đường đi/' p='q'>đạo</i>",
            ["Nam Hải", "đạo"],
        ),
        (
            "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"no\"?>\n<html><body><p idx=\"0\">【 <i h='đạo trường' t='道长' v='đạo trưởng/Đạo trưởng' p='n'>Đạo trưởng</i>, <i h='ngã môn' t='我们' v='chúng ta/chúng tôi/chúng tao/chúng tớ/Chúng ta' p='r'>chúng ta</i> <i h='giá' t='这' v='cái này/là cái này/giá/này/vậy/đây/' p='r'>cái này</i> <i h='ban thượng' t='班上' v='lớp học/trong lớp' p='s'>lớp học</i> ?】</p></body></html>",
            ["Đạo trưởng", "chúng ta", "lớp học"],
        ),
    ],
)
def test_normalize_stv_chapter_data_handles_both_payload_variants(raw_data, expected_fragments):
    text = scraper.normalize_stv_chapter_data(raw_data)

    assert text
    assert "@Bạn đang đọc bản lưu trong hệ thống" not in text
    for fragment in expected_fragments:
        assert fragment in text
    assert "<" not in text


@pytest.mark.parametrize(
    "page_text, expected",
    [
        ("Please complete the security check", True),
        ("请完成安全验证", True),
        ("Nội dung chương truyện bình thường", False),
    ],
)
def test_stv_captcha_marker_detection(page_text, expected):
    assert scraper._contains_stv_captcha_marker(page_text) is expected


@pytest.mark.asyncio
async def test_stv_captcha_actions_control_and_release_retained_page(monkeypatch):
    events = []

    class FakeMouse:
        async def click(self, x, y):
            events.append(("click", x, y))

        async def move(self, x, y, **kwargs):
            events.append(("move", x, y, kwargs.get("steps")))

        async def down(self):
            events.append(("down",))

        async def up(self):
            events.append(("up",))

    class FakeKeyboard:
        async def insert_text(self, text):
            events.append(("text", text))

        async def press(self, key):
            events.append(("press", key))

    class FakePage:
        mouse = FakeMouse()
        keyboard = FakeKeyboard()

        def is_closed(self):
            return False

        async def screenshot(self, **_kwargs):
            return b"png"

        async def close(self):
            events.append(("close",))

    page = FakePage()
    monkeypatch.setitem(
        scraper.STV_CAPTCHA_CHALLENGES,
        "job-1",
        {
            "page": page,
            "chapter_id": "123",
            "chapter_url": "https://sangtacviet.com/chapter/123",
            "code": "21",
            "captcha_detected": True,
            "created_at": 1.0,
        },
    )

    assert await scraper.get_stv_captcha_screenshot("job-1") == b"png"
    await scraper.perform_stv_captcha_action("job-1", {"action": "click", "x": 20, "y": 30})
    await scraper.perform_stv_captcha_action("job-1", {
        "action": "drag", "x": 10, "y": 20, "end_x": 100, "end_y": 20,
    })
    await scraper.perform_stv_captcha_action("job-1", {"action": "type", "text": "ABCD"})
    await scraper.perform_stv_captcha_action("job-1", {"action": "press", "key": "Enter"})
    await scraper.close_stv_captcha_challenge("job-1")

    assert ("click", 20, 30) in events
    assert ("down",) in events and ("up",) in events
    assert ("text", "ABCD") in events
    assert ("press", "Enter") in events
    assert ("close",) in events
    assert "job-1" not in scraper.STV_CAPTCHA_CHALLENGES


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
