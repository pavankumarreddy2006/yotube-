from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)

# Build a video by combining a repeating background clip with the generated audio.
# FFmpeg is used to produce a consistent output size and audio/video mix.


def ensure_background_video(path: str | Path, output_size: tuple[int, int]) -> str:
    path = Path(path)
    if path.exists():
        return str(path)
    from moviepy.editor import ColorClip

    clip = ColorClip(size=output_size, color=(18, 18, 18), duration=60)
    clip.write_videofile(str(path), fps=24, codec="libx264", audio=False, logger=None)
    clip.close()
    return str(path)


def _find_ffmpeg() -> str:
    ffmpeg_path = shutil.which(settings.ffmpeg_path) or settings.ffmpeg_path
    if ffmpeg_path and Path(ffmpeg_path).exists():
        return str(ffmpeg_path)

    try:
        from imageio_ffmpeg import get_ffmpeg_exe

        fallback = get_ffmpeg_exe()
        if fallback and Path(fallback).exists():
            return fallback
    except Exception:
        pass

    raise FileNotFoundError(
        f"FFmpeg executable not found. Set FFMPEG_PATH to a working ffmpeg binary or install ffmpeg globally. "
        f"Tried: {settings.ffmpeg_path}"
    )


def build_video(
    *,
    audio_path: str | Path,
    output_path: str | Path,
    background_path: str | Path,
    vertical: bool,
) -> str:
    ffmpeg = _find_ffmpeg()
    width, height = (1080, 1920) if vertical else (1920, 1080)
    background_path = ensure_background_video(background_path, (width, height))

    cmd = [
        ffmpeg,
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(background_path),
        "-i",
        str(audio_path),
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
        str(output_path),
    ]

    def operation() -> str:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return str(output_path)

    return retry(operation, operation_name=f"video build -> {output_path}")
