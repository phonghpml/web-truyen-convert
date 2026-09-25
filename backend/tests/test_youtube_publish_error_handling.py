import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from routes.video import publish_video_to_youtube


class YoutubePublishErrorHandlingTests(unittest.TestCase):
    @patch("routes.video.get_refresh_token", return_value="refresh_token_123")
    @patch("routes.video.refresh_access_token", return_value={"access_token": "access_token_123"})
    @patch("routes.video.download_remote_video", side_effect=RuntimeError("download failed"))
    @patch(
        "routes.video.db_mod.get_video_by_id",
        AsyncMock(
            return_value={
                "id": "video_123",
                "video_url": "https://example.com/video.mp4",
                "job_id": "job_123",
                "video_title": "Demo",
                "video_description": "Desc",
                "video_tags": "tag1, tag2",
            }
        ),
    )
    def test_publish_video_to_youtube_turns_download_errors_into_http_502(
        self,
        mock_get_video_by_id,
        mock_download_remote_video,
        mock_refresh_access_token,
        mock_get_refresh_token,
    ):
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(publish_video_to_youtube("video_123"))

        self.assertEqual(ctx.exception.status_code, 502)
        self.assertIn("Không tải được video", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
