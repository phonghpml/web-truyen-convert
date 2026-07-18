import shutil
from pathlib import Path

import requests


def download_video_for_upload(video_path: str, destination_path: str) -> str:
    source = Path(video_path)
    destination = Path(destination_path)
    if not source.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return str(destination.resolve())


def download_remote_video(video_url: str, destination_path: str) -> str:
    destination = Path(destination_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    with requests.get(video_url, stream=True, timeout=120) as response:
        response.raise_for_status()
        with destination.open("wb") as output_file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    output_file.write(chunk)

    return str(destination.resolve())
