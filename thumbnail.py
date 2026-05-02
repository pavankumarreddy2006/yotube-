from __future__ import annotations

from pathlib import Path

from settings import settings
from thumbnail_generator import create_thumbnail as render_thumbnail


def create_thumbnail(text: str, idea: str, output_path: str | Path) -> str:
    del idea
    return str(
        render_thumbnail(
            text=text,
            font_path=settings.thumbnail_font_path,
            output_path=Path(str(output_path)),
        )
    )
