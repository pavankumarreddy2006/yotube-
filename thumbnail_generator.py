from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFilter, ImageFont

load_dotenv()

OUTPUT_FILE = Path("thumbnail.jpg")
IMAGE_SIZE = (1280, 720)
DEFAULT_TEXT = "షాక్ న్యూస్"


def _safe_console(message: str) -> None:
    try:
        print(message.encode("ascii", "ignore").decode("ascii"))
    except Exception:
        print("thumbnail-generator")


def _find_font_path(font_path: str) -> Path:
    candidates = [
        Path(font_path) if font_path else None,
        Path("/usr/share/fonts/truetype/noto/NotoSansTelugu-Regular.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("C:/Windows/Fonts/Nirmala.ttf"),
        Path("C:/Windows/Fonts/Nirmala.ttc"),
        Path("C:/Windows/Fonts/Vrinda.ttf"),
    ]
    for path in candidates:
        if path and path.exists():
            return path
    raise FileNotFoundError("No supported font file found")


def load_font(font_path: str, size: int) -> ImageFont.FreeTypeFont:
    path = _find_font_path(font_path)
    return ImageFont.truetype(str(path), size=size)


def wrap_text(draw: ImageDraw.Draw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def _gradient_background() -> Image.Image:
    image = Image.new("RGB", IMAGE_SIZE, color=(18, 12, 12))
    draw = ImageDraw.Draw(image)
    for y in range(IMAGE_SIZE[1]):
        ratio = y / max(IMAGE_SIZE[1] - 1, 1)
        color = (
            int(20 + 55 * ratio),
            int(10 + 8 * ratio),
            int(14 + 20 * ratio),
        )
        draw.line([(0, y), (IMAGE_SIZE[0], y)], fill=color)

    glow = Image.new("RGBA", IMAGE_SIZE, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([(-180, -120), (680, 560)], fill=(255, 40, 40, 120))
    glow_draw.ellipse([(760, 120), (1420, 760)], fill=(255, 220, 0, 95))
    return Image.alpha_composite(image.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(70))).convert("RGB")


def create_thumbnail(text: str, font_path: str, output_path: Path = OUTPUT_FILE) -> Path:
    output_path = Path(str(output_path))
    output_path.parent.mkdir(parents=True, exist_ok=True)

    safe_text = (text or DEFAULT_TEXT).strip()
    image = _gradient_background()
    draw = ImageDraw.Draw(image)
    title_font = load_font(font_path, size=108)
    badge_font = load_font(font_path, size=42)

    draw.rounded_rectangle([(46, 40), (420, 112)], radius=24, fill=(255, 255, 255))
    draw.text((74, 56), "TRENDING UPDATE", font=badge_font, fill=(30, 30, 30))

    draw.polygon([(900, 0), (1280, 0), (1280, 430)], fill=(0, 0, 0))
    draw.polygon([(0, 520), (320, 720), (0, 720)], fill=(0, 0, 0))

    max_text_width = 760
    lines = wrap_text(draw, safe_text, title_font, max_text_width)[:3]
    y = 190
    for line in lines:
        draw.text(
            (72, y),
            line,
            font=title_font,
            fill=(255, 240, 110),
            stroke_width=6,
            stroke_fill=(0, 0, 0),
        )
        bbox = draw.textbbox((0, 0), line, font=title_font)
        y += (bbox[3] - bbox[1]) + 18

    draw.rounded_rectangle([(62, 560), (690, 650)], radius=24, fill=(190, 0, 0))
    draw.text((90, 582), "WATCH NOW", font=badge_font, fill=(255, 255, 255))

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
    except Exception as exc:
        _safe_console(f"Error creating thumbnail: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
