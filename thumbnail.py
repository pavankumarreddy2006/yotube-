from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from settings import ASSETS_DIR, settings
from utils import get_logger


logger = get_logger(__name__)

# Create a thumbnail image with Telugu text and a bold visual style.
# It uses a Telugu-capable font when available and falls back gracefully.


def create_thumbnail(text: str, idea: str, output_path: str | Path) -> str:
    output_path = str(output_path)
    image = Image.new("RGB", (1280, 720), color=(15, 15, 18))
    draw = ImageDraw.Draw(image)

    for y in range(720):
        ratio = y / 720
        color = (
            int(210 - ratio * 120),
            int(40 + ratio * 60),
            int(20 + ratio * 30),
        )
        draw.line([(0, y), (1280, y)], fill=color)

    overlay_path = ASSETS_DIR / "thumbnail_overlay.png"
    if overlay_path.exists():
        overlay = Image.open(overlay_path).convert("RGBA").resize((1280, 720))
        image.paste(overlay, (0, 0), overlay)

    font = _load_font(size=84)
    sub_font = _load_font(size=32)

    wrapped = _wrap_text(text, 12)
    draw.rounded_rectangle((40, 420, 1240, 670), radius=30, fill=(0, 0, 0, 170))
    draw.multiline_text((70, 450), wrapped, font=font, fill=(255, 255, 0), spacing=12, stroke_width=3, stroke_fill=(0, 0, 0))
    draw.text((60, 60), "TELUGU SPORTS UPDATE", font=sub_font, fill=(255, 255, 255))
    draw.text((60, 110), idea[:70], font=sub_font, fill=(255, 230, 230))

    image.save(output_path, quality=95)
    return output_path


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        settings.thumbnail_font_path,
        "C:/Windows/Fonts/Nirmala.ttf",
        "C:/Windows/Fonts/Nirmala.ttc",
        "C:/Windows/Fonts/Vrinda.ttf",
        "C:/Windows/Fonts/Gautami.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansTelugu-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size=size)
            except OSError:
                continue

    # Scan the Windows fonts folder for Telugu-capable fonts if the configured path fails.
    windows_fonts = Path("C:/Windows/Fonts")
    if windows_fonts.exists():
        for file in windows_fonts.iterdir():
            if file.suffix.lower() in {".ttf", ".ttc", ".otf"} and "nirmala" in file.name.lower():
                try:
                    return ImageFont.truetype(str(file), size=size)
                except OSError:
                    continue

    logger.warning("No Telugu-capable font found. Falling back to default font.")
    return ImageFont.load_default()


def _wrap_text(text: str, width: int) -> str:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        tentative = " ".join(current + [word])
        if len(tentative) > width and current:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return "\n".join(lines[:3])
