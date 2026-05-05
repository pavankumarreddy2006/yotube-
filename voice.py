from __future__ import annotations

from pathlib import Path
from typing import Iterable

import requests
from gtts import gTTS
from openai import OpenAI

from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)


def _sentence_chunks(text: str) -> list[str]:
    normalized = " ".join(part.strip() for part in text.splitlines() if part.strip())
    if not normalized:
        return []
    parts = normalized.replace("!", ".").replace("?", ".").split(".")
    chunks = [part.strip() for part in parts if part.strip()]
    return chunks or [normalized]


def _with_pauses(text: str, *, pause_marker: str) -> str:
    chunks = _sentence_chunks(text)
    return pause_marker.join(chunks) if chunks else text


def _azure_ssml(text: str, *, language: str) -> str:
    style = settings.azure_tts_style or "general"
    degree = settings.azure_tts_style_degree or "1.0"
    voice = settings.azure_tts_voice or ("te-IN-MohanNeural" if language == "te" else "en-US-JennyNeural")
    body = []
    for sentence in _sentence_chunks(text):
        body.append(
            f"<mstts:express-as style=\"{style}\" styledegree=\"{degree}\">"
            f"<prosody rate=\"{settings.tts_rate}\" pitch=\"{settings.tts_pitch}\">{sentence}</prosody>"
            f"</mstts:express-as><break time=\"650ms\"/>"
        )
    content = "".join(body) or text
    return (
        "<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" "
        "xmlns:mstts=\"https://www.w3.org/2001/mstts\" "
        f"xml:lang=\"{'te-IN' if language == 'te' else 'en-US'}\">"
        f"<voice name=\"{voice}\">{content}</voice>"
        "</speak>"
    )


def _try_elevenlabs(text: str, output_path: str | Path) -> str:
    if not settings.elevenlabs_api_key:
        raise RuntimeError("ElevenLabs API key missing")
    voice_id = settings.elevenlabs_voice_id.strip()
    if not voice_id:
        raise RuntimeError("ElevenLabs voice ID missing")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": _with_pauses(text, pause_marker="... "),
        "model_id": settings.elevenlabs_model,
        "voice_settings": {
            "stability": settings.elevenlabs_stability,
            "similarity_boost": settings.elevenlabs_similarity_boost,
            "style": settings.elevenlabs_style,
            "use_speaker_boost": True,
        },
    }
    response = requests.post(
        url,
        headers={
            "xi-api-key": settings.elevenlabs_api_key,
            "accept": "audio/mpeg",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    Path(str(output_path)).write_bytes(response.content)
    return str(output_path)


def _try_azure(text: str, output_path: str | Path, *, lang: str) -> str:
    if not settings.azure_tts_key or not settings.azure_tts_region:
        raise RuntimeError("Azure TTS credentials missing")
    response = requests.post(
        f"https://{settings.azure_tts_region}.tts.speech.microsoft.com/cognitiveservices/v1",
        headers={
            "Ocp-Apim-Subscription-Key": settings.azure_tts_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": settings.azure_tts_output_format,
            "User-Agent": "youtube-automation",
        },
        data=_azure_ssml(text, language=lang).encode("utf-8"),
        timeout=120,
    )
    response.raise_for_status()
    Path(str(output_path)).write_bytes(response.content)
    return str(output_path)


def _try_openai(text: str, output_path: str | Path) -> str:
    if not settings.openai_api_key:
        raise RuntimeError("OpenAI API key missing")
    client = OpenAI(api_key=settings.openai_api_key)
    speech = client.audio.speech.create(
        model=settings.openai_tts_model,
        voice=settings.openai_tts_voice,
        input=_with_pauses(text, pause_marker=" ... "),
    )
    speech.stream_to_file(str(output_path))
    return str(output_path)


def _try_gtts(text: str, output_path: str | Path, *, lang: str) -> str:
    tts = gTTS(text=text, lang=lang)
    tts.save(str(output_path))
    return str(output_path)


def _provider_chain(preferred: str) -> Iterable[str]:
    seen: set[str] = set()
    order = [preferred, "elevenlabs", "azure", "openai", "gtts"]
    for provider in order:
        normalized = provider.strip().lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            yield normalized


def synthesize_voice(text: str, output_path: str | Path, *, lang: str = "te") -> str:
    output_path = str(output_path)

    def operation() -> str:
        last_error: Exception | None = None
        for provider in _provider_chain(settings.tts_provider):
            try:
                logger.info("Trying TTS provider: %s", provider)
                if provider == "elevenlabs":
                    return _try_elevenlabs(text, output_path)
                if provider == "azure":
                    return _try_azure(text, output_path, lang=lang)
                if provider == "openai":
                    return _try_openai(text, output_path)
                if provider == "gtts":
                    return _try_gtts(text, output_path, lang=lang)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning("TTS provider %s failed: %s", provider, exc)
        raise RuntimeError(f"All TTS providers failed. Last error: {last_error}")

    return retry(operation, operation_name=f"voice generation -> {output_path}")
