from __future__ import annotations

from pathlib import Path

from thumbnail_engine import ThumbnailEngine


def create_thumbnail(text: str, idea: str, output_path: str | Path) -> str:
    return ThumbnailEngine().render(text=text, idea=idea, output_path=Path(str(output_path)))
