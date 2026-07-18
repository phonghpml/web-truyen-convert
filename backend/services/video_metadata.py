from __future__ import annotations

from typing import Any


def build_video_publish_metadata(
    *,
    book_title: str | None = None,
    author_name: str | None = None,
    chapter_start: int | None = None,
    chapter_count: int | None = None,
    chapter_title: str | None = None,
) -> dict[str, Any]:
    safe_book_title = (book_title or "Video truyện").strip()
    clean_author_name = author_name.strip() if isinstance(author_name, str) and author_name.strip() else None
    safe_author_name = clean_author_name or "Tác giả chưa cập nhật"
    safe_chapter_start = chapter_start or 1
    safe_chapter_count = chapter_count or 1
    safe_end = safe_chapter_start + safe_chapter_count - 1

    chapter_title_range = (
        f"Chương {safe_chapter_start}" if safe_chapter_start == safe_end else f"Chương {safe_chapter_start}-{safe_end}"
    )
    chapter_range_text = (
        f"chương {safe_chapter_start}" if safe_chapter_start == safe_end else f"các chương {safe_chapter_start}-{safe_end}"
    )
    video_title = f"{safe_book_title} - {chapter_title_range}"
    if clean_author_name:
        video_description = (
            f"{safe_book_title} do tác giả {safe_author_name} sáng tác. "
            f"Video này được tạo tự động từ {chapter_range_text}."
        )
    else:
        video_description = (
            f"{safe_book_title}. "
            f"Video này được tạo tự động từ {chapter_range_text}."
        )
    # video_description should describe the video as generated from chapter range,
    # but should not include the current chapter title text.
    tags = [safe_book_title.lower()]
    if clean_author_name:
        tags.append(clean_author_name.lower())
    tags.extend([
        "truyện",
        "video tự động",
        f"chương {safe_chapter_start}" if safe_chapter_start == safe_end else f"chương {safe_chapter_start}-{safe_end}",
    ])

    return {
        "author_name": clean_author_name,
        "video_title": video_title,
        "video_description": video_description,
        "video_tags": ", ".join(tags),
    }
