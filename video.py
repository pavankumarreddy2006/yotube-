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


def _find_binary(configured: str, fallback_names: list[str]) -> str | None:
    if configured:
        resolved = shutil.which(configured)
        if resolved:
            return resolved

    for candidate in fallback_names:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    return None


def _find_ffmpeg() -> str | None:
    resolved = _find_binary(settings.ffmpeg_path, ["ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"])
    if resolved:
        return resolved

    try:
        import imageio_ffmpeg

        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled and Path(bundled).exists():
            return bundled
    except Exception as exc:
        logger.warning("Bundled FFmpeg lookup failed: %s", exc)

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
    audio_path: str | Path | None,
    output_path: str | Path,
    background_path: str | Path,
    vertical: bool,
    subtitles_path: str | Path | None = None,
    music_path: str | Path | None = None,
) -> str:
    width, height = (1080, 1920) if vertical else (1920, 1080)
    safe_output_path = str(output_path)
    safe_background_path = ensure_background_video(str(background_path), (width, height))
    ffmpeg = _find_ffmpeg()

    if not audio_path or not Path(str(audio_path)).exists():
        logger.warning("Audio track missing. Using placeholder video output.")
        return _write_placeholder_video(safe_output_path, safe_background_path)

    safe_audio_path = str(audio_path)

    if ffmpeg is None:
        return _write_placeholder_video(safe_output_path, safe_background_path)

    filter_chain = [
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}[video]"
    ]
    audio_mix_label = "[1:a]"
    cmd = [
        ffmpeg,
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(safe_background_path),
        "-i",
        safe_audio_path,
    ]

    if settings.enable_background_music and music_path and Path(str(music_path)).exists():
        cmd.extend(["-stream_loop", "-1", "-i", str(music_path)])
        filter_chain.append("[2:a]volume=0.12[bgm]")
        filter_chain.append("[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]")
        audio_mix_label = "[aout]"

    if settings.enable_subtitles and subtitles_path and Path(str(subtitles_path)).exists():
        subtitle_file = str(Path(str(subtitles_path)).resolve()).replace("\\", "/").replace(":", "\\:")
        filter_chain.append(
            "[video]subtitles='"
            + subtitle_file
            + "':force_style='FontName=Nirmala UI,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2'[vout]"
        )
        video_map = "[vout]"
    else:
        video_map = "[video]"

    cmd.extend(
        [
            "-filter_complex",
            ";".join(filter_chain),
            "-map",
            video_map,
            "-map",
            audio_mix_label,
            "-shortest",
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
    )

    def operation() -> str:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return safe_output_path

    try:
        return retry(operation, operation_name=f"video build -> {safe_output_path}")
    except Exception as exc:
        logger.warning("FFmpeg video build failed, using placeholder output: %s", exc)
        return _write_placeholder_video(safe_output_path, safe_background_path)
