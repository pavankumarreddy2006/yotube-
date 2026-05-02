"""
Simple Telugu thumbnail generator using Pillow.

Usage:
  python thumbnail_generator.py "తెలుగు టెక్స్ట్ ఇక్కడ"

Requirements:
  pip install Pillow python-dotenv

The script reads THUMBNAIL_FONT_PATH from .env and writes thumbnail.jpg.
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
DEFAULT_TEXT = "తెలుగు స్పోర్ట్స్ అప్‌డేట్"


def _find_font_path(font_path: str) -> Path:
    path = Path(font_path)
    if path.exists():
        return path

    fallback_candidates: list[Path] = []
    if path.parent.exists() and path.suffix.lower() == ".ttf":
        fallback_candidates.append(path.with_suffix(".ttc"))
        fallback_candidates.append(path.with_suffix(".otf"))

    windows_fonts = Path("C:/Windows/Fonts")
    if windows_fonts.exists():
        for file in windows_fonts.iterdir():
            if file.suffix.lower() in {".ttf", ".ttc", ".otf"}:
                name = file.stem.lower()
                if any(keyword in name for keyword in ["nirmala", "gautami", "vrinda", "telu"]):
                    fallback_candidates.append(file)

    for candidate in fallback_candidates:
        if candidate.exists():
            return candidate

    raise FileNotFoundError(f"Font file not found: {path}")


def load_font(font_path: str, size: int) -> ImageFont.FreeTypeFont:
    path = _find_font_path(font_path)

    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError as exc:
        raise OSError(
            f"Unable to load font from THUMBNAIL_FONT_PATH: {path}. "
            "Make sure the file is a valid .ttf, .ttc, or .otf font."
        ) from exc


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
    font = load_font(font_path, size=72)
    small_font = load_font(font_path, size=36)

    image = Image.new("RGB", IMAGE_SIZE, color=BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    # Top banner for channel branding
    draw.rectangle([(0, 0), (IMAGE_SIZE[0], 120)], fill=BANNER_COLOR)
    draw.text((40, 30), "TELUGU SPORTS UPDATE", font=small_font, fill=SUBTEXT_COLOR)

    # Render the Telugu headline text in the center area.
    max_text_width = IMAGE_SIZE[0] - 120
    lines = wrap_text(draw, text, font, max_text_width)
    y = 180
    for line in lines:
        draw.text((60, y), line, font=font, fill=TEXT_COLOR, stroke_width=2, stroke_fill=(10, 10, 10))
        _, _, _, text_bottom = draw.textbbox((0, 0), line, font=font)
        y += text_bottom + 12

    # Optional accent bar at bottom.
    draw.rectangle([(0, IMAGE_SIZE[1] - 80), (IMAGE_SIZE[0], IMAGE_SIZE[1])], fill=(18, 18, 40))
    draw.text((40, IMAGE_SIZE[1] - 60), "Daily Telugu sports thumbnail", font=small_font, fill=SUBTEXT_COLOR)

    image.save(output_path, quality=95)
    return output_path


def main() -> int:
    text = " ".join(sys.argv[1:]).strip() or os.getenv("THUMBNAIL_TEXT", DEFAULT_TEXT)
    font_path = os.getenv("THUMBNAIL_FONT_PATH")

    if not font_path:
        print("Error: THUMBNAIL_FONT_PATH is not set in .env.")
        print("Please add THUMBNAIL_FONT_PATH to your .env file and try again.")
        return 1

    try:
        saved_path = create_thumbnail(text, font_path)
        print(f"Thumbnail created: {saved_path}")
        return 0
    except FileNotFoundError as error:
        print(f"Error: {error}")
        return 1
    except OSError as error:
        print(f"Error loading font: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
