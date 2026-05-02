from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from settings import settings
from utils import get_logger, retry

logger = get_logger(__name__)


def ensure_background_video(path: str | Path, output_size: tuple[int, int]) -> str:
    file_path = Path(str(path))
    if file_path.exists():
        return str(file_path)

    try:
        from moviepy.editor import ColorClip

        file_path.parent.mkdir(parents=True, exist_ok=True)
        clip = ColorClip(size=output_size, color=(18, 18, 18), duration=60)
        clip.write_videofile(str(file_path), fps=24, codec="libx264", audio=False, logger=None)
        clip.close()
        return str(file_path)
    except Exception as exc:
        logger.warning("Background video generation failed: %s", exc)
        fallback_path = file_path.with_name("background_placeholder.mp4")
        fallback_path.touch(exist_ok=True)
        return str(fallback_path)


def _find_ffmpeg() -> str | None:
    configured = settings.ffmpeg_path
    if configured:
        resolved = shutil.which(configured)
        if resolved:
            return resolved

    for candidate in ["ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    logger.warning("FFmpeg not found. Falling back to placeholder video output.")
    return None


def _write_placeholder_video(output_path: str | Path, background_path: str | Path) -> str:
    destination = Path(str(output_path))
    destination.parent.mkdir(parents=True, exist_ok=True)

    background = Path(str(background_path))
    if background.exists() and background.suffix.lower() == ".mp4" and background.stat().st_size > 0:
        shutil.copyfile(str(background), str(destination))
        return str(destination)

    destination.write_bytes(b"")
    return str(destination)


def build_video(
    *,
    audio_path: str | Path,
    output_path: str | Path,
    background_path: str | Path,
    vertical: bool,
) -> str:
    width, height = (1080, 1920) if vertical else (1920, 1080)
    safe_audio_path = str(audio_path)
    safe_output_path = str(output_path)
    safe_background_path = ensure_background_video(str(background_path), (width, height))
    ffmpeg = _find_ffmpeg()

    if ffmpeg is None:
        return _write_placeholder_video(safe_output_path, safe_background_path)

    cmd = [
        ffmpeg,
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(safe_background_path),
        "-i",
        safe_audio_path,
        "-shortest",
        "-vf",
        f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        safe_output_path,
    ]

    def operation() -> str:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return safe_output_path

    try:
        return retry(operation, operation_name=f"video build -> {safe_output_path}")
    except Exception as exc:
        logger.warning("FFmpeg video build failed, using placeholder output: %s", exc)
        return _write_placeholder_video(safe_output_path, safe_background_path)
