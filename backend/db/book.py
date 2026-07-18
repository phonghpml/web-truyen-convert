from datetime import datetime

from .client import client


def _normalize_book_data(data: dict) -> dict:
    book_data = {
        "source_url": data["source_url"],
        "slug": data.get("slug"),
        "title_vi": data.get("title_vi"),
        "title_en": data.get("title_en"),
        "author_vi": data.get("author_vi"),
        "description_vi": data.get("description_vi"),
        "status": data.get("status"),
        "cover_url": data.get("cover_url"),
        "views_count": data.get("views_count", 0),
        "chapters_count": data.get("chapters_count", 0),
        "updatedAt": datetime.now(),
    }
    return {k: v for k, v in book_data.items() if v is not None}


async def save_book(data: dict):
    book_data = _normalize_book_data(data)
    return await client.book.upsert(
        where={"source_url": book_data["source_url"]},
        data={
            "create": book_data,
            "update": book_data,
        },
    )
