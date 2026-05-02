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
You are a Telugu YouTube sports writer for a viral channel.
Write natural spoken Telugu, not formal textbook Telugu.
Mix English naturally for words like match, score, update, form, fans, captain, pressure.
Keep it emotional, fast, punchy, and creator-ready.
Return strict JSON with keys:
title, hook, shorts_script, long_script, thumbnail_text, thumbnail_idea, description, hashtags, tags
Rules:
- title must be Telugu and highly clickable
- hook must be 1-2 lines for the first 3 seconds
- shorts_script must be 80-140 spoken words
- long_script must be 700-1100 spoken words if decision FULL, else keep it brief
- thumbnail_text max 6 words, bold and dramatic
- description must mix Telugu + English naturally and include a CTA
- hashtags must be 5-8 items
- tags must be 8-12 items
""".strip()


def fallback_content() -> dict[str, str]:
    return {
        "title": "Telugu Sports Update",
        "script": "ఈరోజు తాజా క్రీడా వార్తలు మీ కోసం...",
    }


def generate_content(topic: TopicCandidate, scored: ScoredTopic, trends: list[str]) -> ContentPackage:
    if settings.openai_api_key:
        try:
            return _generate_with_llm(topic, scored, trends)
        except Exception:
            logging.warning("Using fallback content")
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
- reasons: {", ".join(scored.reasons)}
- players: {", ".join(topic.players) or "none"}
- tournament: {topic.tournament or "none"}
- score_details: {topic.score_details or "none"}
- trends: {", ".join(trends[:8])}

Write for a Telugu sports YouTube audience.
""".strip()

    def operation() -> ContentPackage:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.9,
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
    player_text = topic.players[0] if topic.players else "Star players"
    urgency = "చివరి వరకు టెన్షన్" if topic.is_thriller else "ఇప్పుడు సోషల్ మీడియాలో హాట్ టాపిక్"
    title = f"{(topic.title or 'Telugu Sports Update')[:60]} | తెలుగు ఫ్యాన్స్ షాక్!"
    hook = f"ఈ {topic.topic or 'sports'} update చూసాక మీరు కూడా షాక్ అవుతారు! {urgency}."
    shorts_script = (
        f"ఇప్పుడు sports world లో biggest update ఇదే. {topic.title or 'Telugu Sports Update'}. "
        f"{topic.summary or fallback_content()['script']} "
        f"{topic.score_details or ''} {player_text} మీద ఇప్పుడు అందరి చూపు ఉంది. "
        f"ఇది simple news కాదు, fans emotion full ga connect అయ్యే story. "
        f"మీకు ఏమనిపించిందో comment లో చెప్పండి."
    ).strip()
    long_script = (
        f"అందరికీ నమస్కారం. ఈరోజు మన channel లో biggest sports update గురించి మాట్లాడేద్దాం. "
        f"మొదటి topic ఏమిటంటే {topic.title or 'Telugu Sports Update'}. "
        f"{topic.summary or fallback_content()['script']} "
        f"ఈ story ఎందుకు important అంటే {', '.join(scored.reasons) or 'fans interest చాలా strong గా ఉంది'}. "
        f"{topic.score_details or 'ఈ update చుట్టూ discussion చాలా వేగంగా పెరుగుతోంది.'} "
        f"{player_text} performance, team pressure, fans expectations అన్నీ ఈ story ని మరింత interesting గా చేస్తున్నాయి. "
        f"Trend side చూస్తే {', '.join(trends[:3]) or 'India cricket, IPL, Virat Kohli'} కూడా audience attention ని తీసుకువస్తున్నాయి. "
        f"ఇలాంటి fast Telugu sports updates కోసం మన channel ని follow అవ్వండి."
    )
    thumbnail_text = "భారీ స్పోర్ట్స్ షాక్"
    thumbnail_idea = (
        f"High contrast thumbnail with {player_text}, bold Telugu headline, red/yellow energy burst, "
        f"scoreboard feel, and emotional reaction face."
    )
    description = (
        f"{topic.title or 'Telugu Sports Update'} పై తాజా Telugu sports update ఇది. "
        f"{topic.summary or fallback_content()['script']} "
        "Like, Share, Subscribe for daily sports updates."
    )
    hashtags = ["#TeluguSports", "#CricketUpdate", "#SportsNews", "#IndiaCricket", "#IPL", "#Shorts"]
    tags = [
        "telugu sports",
        "cricket update telugu",
        "sports news",
        "ipl telugu",
        "india cricket",
        player_text.lower(),
        (topic.topic or "sports").lower(),
        "youtube shorts telugu",
    ]
    if scored.decision != "FULL":
        long_script = ""
    return ContentPackage(
        title=title,
        hook=hook,
        shorts_script=shorts_script,
        long_script=long_script,
        thumbnail_text=thumbnail_text,
        thumbnail_idea=thumbnail_idea,
        description=description,
        hashtags=hashtags,
        tags=tags,
    )


def _minimal_content_package() -> ContentPackage:
    data = fallback_content()
    return ContentPackage(
        title=data["title"],
        hook=data["script"],
        shorts_script=data["script"],
        long_script=data["script"],
        thumbnail_text="Telugu Sports Update",
        thumbnail_idea="Bold Telugu sports thumbnail with strong contrast.",
        description=data["script"],
        hashtags=["#TeluguSports", "#SportsUpdate"],
        tags=["telugu sports", "sports update"],
    )
