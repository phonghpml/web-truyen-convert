from middleware.auth_gate import is_public_path


def test_public_paths_match():
    assert is_public_path("/")
    assert is_public_path("/auth/login")
    assert is_public_path("/auth/refresh")
    assert is_public_path("/docs")
    assert is_public_path("/static/js/app.js")


def test_protected_paths_rejected():
    assert not is_public_path("/books/manual")
    assert not is_public_path("/user/history")
    assert not is_public_path("/chapters/123")
