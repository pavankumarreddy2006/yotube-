from __future__ import annotations

import os
import shutil
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps

from settings import TEMP_DIR, settings
from utils import get_logger

logger = get_logger(__name__)


def _find_ffmpeg() -> str | None:
    configured = (settings.ffmpeg_path or "").strip()
    candidates = [configured, "ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]
    for candidate in candidates:
        if not candidate:
            continue
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    try:
        import imageio_ffmpeg

        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled and Path(bundled).exists():
            return bundled
    except Exception as exc:  # noqa: BLE001
        logger.warning("Bundled FFmpeg lookup failed: %s", exc)

    return None


def _configure_moviepy() -> str:
    ffmpeg_binary = _find_ffmpeg()
    if not ffmpeg_binary:
        raise RuntimeError(
            "FFmpeg is not installed or not discoverable. Install FFmpeg or set FFMPEG_PATH/IMAGEIO_FFMPEG_EXE."
        )

    os.environ["IMAGEIO_FFMPEG_EXE"] = ffmpeg_binary
    try:
        from moviepy.config import change_settings

        change_settings({"FFMPEG_BINARY": ffmpeg_binary})
    except Exception as exc:  # noqa: BLE001
        logger.info("MoviePy config update skipped: %s", exc)
    return ffmpeg_binary


def _download_image(url: str, destination_dir: Path) -> Path:
    destination_dir.mkdir(parents=True, exist_ok=True)
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix or ".jpg"
    file_path = destination_dir / f"downloaded_image{suffix}"
    logger.info("Downloading remote image: %s", url)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    file_path.write_bytes(response.content)
    return file_path


def resolve_image_path(image_path: str | Path, *, download_dir: str | Path | None = None) -> str:
    raw_value = str(image_path).strip()
    if not raw_value:
        raise ValueError("Image path is required")

    if raw_value.startswith(("http://", "https://")):
        local_path = _download_image(raw_value, Path(str(download_dir or TEMP_DIR)))
        return str(local_path)

    local_path = Path(raw_value)
    if not local_path.exists():
        raise FileNotFoundError(f"Image file not found: {local_path}")
    return str(local_path)


def _prepare_image_canvas(image_path: str | Path, output_dir: Path, target_size: tuple[int, int]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{Path(str(image_path)).stem}_{target_size[0]}x{target_size[1]}.jpg"
    with Image.open(str(image_path)) as source:
        prepared = ImageOps.fit(source.convert("RGB"), target_size, method=Image.Resampling.LANCZOS)
        prepared.save(destination, format="JPEG", quality=95)
    return destination


def build_video(
    *,
    audio_path: str | Path | None,
    image_path: str | Path | None,
    output_path: str | Path,
    vertical: bool,
) -> str:
    if not audio_path:
        raise ValueError("Audio path is required")
    if not image_path:
        raise ValueError("Image path is required")

    audio_file = Path(str(audio_path))
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file}")

    resolved_image_path = resolve_image_path(image_path, download_dir=Path(str(output_path)).parent)
    resolved_output_path = Path(str(output_path))
    resolved_output_path.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_binary = _configure_moviepy()
    logger.info("MoviePy configured with FFmpeg: %s", ffmpeg_binary)

    try:
        from moviepy.editor import AudioFileClip, ImageClip
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"MoviePy import failed: {exc}") from exc

    target_size = (1080, 1920) if vertical else (1920, 1080)
    prepared_image_path = _prepare_image_canvas(resolved_image_path, resolved_output_path.parent, target_size)
    logger.info("Audio loaded: %s", audio_file)
    logger.info("Image loaded: %s", prepared_image_path)

    audio_clip = None
    image_clip = None
    final_clip = None
    try:
        audio_clip = AudioFileClip(str(audio_file))
        duration = float(audio_clip.duration or 0)
        if duration <= 0:
            raise RuntimeError(f"Audio duration is invalid: {duration}")

        image_clip = ImageClip(str(prepared_image_path)).set_duration(duration)
        final_clip = image_clip.set_audio(audio_clip)

        logger.info("Creating video: %s", resolved_output_path)
        final_clip.write_videofile(
            str(resolved_output_path),
            fps=24,
            codec="libx264",
            audio_codec="aac",
            bitrate="4000k",
            threads=2,
            logger=None,
        )
        logger.info("Video created: %s", resolved_output_path)
        return str(resolved_output_path)
    finally:
        if final_clip:
            final_clip.close()
        if image_clip:
            image_clip.close()
        if audio_clip:
            audio_clip.close()
