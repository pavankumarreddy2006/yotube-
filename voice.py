from __future__ import annotations

from pathlib import Path

from gtts import gTTS

from utils import get_logger, retry


logger = get_logger(__name__)

# Convert Telugu text into a spoken MP3 file using Google Text-to-Speech.
# The output is saved locally and then used by FFmpeg to create the final video.


def synthesize_voice(text: str, output_path: str | Path, *, lang: str = "te") -> str:
    output_path = str(output_path)

    def operation() -> str:
        tts = gTTS(text=text, lang=lang)
        tts.save(output_path)
        return output_path

    return retry(operation, operation_name=f"voice generation -> {output_path}")
