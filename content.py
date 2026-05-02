from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import openai
from openai import OpenAI

from data import TopicCandidate
from scoring import ScoredTopic
from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)

EXPECTED_KEYS = {
    "title",
    "description",
    "tags",
    "thumbnail_text",
    "hook",
    "shorts_script_telugu",
    "long_script_english",
}


@dataclass
class ContentPackage:
    title: str
    description: str
    tags: list[str]
    thumbnail_text: str
    hook: str
    shorts_script_telugu: str
    long_script_english: str

    @property
    def shorts_script(self) -> str:
        return self.shorts_script_telugu

    @property
    def long_script(self) -> str:
        return self.long_script_english

    @property
    def thumbnail_idea(self) -> str:
        return "Bold sports thumbnail with strong contrast, player emotion, and breaking-news energy."

    @property
    def hashtags(self) -> list[str]:
        return []


SYSTEM_PROMPT = """
You are a professional YouTube sports content creator.

Your job is to convert sports news into HIGH-ENGAGEMENT YouTube video content.

OUTPUT (STRICT JSON ONLY):
{
  "title": "",
  "description": "",
  "tags": [],
  "thumbnail_text": "",
  "hook": "",
  "shorts_script_telugu": "",
  "long_script_english": ""
}

RULES:
1. TITLE:
- Must be viral and emotional
- Add curiosity + drama

2. THUMBNAIL TEXT:
- Max 4 words
- ALL CAPS
- Emotional

3. HOOK:
- First 2 seconds attention grabber
- Must create curiosity

4. SHORTS SCRIPT (TELUGU):
- 25-40 seconds speaking
- Simple Telugu
- Energetic tone
- Include emotion + suspense

5. LONG SCRIPT (ENGLISH):
- 500-900 words
- Structure:
  - Hook intro
  - What happened
  - Key moments
  - Analysis
  - Ending
- Storytelling style like a YouTuber

6. DESCRIPTION:
- Include keywords: sports news, cricket, football, highlights
- Add CTA: Like, Share, Subscribe

7. TAGS:
- Minimum 10 tags
- Include trending sports keywords

IMPORTANT:
- Output ONLY JSON
- No explanation
""".strip()


def fallback_content() -> dict[str, str]:
    return {
        "title": "Telugu Sports Update",
        "script": (
            "Latest sports update is here. Big reaction from fans, key match pressure, "
            "and one talking point everyone is discussing right now."
        ),
    }


def generate_content(topic: TopicCandidate, scored: ScoredTopic, trends: list[str]) -> ContentPackage:
    if settings.openai_api_key:
        try:
            return _generate_with_llm(topic, scored, trends)
        except Exception:
            logging.warning("Using template fallback content")
            logger.exception("LLM generation failed")

    try:
        return _fallback_content(topic, scored, trends)
    except Exception:
        logger.exception("Template fallback failed")
        return _minimal_content_package()


def _generate_with_llm(topic: TopicCandidate, scored: ScoredTopic, trends: list[str]) -> ContentPackage:
    client = OpenAI(api_key=settings.openai_api_key)
    prompt = f"""
INPUT:
Topic: {topic.title}
Details:
- Summary: {topic.summary}
- Score: {scored.score}
- Decision: {scored.decision}
- Reasons: {", ".join(scored.reasons) or "none"}
- Players: {", ".join(topic.players) or "none"}
- Tournament: {topic.tournament or "none"}
- Score details: {topic.score_details or "none"}
- Trending keywords: {", ".join(trends[:10]) or "sports news, cricket, football, highlights"}

Make the content feel current, emotional, and optimized for YouTube engagement.
""".strip()

    def operation() -> ContentPackage:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        payload = _parse_response_payload(response.output_text)
        return ContentPackage(**payload)

    def should_retry(exc: Exception, attempt: int) -> bool:
        del attempt
        if isinstance(exc, openai.RateLimitError):
            return False
        if isinstance(exc, openai.OpenAIError) and getattr(exc, "code", "") == "insufficient_quota":
            return False
        return True

    return retry(
        operation,
        operation_name="OpenAI content generation",
        should_retry=should_retry,
    )


def _fallback_content(topic: TopicCandidate, scored: ScoredTopic, trends: list[str]) -> ContentPackage:
    base = fallback_content()["script"]
    player_text = topic.players[0] if topic.players else "star player"
    tournament = topic.tournament or "sports world"
    trend_text = ", ".join(trends[:3]) or "India cricket, IPL, fan reactions"
    title = f"{(topic.title or 'Sports Update')[:58]}... What Happened Next?!"
    hook = f"{player_text} shock ichchada? Final moments lo asalu em jarigindi?"
    shorts_script_telugu = (
        f"Friends, ivvala sports lo pedda twist jarigindi. {topic.title or 'Latest sports update'} gurinchi andaroo maatladutunnaru. "
        f"{topic.summary or base} "
        f"{topic.score_details or ''} "
        f"Especially {player_text} performance chusi fans full shock ayyaru. "
        "Match pressure, last moment tension, anduke ee update ippudu viral avtundi. "
        "Mee opinion enti, comments lo cheppandi."
    ).strip()
    long_script_english = (
        f"Have you ever watched a sports story unfold and felt like the drama kept getting bigger every minute? "
        f"That is exactly what happened with {topic.title or 'this latest sports update'}. Today, we are breaking down the full story, "
        f"why fans are reacting so strongly, and what this moment could mean going forward.\n\n"
        f"Let us start with what happened. {topic.summary or base} "
        f"{topic.score_details or 'The biggest talking point came from how quickly the momentum shifted.'} "
        f"In a fast-moving sports cycle, stories like this explode because they combine emotion, pressure, and uncertainty. "
        f"That is why this update is now being discussed across fan pages, highlight clips, and reaction threads.\n\n"
        f"One of the key names in this story is {player_text}. Whether you look at the performance, decision-making, or just the pressure of the situation, "
        "this was the kind of moment that instantly gets people talking. Fans do not just react to the result. They react to the tension, "
        "the body language, the key turning points, and the feeling that something huge was always about to happen.\n\n"
        f"Now let us get into the biggest moments. First, the build-up itself created interest because the context around {tournament} already carried weight. "
        "Then came the sequence that changed the conversation. From there, every small detail mattered more. A single over, a single move, "
        "a single missed chance, or a clutch response can completely flip the energy of a game or sports headline. "
        "That is what made this feel bigger than a normal update.\n\n"
        "The analysis is where things get even more interesting. This is not only about one result. It is about momentum. It is about confidence. "
        "It is about how players, teams, and fans respond when pressure suddenly rises. The reasons behind the buzz include "
        f"{', '.join(scored.reasons) or 'strong fan emotion and massive public interest'}. "
        f"On top of that, trending topics around this story include {trend_text}, which tells us the attention is spreading beyond just one audience.\n\n"
        "If this performance or moment becomes a turning point, we may look back at this as the spark that changed the next phase of the conversation. "
        "If it goes the other way, fans will still remember this as one of those emotionally charged updates that felt impossible to ignore. "
        "That is the power of sports. It gives us moments that are unpredictable, dramatic, and instantly shareable.\n\n"
        "So what do you think? Was this overhyped, or was it genuinely one of the most intense sports talking points right now? "
        "Drop your take below, and if you want more sports storytelling, match breakdowns, cricket updates, football reactions, and highlights, stay tuned for the next one."
    ).strip()

    return ContentPackage(
        title=title,
        description=(
            f"{topic.title or 'Latest sports update'}\n\n"
            f"{topic.summary or base}\n\n"
            "sports news, cricket, football, highlights\n"
            "Like, Share, Subscribe for more daily sports updates."
        ),
        tags=[
            "sports news",
            "cricket",
            "football",
            "highlights",
            "sports highlights",
            "breaking sports news",
            "cricket news",
            "football news",
            "viral sports update",
            "match highlights",
            tournament.lower(),
            player_text.lower(),
        ],
        thumbnail_text="FINAL OVER SHOCK",
        hook=hook,
        shorts_script_telugu=shorts_script_telugu,
        long_script_english=long_script_english,
    )


def _minimal_content_package() -> ContentPackage:
    data = fallback_content()
    return ContentPackage(
        title=data["title"],
        description=f"{data['script']}\n\nsports news, cricket, football, highlights\nLike, Share, Subscribe.",
        tags=[
            "sports news",
            "cricket",
            "football",
            "highlights",
            "sports update",
            "breaking news",
            "match highlights",
            "cricket news",
            "football news",
            "viral sports",
        ],
        thumbnail_text="SPORTS UPDATE",
        hook=data["script"],
        shorts_script_telugu=data["script"],
        long_script_english="",
    )


def _parse_response_payload(raw_text: str) -> dict[str, object]:
    cleaned = (raw_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    payload = json.loads(cleaned)
    if not isinstance(payload, dict):
        raise ValueError("Model response was not a JSON object")

    normalized = {key: payload.get(key) for key in EXPECTED_KEYS}
    return {
        "title": _as_text(normalized.get("title"), "Sports Update"),
        "description": _ensure_keywords_and_cta(_as_text(normalized.get("description"), fallback_content()["script"])),
        "tags": _normalize_tags(normalized.get("tags")),
        "thumbnail_text": _normalize_thumbnail_text(normalized.get("thumbnail_text")),
        "hook": _as_text(normalized.get("hook"), "This sports moment changed everything."),
        "shorts_script_telugu": _as_text(normalized.get("shorts_script_telugu"), fallback_content()["script"]),
        "long_script_english": _as_text(normalized.get("long_script_english"), ""),
    }


def _as_text(value: object, default: str) -> str:
    text = str(value).strip() if value is not None else ""
    return text or default


def _normalize_tags(value: object) -> list[str]:
    if isinstance(value, list):
        raw_tags = [str(item).strip() for item in value if str(item).strip()]
    elif isinstance(value, str):
        raw_tags = [part.strip() for part in value.split(",") if part.strip()]
    else:
        raw_tags = []

    fallback_tags = [
        "sports news",
        "cricket",
        "football",
        "highlights",
        "cricket news",
        "football news",
        "sports highlights",
        "breaking sports news",
        "match highlights",
        "viral sports update",
    ]
    merged = raw_tags + [tag for tag in fallback_tags if tag not in raw_tags]
    return merged[:15]


def _normalize_thumbnail_text(value: object) -> str:
    text = _as_text(value, "BIG MATCH SHOCK")
    words = text.upper().split()
    trimmed = " ".join(words[:4]).strip()
    return trimmed or "BIG MATCH SHOCK"


def _ensure_keywords_and_cta(description: str) -> str:
    required_line = "sports news, cricket, football, highlights"
    cta_line = "Like, Share, Subscribe"
    updated = description.strip()
    if required_line not in updated:
        updated = f"{updated}\n\n{required_line}".strip()
    if cta_line.lower() not in updated.lower():
        updated = f"{updated}\n{cta_line}".strip()
    return updated
