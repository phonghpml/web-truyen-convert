import asyncio
import logging
import re
import subprocess
from pathlib import Path
import aiohttp
import edge_tts
import numpy as np
from imageio_ffmpeg import get_ffmpeg_exe

from tts_engine import NghiTTSEngine

logger = logging.getLogger(__name__)

OUTPUT_VIDEO_WIDTH = 1280
OUTPUT_VIDEO_HEIGHT = 720
MAX_TTS_CHUNK_BYTES = 2800
MAX_TTS_CONCURRENCY = 3
MAX_TTS_RETRIES = 3
EDGE_TTS_VOICES = [
    "vi-VN-NamMinhNeural",
    "vi-VN-HoaiMyNeural",
    "en-US-JennyNeural",
]
NGHITTS_VOICES = ["nghitts:ngochuyennew"]
VOICE_FALLBACKS = EDGE_TTS_VOICES
ALL_TTS_VOICES = EDGE_TTS_VOICES + NGHITTS_VOICES
DEFAULT_VOICE = EDGE_TTS_VOICES[0]
DEFAULT_TTS_RATE = "+0%"
NGHITTS_MIN_CHUNK_LENGTH = 4
NGHITTS_MAX_CHUNK_LENGTH = 500


def _normalize_rate(rate: str) -> str:
    if not rate:
        return DEFAULT_TTS_RATE

    rate_clean = rate.replace(" ", "+").strip()
    if not rate_clean.startswith("+") and not rate_clean.startswith("-"):
        rate_clean = "+" + rate_clean
    return rate_clean


def ensure_output_directories(base_dir: Path) -> None:
    (base_dir / "videos").mkdir(parents=True, exist_ok=True)
    (base_dir / "videos" / "inputs").mkdir(parents=True, exist_ok=True)
    (base_dir / "videos" / "audio").mkdir(parents=True, exist_ok=True)


def _split_text_for_tts(text: str, max_bytes: int = MAX_TTS_CHUNK_BYTES) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]
    sentence_split = re.compile(r"(?<=[.!?…])\s+")
    chunks: list[str] = []
    current_chunk = ""

    def chunk_byte_len(value: str) -> int:
        return len(value.encode("utf-8"))

    def _find_split_index(long_text: str) -> int:
        separators = [",", ";", ":", "—", "–", "-", " "]
        for sep in separators:
            idx = long_text.rfind(sep, 0, max_bytes)
            if idx >= max_bytes // 2:
                return idx + (0 if sep == " " else 1)
        return max_bytes

    def split_long_text(long_text: str) -> list[str]:
        parts: list[str] = []
        remaining = long_text.strip()
        while remaining:
            if chunk_byte_len(remaining) <= max_bytes:
                parts.append(remaining)
                break
            split_at = _find_split_index(remaining)
            part = remaining[:split_at].rstrip()
            if not part:
                part = remaining[:max_bytes]
            parts.append(part)
            remaining = remaining[len(part):].lstrip()
        return parts

    for paragraph in paragraphs:
        sentences = [s.strip() for s in sentence_split.split(paragraph) if s.strip()]
        if not sentences:
            sentences = [paragraph]

        for sentence in sentences:
            if chunk_byte_len(sentence) > max_bytes:
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = ""
                chunks.extend(split_long_text(sentence))
                continue

            if not current_chunk:
                current_chunk = sentence
                continue

            candidate = f"{current_chunk} {sentence}"
            if chunk_byte_len(candidate) <= max_bytes:
                current_chunk = candidate
            else:
                chunks.append(current_chunk)
                current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def _sanitize_text(text: str) -> str:
    paragraphs = [re.sub(r"\s+", " ", paragraph.strip()) for paragraph in re.split(r"\n\s*\n", text)]
    return "\n\n".join([p for p in paragraphs if p])


def _split_nghitts_text_for_tts(text: str, max_length: int = NGHITTS_MAX_CHUNK_LENGTH, min_length: int = NGHITTS_MIN_CHUNK_LENGTH) -> list[str]:
    if not text or not text.strip():
        return []

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    chunks: list[str] = []

    for line in lines:
        ends_with_punctuation = bool(re.search(r"[.!?]$", line))
        processed_line = line if ends_with_punctuation else f"{line}."
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])(?=\s+|$)", processed_line) if s.strip()]

        current_chunk = ""
        for sentence in sentences:
            if len(sentence) > max_length:
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = ""

                words = sentence.split()
                long_chunk = ""
                for word in words:
                    candidate = f"{long_chunk} {word}".strip()
                    if len(candidate) <= max_length:
                        long_chunk = candidate
                    else:
                        if long_chunk:
                            chunks.append(long_chunk)
                        long_chunk = word

                if long_chunk:
                    current_chunk = long_chunk
                continue

            potential_chunk = f"{current_chunk} {sentence}".strip() if current_chunk else sentence
            if len(potential_chunk) > max_length:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = sentence
            elif len(potential_chunk) < min_length:
                current_chunk = potential_chunk
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = sentence

        if current_chunk:
            chunks.append(current_chunk)

    return chunks


async def _generate_audio_for_chunk(chunk: str, voice: str, rate: str) -> bytes:
    last_exception: Exception | None = None

    for attempt in range(1, MAX_TTS_RETRIES + 1):
        try:
            communicate = edge_tts.Communicate(chunk, voice, rate=rate)
            audio_bytes = bytearray()
            async for message in communicate.stream():
                if message["type"] == "audio":
                    audio_bytes.extend(message["data"])
            if not audio_bytes:
                raise RuntimeError("No audio data received from edge_tts")
            return bytes(audio_bytes)
        except (aiohttp.ClientError, ConnectionResetError, OSError, asyncio.TimeoutError) as exc:
            last_exception = exc
            logger.warning(
                "TTS websocket error attempt %s/%s for voice=%s: %s",
                attempt,
                MAX_TTS_RETRIES,
                voice,
                exc,
            )
            if attempt >= MAX_TTS_RETRIES:
                raise
            await asyncio.sleep(1)
        except Exception:
            raise

    raise RuntimeError("TTS failed after retries") from last_exception


async def _generate_audio_with_fallbacks(chunk: str, voices: list[str], rate: str) -> bytes:
    for voice in voices:
        try:
            audio_bytes = await _generate_audio_for_chunk(chunk, voice, rate)
            if audio_bytes:
                return audio_bytes
        except (edge_tts.exceptions.NoAudioReceived, ValueError):
            continue

    if len(chunk) > 200:
        midpoint = len(chunk) // 2
        split_at = chunk.rfind(" ", 0, midpoint)
        if split_at < 50:
            split_at = midpoint
        left = chunk[:split_at].strip()
        right = chunk[split_at:].strip()
        if left and right and left != chunk and right != chunk:
            return await _generate_audio_with_fallbacks(left, voices) + await _generate_audio_with_fallbacks(right, voices)

    raise RuntimeError("No audio was generated for one of the TTS chunks.")


async def _generate_audio_chunks_parallel(chunks: list[str], voices: list[str], rate: str, concurrency: int = MAX_TTS_CONCURRENCY, job_id: str | None = None) -> list[bytes]:
    semaphore = asyncio.Semaphore(concurrency)

    async def generate_chunk(chunk: str, index: int) -> bytes:
        async with semaphore:
            logger.info("Đang tạo chunk audio %s/%s | job_id=%s", index + 1, len(chunks), job_id or "n/a")
            return await _generate_audio_with_fallbacks(chunk, voices, rate)

    tasks = [asyncio.create_task(generate_chunk(chunk, index)) for index, chunk in enumerate(chunks)]
    return await asyncio.gather(*tasks)


def _parse_nghitts_rate(rate: str, default_scales: np.ndarray) -> np.ndarray:
    rate_clean = _normalize_rate(rate)
    try:
        percent = float(rate_clean.replace("+", "").replace("%", ""))
    except ValueError:
        percent = 0.0

    base_length = float(default_scales[1])
    duration_scale = base_length * (1.0 + percent / 100.0)
    duration_scale = max(0.5, min(duration_scale, 3.0))
    return np.array([float(default_scales[0]), duration_scale, float(default_scales[2])], dtype=np.float32)


def _join_audio_arrays(audio_arrays: list[np.ndarray], sample_rate: int, pause_seconds: float = 0.25) -> np.ndarray:
    if not audio_arrays:
        return np.array([], dtype=np.float32)
    if len(audio_arrays) == 1:
        return audio_arrays[0]

    pause_length = int(sample_rate * pause_seconds)
    pause_array = np.zeros(pause_length, dtype=np.float32)
    joined = [audio_arrays[0]]
    for next_audio in audio_arrays[1:]:
        joined.append(pause_array)
        joined.append(next_audio)
    return np.concatenate(joined)


async def create_audio_from_text(text: str, output_path: Path, voice: str = DEFAULT_VOICE, rate: str = DEFAULT_TTS_RATE, job_id: str | None = None) -> None:
    if not text or not text.strip():
        raise ValueError("No text provided for audio generation")

    if voice in NGHITTS_VOICES:
        engine = NghiTTSEngine("ngochuyennew")
        normalized_text = engine.normalize_text(text)
        normalized_text = re.sub(r"\s+", " ", normalized_text).strip()
        tts_chunks = _split_nghitts_text_for_tts(normalized_text)
        audio_arrays = []
        scales = _parse_nghitts_rate(rate, engine.default_scales)

        for index, chunk in enumerate(tts_chunks):
            logger.info("Đang tạo chunk NghiTTS %s/%s | job_id=%s", index + 1, len(tts_chunks), job_id or "n/a")
            audio_arrays.append(engine.generate_audio(chunk, scales=scales))

        if not audio_arrays:
            raise RuntimeError("No audio was generated for NghiTTS chunks")

        waveform = _join_audio_arrays(audio_arrays, engine.sample_rate)
        wav_bytes = engine.audio_to_wav_bytes(waveform, engine.sample_rate)

        logger.info("Đang ghi file audio NghiTTS | job_id=%s output=%s", job_id or "n/a", output_path.name)
        output_path.write_bytes(wav_bytes)
        return

    if voice not in EDGE_TTS_VOICES:
        voice = DEFAULT_VOICE

    sanitized_text = _sanitize_text(text)
    tts_chunks = _split_text_for_tts(sanitized_text)
    voices = [voice] + [v for v in EDGE_TTS_VOICES if v != voice]
    rate_clean = _normalize_rate(rate)

    logger.info("Bắt đầu tạo audio | job_id=%s chunks=%s voice=%s rate=%s", job_id or "n/a", len(tts_chunks), voice, rate_clean)
    audio_chunks = await _generate_audio_chunks_parallel(tts_chunks, voices, rate_clean, job_id=job_id)
    logger.info("Đang ghi file audio | job_id=%s output=%s", job_id or "n/a", output_path.name)
    with output_path.open("wb") as audio_file:
        for audio_bytes in audio_chunks:
            audio_file.write(audio_bytes)


def _parse_duration_from_ffprobe(output: str) -> float | None:
    match = re.search(r"Duration: (?P<hour>\d+):(\d+):(\d+\.\d+)", output)
    if not match:
        return None
    hours = int(match.group("hour"))
    minutes = int(match.group(2))
    seconds = float(match.group(3))
    return hours * 3600 + minutes * 60 + seconds


def _get_audio_duration(audio_path: Path) -> float | None:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
            capture_output=True,
            text=True,
            check=True,
        )
        return float(result.stdout.strip())
    except Exception:
        return None


def _build_ffmpeg_command(image_path: Path, audio_path: Path, output_path: Path, duration: float | None = None) -> list[str]:
    ffmpeg_exe = get_ffmpeg_exe()
    command = [
        ffmpeg_exe,
        "-y",
        "-loop",
        "1",
        "-framerate",
        "2",
        "-i",
        str(image_path),
        "-i",
        str(audio_path),
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        f"scale={OUTPUT_VIDEO_WIDTH}:{OUTPUT_VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad={OUTPUT_VIDEO_WIDTH}:{OUTPUT_VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
    ]
    if duration is not None:
        command.extend(["-t", f"{duration:.3f}"])
    command.extend(["-shortest", str(output_path)])
    return command


async def create_video_from_image_and_audio(image_path: Path, audio_path: Path, output_path: Path) -> None:
    logger.info("Đang đo thời lượng audio | input=%s", audio_path.name)
    duration = _get_audio_duration(audio_path)
    logger.info("Đang render video | input=%s output=%s duration=%.3f", image_path.name, output_path.name, duration if duration is not None else 0.0)
    command = _build_ffmpeg_command(image_path, audio_path, output_path, duration)
    result = await asyncio.to_thread(subprocess.run, command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")
    logger.info("Đã render video thành công | output=%s", output_path.name)


async def create_placeholder_image(output_path: Path) -> None:
    ffmpeg_exe = get_ffmpeg_exe()
    command = [
        ffmpeg_exe,
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=gray:s={OUTPUT_VIDEO_WIDTH}x{OUTPUT_VIDEO_HEIGHT}",
        "-frames:v",
        "1",
        str(output_path),
    ]
    result = await asyncio.to_thread(subprocess.run, command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg placeholder image failed: {result.stderr}")
