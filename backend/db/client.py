import asyncio
import logging
import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from prisma import Prisma

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Missing DATABASE_URL in environment")

DATABASE_CONNECTION_LIMIT = max(1, int(os.getenv("DATABASE_CONNECTION_LIMIT", "3")))
DATABASE_CONNECT_RETRIES = max(1, int(os.getenv("DATABASE_CONNECT_RETRIES", "4")))
logger = logging.getLogger(__name__)


def _database_url_with_connection_limit(database_url: str, limit: int) -> str:
    parsed = urlsplit(database_url)
    query = [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True) if key != "connection_limit"]
    query.append(("connection_limit", str(limit)))
    return urlunsplit(parsed._replace(query=urlencode(query)))


client = Prisma(
    datasource={"url": _database_url_with_connection_limit(DATABASE_URL, DATABASE_CONNECTION_LIMIT)},
)

async def connect():
    for attempt in range(1, DATABASE_CONNECT_RETRIES + 1):
        try:
            await client.connect()
            return
        except Exception as exc:
            if attempt == DATABASE_CONNECT_RETRIES:
                raise

            delay = min(2 ** (attempt - 1), 5)
            logger.warning(
                "Database connection attempt %s/%s failed; retrying in %s seconds: %s",
                attempt,
                DATABASE_CONNECT_RETRIES,
                delay,
                exc,
            )
            await asyncio.sleep(delay)

async def disconnect():
    await client.disconnect()
