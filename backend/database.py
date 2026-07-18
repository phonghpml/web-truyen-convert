from db.client import client, connect, disconnect
from db.book import save_book
from db.chapter import get_chapter_by_url, get_chapter_content_by_url, get_chapter_contents_by_urls, save_chapter_content, save_chapters
from db.crawl_job import (
    save_crawl_job,
    update_crawl_job,
    delete_crawl_job,
    get_crawl_jobs,
    get_crawl_job_by_job_id,
)
from db.video import save_video, get_videos_by_book_url, get_video_by_id, delete_video
from db.serializers import serialize_book_row, serialize_chapter_row

__all__ = [
    "client",
    "connect",
    "disconnect",
    "save_book",
    "get_chapter_by_url",
    "get_chapter_content_by_url",
    "get_chapter_contents_by_urls",
    "save_chapter_content",
    "save_chapters",
    "save_crawl_job",
    "update_crawl_job",
    "delete_crawl_job",
    "get_crawl_jobs",
    "get_crawl_job_by_job_id",
    "save_video",
    "get_videos_by_book_url",
    "get_video_by_id",
    "delete_video",
    "serialize_book_row",
    "serialize_chapter_row",
]

