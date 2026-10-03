import sys
import time
from types import SimpleNamespace

import pytest
from starlette.requests import Request

import routes.crawl as crawl


@pytest.mark.asyncio
async def test_remote_desktop_page_bootstraps_novnc(monkeypatch):
    monkeypatch.setattr(crawl.scr, "is_stv_remote_desktop_enabled", lambda: True)

    response = await crawl.captcha_desktop_page()

    assert response.status_code == 200
    assert "/novnc/core/rfb.js" in response.body.decode()
    assert "captcha/desktop/ws?ticket=" in response.body.decode()


def _request() -> Request:
    return Request({
        "type": "http",
        "http_version": "1.1",
        "method": "POST",
        "scheme": "https",
        "path": "/crawl/captcha/challenges/job-1/desktop-ticket",
        "query_string": b"",
        "headers": [(b"host", b"api.example.com")],
        "server": ("api.example.com", 443),
        "client": ("127.0.0.1", 12345),
    })


@pytest.mark.asyncio
async def test_desktop_ticket_uses_configured_public_origin(monkeypatch):
    monkeypatch.setenv("PUBLIC_BACKEND_URL", "https://api.example.com/")
    monkeypatch.setattr(crawl.scr, "is_stv_remote_desktop_enabled", lambda: True)
    monkeypatch.setattr(
        crawl.scr,
        "get_stv_captcha_challenges",
        lambda: [{"job_id": "job-1"}],
    )
    crawl._CAPTCHA_DESKTOP_TICKETS.clear()

    result = await crawl.create_captcha_desktop_ticket("job-1", _request())

    assert result["data"]["url"].startswith("https://api.example.com/crawl/captcha/desktop#ticket=")
    ticket = result["data"]["url"].split("ticket=", 1)[1]
    assert crawl._CAPTCHA_DESKTOP_TICKETS[ticket][0] == "job-1"
    assert crawl._CAPTCHA_DESKTOP_TICKETS[ticket][1] > time.time()


@pytest.mark.asyncio
async def test_desktop_websocket_consumes_ticket_and_relays_frames(monkeypatch):
    ticket = "one-use-ticket"
    crawl._CAPTCHA_DESKTOP_TICKETS[ticket] = ("job-1", time.time() + 60)
    monkeypatch.setattr(
        crawl.scr,
        "get_stv_captcha_challenges",
        lambda: [{"job_id": "job-1"}],
    )

    sent_to_vnc = []
    sent_to_browser = []
    connected_urls = []

    class FakeVNC:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def send(self, message):
            sent_to_vnc.append(message)

        def __aiter__(self):
            async def frames():
                yield b"frame-from-vnc"
            return frames()

    def fake_connect(url, **_kwargs):
        connected_urls.append(url)
        return FakeVNC()

    monkeypatch.setitem(sys.modules, "websockets", SimpleNamespace(connect=fake_connect))

    class FakeSocket:
        query_params = {"ticket": ticket}
        accepted = False

        def __init__(self):
            self.messages = iter([
                {"type": "websocket.receive", "bytes": b"input-from-browser"},
                {"type": "websocket.disconnect"},
            ])

        async def accept(self):
            self.accepted = True

        async def receive(self):
            return next(self.messages)

        async def send_bytes(self, data):
            sent_to_browser.append(data)

        async def send_text(self, data):
            sent_to_browser.append(data)

        async def close(self, **_kwargs):
            raise AssertionError("valid ticket must not close the socket")

    socket = FakeSocket()
    await crawl.captcha_desktop_websocket(socket)

    assert socket.accepted
    assert connected_urls == ["ws://127.0.0.1:6080/websockify"]
    assert sent_to_vnc == [b"input-from-browser"]
    assert sent_to_browser == [b"frame-from-vnc"]
    assert ticket not in crawl._CAPTCHA_DESKTOP_TICKETS
