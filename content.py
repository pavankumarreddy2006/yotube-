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


@dataclass
class ContentPackage:
    title: str
    hook: str
    shorts_script: str
    long_script: str
    thumbnail_text: str
    thumbnail_idea: str
    description: str
    hashtags: list[str]
    tags: list[str]


SYSTEM_PROMPT = """
You are a YouTube sports writer creating Telugu-friendly creator content.
Write in a conversational style that can be spoken naturally.
You may mix in common English sports terms like match, score, update, captain, fans, pressure.
Return strict JSON with these keys only:
title, hook, shorts_script, long_script, thumbnail_text, thumbnail_idea, description, hashtags, tags

Rules:
- title should be highly clickable
- hook should be 1-2 short lines
- shorts_script should feel like a spoken short-form script
- long_script should only be detailed when the decision is FULL
- thumbnail_text should be short and dramatic
- hashtags should contain 5-8 items
- tags should contain 8-12 items
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
Topic:
{topic.title}

Summary:
{topic.summary}

Score details:
- score: {scored.score}
- decision: {scored.decision}
- reasons: {", ".join(scored.reasons) or "none"}
- players: {", ".join(topic.players) or "none"}
- tournament: {topic.tournament or "none"}
- score_details: {topic.score_details or "none"}
- trends: {", ".join(trends[:8]) or "none"}

Write creator-ready content for a Telugu sports YouTube audience.
""".strip()

    def operation() -> ContentPackage:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        payload = json.loads(response.output_text)
        return ContentPackage(**payload)

    def should_retry(exc: Exception, attempt: int) -> bool:
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
    player_text = topic.players[0] if topic.players else "star players"
    tournament = topic.tournament or "sports world"
    trend_text = ", ".join(trends[:3]) or "India cricket, IPL, fan reactions"
    title = f"{(topic.title or 'Telugu Sports Update')[:70]} | Fans React"
    hook = (
        f"Big update in {tournament}. "
        f"{'This one feels intense.' if topic.is_thriller else 'Fans are already talking about it.'}"
    )
    shorts_script = (
        f"Here is the latest sports update. {topic.title or 'Telugu Sports Update'}. "
        f"{topic.summary or base} "
        f"{topic.score_details or ''} "
        f"Right now the spotlight is on {player_text}. "
        "This is not just a regular headline, it has real fan emotion and strong momentum. "
        "Tell us what you think in the comments."
    ).strip()
    long_script = (
        f"Welcome back. Today we are covering a major sports update: {topic.title or 'Telugu Sports Update'}. "
        f"{topic.summary or base} "
        f"Why is this important? Because {', '.join(scored.reasons) or 'fans are highly engaged with it'}. "
        f"{topic.score_details or 'The conversation around this update is moving quickly.'} "
        f"Players in focus include {player_text}, and the wider trend picture includes {trend_text}. "
        "This is exactly the kind of sports story that drives reactions, debate, and repeat viewing."
    ).strip()
    if scored.decision != "FULL":
        long_script = ""

    return ContentPackage(
        title=title,
        hook=hook,
        shorts_script=shorts_script,
        long_script=long_script,
        thumbnail_text="Sports Update",
        thumbnail_idea=(
            f"High-contrast sports thumbnail with {player_text}, bold title text, and an emotional breaking-news feel."
        ),
        description=(
            f"{topic.title or 'Telugu Sports Update'}\n\n"
            f"{topic.summary or base}\n\n"
            "Like, share, and subscribe for daily sports updates."
        ),
        hashtags=["#TeluguSports", "#SportsUpdate", "#CricketNews", "#FanReaction", "#YouTubeShorts"],
        tags=[
            "telugu sports",
            "sports update",
            "cricket news",
            "sports shorts",
            "fan reaction",
            tournament.lower(),
            player_text.lower(),
            (topic.topic or "sports").lower(),
        ],
    )


def _minimal_content_package() -> ContentPackage:
    data = fallback_content()
    return ContentPackage(
        title=data["title"],
        hook=data["script"],
        shorts_script=data["script"],
        long_script="",
        thumbnail_text="Sports Update",
        thumbnail_idea="Bold sports thumbnail with strong contrast.",
        description=data["script"],
        hashtags=["#TeluguSports", "#SportsUpdate"],
        tags=["telugu sports", "sports update"],
    )
