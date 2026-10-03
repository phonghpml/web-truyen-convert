import asyncio
import importlib
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest

db_client = importlib.import_module("db.client")


def test_database_url_with_connection_limit_preserves_other_options():
    url = "postgresql://user:pass@db.example/test?sslmode=require&pgbouncer=true&connection_limit=15"

    result = db_client._database_url_with_connection_limit(url, 3)

    assert parse_qs(urlsplit(result).query) == {
        "sslmode": ["require"],
        "pgbouncer": ["true"],
        "connection_limit": ["3"],
    }


@pytest.mark.asyncio
async def test_connect_retries_transient_failures(monkeypatch):
    attempts = 0
    delays = []

    async def fake_connect():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise RuntimeError("pool temporarily full")

    async def fake_sleep(delay):
        delays.append(delay)

    monkeypatch.setattr(db_client, "client", SimpleNamespace(connect=fake_connect))
    monkeypatch.setattr(db_client, "DATABASE_CONNECT_RETRIES", 3)
    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    await db_client.connect()

    assert attempts == 3
    assert delays == [1, 2]
