from __future__ import annotations

import math
import struct
import tempfile
import unittest
import wave
from pathlib import Path

from PIL import Image

from video import _find_ffmpeg, build_video


class RenderPipelineTests(unittest.TestCase):
    def test_build_video_creates_synced_artifacts(self) -> None:
        if not _find_ffmpeg():
            self.skipTest("FFmpeg is not available in this environment")

        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            audio_path = root / "voice.wav"
            image_path = root / "cover.jpg"
            output_path = root / "video.mp4"

            self._write_sine_wave(audio_path, duration_seconds=4)
            Image.new("RGB", (1280, 720), color=(18, 34, 62)).save(image_path)

            result = build_video(
                audio_path=audio_path,
                image_path=image_path,
                output_path=output_path,
                vertical=False,
                script="Messi scored. The crowd exploded. Argentina celebrated the finish.",
                highlights=["Messi scored", "Crowd exploded", "Argentina celebrated"],
                visual_queries=["Messi football action", "stadium crowd cheer", "Argentina team celebration"],
                scene_image_paths=[],
            )

            self.assertTrue(Path(result).exists())
            self.assertTrue(output_path.with_suffix(".srt").exists())

    def _write_sine_wave(self, path: Path, duration_seconds: int) -> None:
        sample_rate = 22050
        frequency = 440.0
        amplitude = 16000
        total_frames = sample_rate * duration_seconds
        with wave.open(str(path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            for index in range(total_frames):
                value = int(amplitude * math.sin(2 * math.pi * frequency * (index / sample_rate)))
                wav_file.writeframes(struct.pack("<h", value))


if __name__ == "__main__":
    unittest.main()
