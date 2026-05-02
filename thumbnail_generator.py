"""
Simple Telugu thumbnail generator using Pillow - fixed for Render and Windows consoles.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

load_dotenv()

OUTPUT_FILE = Path("thumbnail.jpg")
IMAGE_SIZE = (1280, 720)
BACKGROUND_COLOR = (15, 18, 32)
BANNER_COLOR = (30, 30, 60)
TEXT_COLOR = (255, 220, 70)
SUBTEXT_COLOR = (255, 255, 255)
DEFAULT_TEXT = "Telugu Sports Update"


def _safe_console(message: str) -> None:
    try:
        print(message.encode("ascii", "ignore").decode("ascii"))
    except Exception:
        print("thumbnail-generator")


def _find_font_path(font_path: str) -> Path:
    candidates = [
        Path(font_path) if font_path else None,
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSansTelugu-Regular.ttf"),
        Path("/usr/share/fonts/truetype/freefont/FreeSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("C:/Windows/Fonts/Nirmala.ttf"),
        Path("C:/Windows/Fonts/Nirmala.ttc"),
        Path("C:/Windows/Fonts/Vrinda.ttf"),
    ]

    for path in candidates:
        if path and path.exists():
            _safe_console(f"Using font: {path.name}")
            return path

    raise FileNotFoundError("No supported font file found")


def load_font(font_path: str, size: int) -> ImageFont.FreeTypeFont:
    path = _find_font_path(font_path)
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError as exc:
        raise OSError(f"Unable to load font: {path.name}") from exc


def wrap_text(draw: ImageDraw.Draw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current_line = ""

    for word in words:
        candidate = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        width = bbox[2] - bbox[0]

        if width <= max_width:
            current_line = candidate
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines


def create_thumbnail(text: str, font_path: str, output_path: Path = OUTPUT_FILE) -> Path:
    output_path = Path(str(output_path))
    output_path.parent.mkdir(parents=True, exist_ok=True)

    safe_text = (text or DEFAULT_TEXT).strip()
    font = load_font(font_path, size=72)
    small_font = load_font(font_path, size=36)

    image = Image.new("RGB", IMAGE_SIZE, color=BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    draw.rectangle([(0, 0), (IMAGE_SIZE[0], 120)], fill=BANNER_COLOR)
    draw.text((40, 30), "TELUGU SPORTS UPDATE", font=small_font, fill=SUBTEXT_COLOR)

    max_text_width = IMAGE_SIZE[0] - 120
    lines = wrap_text(draw, safe_text, font, max_text_width)

    y = 180
    for line in lines[:3]:
        draw.text(
            (60, y),
            line,
            font=font,
            fill=TEXT_COLOR,
            stroke_width=3,
            stroke_fill=(10, 10, 10),
        )
        _, _, _, text_bottom = draw.textbbox((0, 0), line, font=font)
        y += text_bottom + 15

    draw.rectangle([(0, IMAGE_SIZE[1] - 80), (IMAGE_SIZE[0], IMAGE_SIZE[1])], fill=(18, 18, 40))
    draw.text((40, IMAGE_SIZE[1] - 60), "Daily Telugu sports thumbnail", font=small_font, fill=SUBTEXT_COLOR)

    image.save(str(output_path), quality=95)
    _safe_console("Thumbnail saved")
    return output_path


def main() -> int:
    text = " ".join(sys.argv[1:]).strip() or os.getenv("THUMBNAIL_TEXT", DEFAULT_TEXT)
    font_path = os.getenv("THUMBNAIL_FONT_PATH")

    if not font_path:
        _safe_console("Error: THUMBNAIL_FONT_PATH is not set")
        return 1

    try:
        create_thumbnail(text, font_path)
        return 0
    except Exception as e:
        _safe_console(f"Error creating thumbnail: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
