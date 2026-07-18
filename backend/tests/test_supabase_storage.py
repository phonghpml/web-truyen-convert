import importlib
import os
from pathlib import Path

import pytest


@pytest.fixture
def backend_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def test_supabase_storage_loads_env_from_backend_directory(monkeypatch, backend_dir: Path):
    monkeypatch.chdir(backend_dir.parent)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_STORAGE_BUCKET", raising=False)

    monkeypatch.syspath_prepend(str(backend_dir))

    import supabase_storage

    importlib.reload(supabase_storage)

    assert supabase_storage.SUPABASE_URL == "https://dgxfkoxdihqdefdnahye.supabase.co"
    assert supabase_storage.SUPABASE_SERVICE_ROLE_KEY == "sb_secret_HmbL9lhKS9Yq8cN0Fymw7g_etUp5lEM"
    assert supabase_storage.SUPABASE_STORAGE_BUCKET == "videos"
