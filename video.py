from __future__ import annotations

import math
import os
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from settings import ASSETS_DIR, TEMP_DIR, settings
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


def _install_safe_moviepy_resize() -> None:
    """Force MoviePy to use a Pillow-backed resizer.

    Some Windows environments expose a partially broken ``cv2`` module where
    constants like ``INTER_AREA`` and even ``resize`` are missing. MoviePy 1.x
    detects cv2 first and then crashes later during clip resizing. We patch the
    resize backend explicitly so video rendering remains stable.
    """

    try:
        import numpy as np
        import moviepy.video.fx.resize as resize_fx
    except Exception as exc:  # noqa: BLE001
        logger.info("MoviePy resize backend patch skipped: %s", exc)
        return

    if not hasattr(Image, "ANTIALIAS"):
        Image.ANTIALIAS = Image.Resampling.LANCZOS  # type: ignore[attr-defined]

    def _pil_resizer(pic, newsize):
        width, height = map(int, newsize)
        pil_image = Image.fromarray(pic)
        resized = pil_image.resize((width, height), Image.Resampling.LANCZOS)
        return np.array(resized)

    _pil_resizer.origin = "PIL"
    resize_fx.resizer = _pil_resizer
    resize_fx.resize_possible = True
    logger.info("MoviePy resize backend forced to Pillow.")


def _download_image(url: str, destination_dir: Path, stem: str) -> Path:
    destination_dir.mkdir(parents=True, exist_ok=True)
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix or ".jpg"
    file_path = destination_dir / f"{stem}{suffix}"
    logger.info("Downloading remote image: %s", url)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    file_path.write_bytes(response.content)
    return file_path


def resolve_image_path(image_path: str | Path, *, download_dir: str | Path | None = None, stem: str = "scene") -> str:
    raw_value = str(image_path).strip()
    if not raw_value:
        raise ValueError("Image path is required")

    if raw_value.startswith(("http://", "https://")):
        local_path = _download_image(raw_value, Path(str(download_dir or TEMP_DIR)), stem)
        return str(local_path)

    local_path = Path(raw_value)
    if not local_path.exists():
        raise FileNotFoundError(f"Image file not found: {local_path}")
    return str(local_path)


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(settings.thumbnail_font_path),
        ASSETS_DIR / "DejaVuSans-Bold.ttf",
        Path("C:/Windows/Fonts/Nirmala.ttf"),
        Path("C:/Windows/Fonts/Nirmala.ttc"),
        Path("C:/Windows/Fonts/Vrinda.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [text]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _render_scene_card(
    *,
    text: str,
    prompt: str,
    output_path: Path,
    target_size: tuple[int, int],
) -> Path:
    image = Image.new("RGB", target_size, color=(14, 20, 36))
    draw = ImageDraw.Draw(image)

    overlay = Image.new("RGBA", target_size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.ellipse(
        [(-140, -120), (target_size[0] * 0.65, target_size[1] * 0.55)],
        fill=(0, 180, 255, 55),
    )
    overlay_draw.ellipse(
        [(target_size[0] * 0.4, target_size[1] * 0.2), (target_size[0] + 120, target_size[1] + 80)],
        fill=(80, 220, 120, 45),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=60))
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        [(40, 40), (target_size[0] - 40, target_size[1] - 40)],
        radius=36,
        outline=(255, 255, 255),
        width=3,
        fill=(8, 12, 22),
    )

    eyebrow_font = _load_font(38 if target_size[0] > 1200 else 30)
    title_font = _load_font(62 if target_size[0] > 1200 else 46)
    sub_font = _load_font(34 if target_size[0] > 1200 else 26)

    draw.text((80, 72), "TELUGU SPORTS UPDATE", font=eyebrow_font, fill=(180, 232, 255))
    max_width = target_size[0] - 160
    title_lines = _wrap_text(draw, text.strip() or "Sports update", title_font, max_width)
    y = 170
    for line in title_lines[:5]:
        draw.text((80, y), line, font=title_font, fill=(255, 255, 255))
        y += int(title_font.size * 1.15)

    prompt_lines = _wrap_text(draw, prompt.strip() or "Relevant sports visual", sub_font, max_width)
    y = min(y + 24, target_size[1] - 220)
    for line in prompt_lines[:4]:
        draw.text((80, y), line, font=sub_font, fill=(255, 220, 120))
        y += int(sub_font.size * 1.25)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="JPEG", quality=95)
    return output_path


def _prepare_image_canvas(image_path: str | Path, output_dir: Path, target_size: tuple[int, int], stem: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{stem}_{target_size[0]}x{target_size[1]}.jpg"
    with Image.open(str(image_path)) as source:
        prepared = ImageOps.fit(source.convert("RGB"), target_size, method=Image.Resampling.LANCZOS)
        prepared.save(destination, format="JPEG", quality=95)
    return destination


def _build_scene_image(
    *,
    index: int,
    target_size: tuple[int, int],
    output_dir: Path,
    scene_text: str,
    visual_query: str,
    preferred_image: str | None,
    fallback_image: str | Path | None,
) -> Path:
    stem = f"scene_{index:02d}"
    if preferred_image:
        try:
            resolved = resolve_image_path(preferred_image, download_dir=output_dir, stem=stem)
            return _prepare_image_canvas(resolved, output_dir, target_size, stem)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Scene image fallback used for %s: %s", preferred_image, exc)

    if fallback_image:
        try:
            resolved = resolve_image_path(fallback_image, download_dir=output_dir, stem=f"{stem}_fallback")
            return _prepare_image_canvas(resolved, output_dir, target_size, stem)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fallback image preparation failed for %s: %s", fallback_image, exc)

    return _render_scene_card(
        text=scene_text,
        prompt=visual_query,
        output_path=output_dir / f"{stem}_generated.jpg",
        target_size=target_size,
    )


def _split_scene_texts(script: str, highlights: list[str] | None) -> list[str]:
    if highlights:
        return [item.strip() for item in highlights if str(item).strip()]

    normalized = " ".join(part.strip() for part in script.splitlines() if part.strip())
    chunks = [chunk.strip() for chunk in normalized.replace("!", ".").replace("?", ".").split(".") if chunk.strip()]
    return chunks[:8] or [normalized]


def _chunk_subtitles(script: str, scene_texts: list[str]) -> list[str]:
    if scene_texts:
        return scene_texts
    normalized = " ".join(part.strip() for part in script.splitlines() if part.strip())
    return [normalized] if normalized else []


def _create_subtitle_image(
    text: str,
    target_size: tuple[int, int],
    output_dir: Path,
    index: int,
) -> Path:
    width, height = target_size
    image = Image.new("RGBA", target_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = _load_font(44 if width > 1200 else 34)
    max_width = width - 160
    lines = _wrap_text(draw, text.strip(), font, max_width)[:4]
    line_height = int(font.size * 1.28)
    box_height = max(120, len(lines) * line_height + 56)
    top = height - box_height - 60

    draw.rounded_rectangle(
        [(50, top), (width - 50, height - 30)],
        radius=30,
        fill=(8, 12, 22, 210),
        outline=(255, 255, 255, 60),
        width=2,
    )

    y = top + 28
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_width = bbox[2] - bbox[0]
        x = (width - line_width) / 2
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))
        y += line_height

    output_path = output_dir / f"subtitle_{index:02d}.png"
    image.save(output_path, format="PNG")
    return output_path


def build_video(
    *,
    audio_path: str | Path | None,
    image_path: str | Path | None,
    output_path: str | Path,
    vertical: bool,
    script: str | None = None,
    highlights: list[str] | None = None,
    visual_queries: list[str] | None = None,
    scene_image_paths: list[str] | None = None,
) -> str:
    if not audio_path:
        raise ValueError("Audio path is required")

    audio_file = Path(str(audio_path))
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file}")

    resolved_output_path = Path(str(output_path))
    resolved_output_path.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_binary = _configure_moviepy()
    logger.info("MoviePy configured with FFmpeg: %s", ffmpeg_binary)

    try:
        from moviepy.editor import AudioFileClip, CompositeVideoClip, ImageClip, concatenate_videoclips
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"MoviePy import failed: {exc}") from exc

    _install_safe_moviepy_resize()

    target_size = (1080, 1920) if vertical else (1920, 1080)
    fallback_image = str(image_path) if image_path else None
    scene_texts = _split_scene_texts(script or "", highlights)
    if not scene_texts:
        raise ValueError("Script or highlights are required to build scenes")

    visual_prompts = [item.strip() for item in (visual_queries or []) if str(item).strip()]
    preferred_images = list(scene_image_paths or [])

    logger.info("Audio loaded: %s", audio_file)

    audio_clip = None
    base_clips = []
    subtitle_clips = []
    final_clip = None
    try:
        audio_clip = AudioFileClip(str(audio_file))
        duration = float(audio_clip.duration or 0)
        if duration <= 0:
            raise RuntimeError(f"Audio duration is invalid: {duration}")

        scene_count = max(1, len(scene_texts))
        per_scene = max(duration / scene_count, 2.5)
        prepared_dir = resolved_output_path.parent / "scenes"
        prepared_dir.mkdir(parents=True, exist_ok=True)

        for index, scene_text in enumerate(scene_texts):
            preferred_image = preferred_images[index] if index < len(preferred_images) else None
            visual_query = visual_prompts[index] if index < len(visual_prompts) else scene_text
            scene_image = _build_scene_image(
                index=index + 1,
                target_size=target_size,
                output_dir=prepared_dir,
                scene_text=scene_text,
                visual_query=visual_query,
                preferred_image=preferred_image,
                fallback_image=fallback_image,
            )
            clip = ImageClip(str(scene_image)).set_duration(per_scene).resize(lambda t: 1 + (0.03 * min(t / per_scene, 1)))
            clip = clip.crossfadein(0.25).crossfadeout(0.25)
            base_clips.append(clip)

        video_track = concatenate_videoclips(base_clips, method="compose").set_duration(duration)
        subtitle_items = _chunk_subtitles(script or "", scene_texts)
        if settings.enable_subtitles and subtitle_items:
            subtitle_duration = max(duration / len(subtitle_items), 2.5)
            cursor = 0.0
            for index, text in enumerate(subtitle_items):
                subtitle_image = _create_subtitle_image(text, target_size, prepared_dir, index + 1)
                subtitle_clip = (
                    ImageClip(str(subtitle_image))
                    .set_start(cursor)
                    .set_duration(min(subtitle_duration, max(duration - cursor, 0.1)))
                    .set_position(("center", "bottom"))
                )
                subtitle_clips.append(subtitle_clip)
                cursor += subtitle_duration

        final_layers = [video_track] + subtitle_clips
        final_clip = CompositeVideoClip(final_layers, size=target_size).set_audio(audio_clip).set_duration(duration)

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
        for clip in subtitle_clips:
            clip.close()
        for clip in base_clips:
            clip.close()
        if audio_clip:
            audio_clip.close()
