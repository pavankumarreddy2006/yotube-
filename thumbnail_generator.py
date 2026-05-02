"""
Simple Telugu thumbnail generator using Pillow - FIXED FOR RENDER
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
    """Render (Linux) + Windows font fallback"""
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
            print(f"✅ Using font: {path}")
            return path

    raise FileNotFoundError(f"Font not found. Tried: {[str(p) for p in candidates if p]}")


def load_font(font_path: str, size: int) -> ImageFont.FreeTypeFont:
    path = _find_font_path(font_path)
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError as exc:
        raise OSError(f"Unable to load font: {path}") from exc


def wrap_text(draw: ImageDraw.Draw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Wrap text to fit within max_width"""
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
    """Create thumbnail with Telugu text"""
    font = load_font(font_path, size=72)
    small_font = load_font(font_path, size=36)

    image = Image.new("RGB", IMAGE_SIZE, color=BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    # Top banner
    draw.rectangle([(0, 0), (IMAGE_SIZE[0], 120)], fill=BANNER_COLOR)
    draw.text((40, 30), "TELUGU SPORTS UPDATE", font=small_font, fill=SUBTEXT_COLOR)

    # Main Telugu text
    max_text_width = IMAGE_SIZE[0] - 120
    lines = wrap_text(draw, text, font, max_text_width)
    
    y = 180
    for line in lines:
        draw.text(
            (60, y), 
            line, 
            font=font, 
            fill=TEXT_COLOR, 
            stroke_width=3, 
            stroke_fill=(10, 10, 10)
        )
        _, _, _, text_bottom = draw.textbbox((0, 0), line, font=font)
        y += text_bottom + 15

    # Bottom bar
    draw.rectangle([(0, IMAGE_SIZE[1] - 80), (IMAGE_SIZE[0], IMAGE_SIZE[1])], fill=(18, 18, 40))
    draw.text((40, IMAGE_SIZE[1] - 60), "Daily Telugu sports thumbnail", font=small_font, fill=SUBTEXT_COLOR)

    image.save(output_path, quality=95)
    print(f"✅ Thumbnail saved: {output_path}")
    return output_path


def main() -> int:
    text = " ".join(sys.argv[1:]).strip() or os.getenv("THUMBNAIL_TEXT", DEFAULT_TEXT)
    font_path = os.getenv("THUMBNAIL_FONT_PATH")

    if not font_path:
        print("❌ Error: THUMBNAIL_FONT_PATH is not set in .env")
        print("Please set it in Render Environment Variables.")
        return 1

    try:
        saved_path = create_thumbnail(text, font_path)
        return 0
    except Exception as e:
        print(f"❌ Error creating thumbnail: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())