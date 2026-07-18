import json
import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path, override=False)

YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID", "").strip()
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "").strip()
YOUTUBE_REDIRECT_URI = os.getenv("YOUTUBE_REDIRECT_URI", "").strip()

YOUTUBE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status"


def upload_video_to_youtube(
    access_token: str,
    title: str,
    description: str,
    tags: str,
    video_file_path: str,
    privacy_status: str = "private",
) -> dict[str, Any]:
    if not access_token:
        raise ValueError("Missing access token")
    if not Path(video_file_path).exists():
        raise ValueError("Video file not found")

    snippet = {
        "title": title,
        "description": description,
        "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
    }
    status = {"privacyStatus": privacy_status}

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/octet-stream",
    }

    params = {
        "uploadType": "multipart",
    }

    boundary = "===============Boundary=="
    multipart_body = []
    multipart_body.append(f"--{boundary}")
    multipart_body.append("Content-Type: application/json; charset=UTF-8")
    multipart_body.append("")
    multipart_body.append(json.dumps({"snippet": snippet, "status": status}))
    multipart_body.append(f"--{boundary}")
    multipart_body.append("Content-Type: application/octet-stream")
    multipart_body.append("")
    multipart_body.append(Path(video_file_path).read_bytes())
    multipart_body.append(f"--{boundary}--")

    body = b"\r\n".join(
        item if isinstance(item, bytes) else item.encode("utf-8") for item in multipart_body
    )
    headers["Content-Type"] = f"multipart/related; boundary={boundary}"

    response = requests.post(YOUTUBE_UPLOAD_ENDPOINT, params=params, headers=headers, data=body, timeout=300)
    response.raise_for_status()
    return response.json()
