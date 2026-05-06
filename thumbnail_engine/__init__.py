from __future__ import annotations

from pathlib import Path

from PIL import Image

from settings import settings
from thumbnail_generator import create_thumbnail as render_thumbnail


class ThumbnailEngine:
    def render(self, text: str, idea: str, output_path: str | Path) -> str:
        del idea
        destination = Path(str(output_path))
        generated = render_thumbnail(text=text, font_path=settings.thumbnail_font_path, output_path=destination)
        self._validate(generated)
        return str(generated)

    def _validate(self, path: str | Path) -> None:
        with Image.open(str(path)) as image:
            width, height = image.size
            if width < 1280 or height < 720:
                raise ValueError(f"Thumbnail resolution too small: {width}x{height}")
