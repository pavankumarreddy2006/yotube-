from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from thumbnail_engine import ThumbnailEngine


class ThumbnailEngineTests(unittest.TestCase):
    def test_thumbnail_generation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            output = Path(tmp_dir) / "thumb.jpg"
            path = ThumbnailEngine().render("SPORTS SHOCK", "dynamic sports thumbnail", output)
            self.assertTrue(Path(path).exists())
            with Image.open(path) as image:
                self.assertEqual(image.size, (1280, 720))


if __name__ == "__main__":
    unittest.main()
