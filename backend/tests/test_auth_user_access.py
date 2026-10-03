import unittest
import os
from unittest.mock import patch

from fastapi import Response
from starlette.requests import Request

from routes.auth import _get_user_value, _set_refresh_cookie


class DummyUser:
    def __init__(self, **values):
        self._values = values

    def __getitem__(self, key):
        return self._values[key]

    def get(self, key, default=None):
        return self._values.get(key, default)


class AttributeUser:
    def __init__(self, **values):
        for key, value in values.items():
            setattr(self, key, value)


class AuthUserAccessTests(unittest.TestCase):
    def test_get_user_value_supports_dict_like_objects(self):
        user = DummyUser(email="test@example.com", password_hash="hash", name="Test")

        self.assertEqual(_get_user_value(user, "email"), "test@example.com")
        self.assertEqual(_get_user_value(user, "password_hash"), "hash")
        self.assertEqual(_get_user_value(user, "name"), "Test")
        self.assertEqual(_get_user_value(user, "missing", "fallback"), "fallback")

    @patch.dict(os.environ, {"COOKIE_SECURE": "false"})
    def test_refresh_cookie_is_cross_site_compatible_for_https_origin(self):
        request = Request({"type": "http", "method": "POST", "path": "/auth/login", "headers": [(b"origin", b"https://reader.example.com")]})
        response = Response()

        _set_refresh_cookie(response, request, "opaque-token", 60)

        cookie = response.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("secure", cookie)
        self.assertIn("samesite=none", cookie)

    @patch.dict(os.environ, {"COOKIE_SECURE": "false"})
    def test_refresh_cookie_uses_lax_for_local_http_origin(self):
        request = Request({"type": "http", "method": "POST", "path": "/auth/login", "headers": [(b"origin", b"http://localhost:3000")]})
        response = Response()

        _set_refresh_cookie(response, request, "opaque-token", 60)

        cookie = response.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("samesite=lax", cookie)
        self.assertNotIn("; secure", cookie)

    def test_get_user_value_supports_attribute_based_objects(self):
        user = AttributeUser(email="attr@example.com", password_hash="attr-hash", name="Attr")

        self.assertEqual(_get_user_value(user, "email"), "attr@example.com")
        self.assertEqual(_get_user_value(user, "password_hash"), "attr-hash")
        self.assertEqual(_get_user_value(user, "name"), "Attr")


if __name__ == "__main__":
    unittest.main()
