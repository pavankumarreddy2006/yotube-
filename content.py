from __future__ import annotations

import json
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


def generate_content(topic: TopicCandidate, scored: ScoredTopic, trends: list[str]) -> ContentPackage:
    if settings.openai_api_key:
        try:
            return _generate_with_llm(topic, scored, trends)
        except Exception as exc:  # noqa: BLE001
            logger.exception("LLM generation failed. Falling back to template engine: %s", exc)
    return _fallback_content(topic, scored, trends)


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
        text = response.output_text
        payload = json.loads(text)
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
    player_text = topic.players[0] if topic.players else "స్టార్ ప్లేయర్లు"
    urgency = "చివరి వరకు టెన్షన్" if topic.is_thriller else "ఇప్పుడు సోషల్ మీడియాలో హాట్ టాపిక్"
    title = f"{topic.title[:60]} | తెలుగు ఫ్యాన్స్ షాక్!"
    hook = f"ఈ {topic.topic} update చూసాక మీరు కూడా షాక్ అవుతారు! {urgency}."
    shorts_script = (
        f"ఇప్పుడు sports world లో biggest update ఇదే. {topic.title}. "
        f"{topic.summary}. {topic.score_details} "
        f"{player_text} మీద ఇప్పుడు అందరి చూపు ఉంది. "
        f"ఇది simple news కాదు, fans emotion full ga connect అయ్యే story. "
        f"మీకు ఏమనిపించింది కామెంట్ లో చెప్పండి."
    )
    long_script = (
        f"అందరికీ నమస్కారం. ఈరోజు మన channel లో biggest sports update గురించి మాట్లాడేద్దాం. "
        f"మొదట topic ఏమిటంటే {topic.title}. {topic.summary}. "
        f"ఈ story ఎందుకు important అంటే {', '.join(scored.reasons) or 'fans interest చాలా strong గా ఉంది'}. "
        f"{topic.score_details or 'స్కోర్ కన్నా ఈ మ్యాచ్ momentum ఇప్పుడు key point గా మారింది.'} "
        f"{player_text} performance, team pressure, fans expectations అన్నీ ఈ story ని మరింత interesting గా చేస్తున్నాయి. "
        f"ఇంకా trend side చూస్తే {', '.join(trends[:3])} వంటి topics కూడా audience attention ని same zone లోకి తీసుకొస్తున్నాయి. "
        f"ఈ update నుండి మనకు కనిపిస్తున్న biggest takeaway ఏమిటంటే consistency, pressure handling, and big-match mindset. "
        f"ఒక మంచి finish ఉంటే narrative ఒక్కసారిగా మారిపోతుంది. ఒక చిన్న mistake జరిగినా match discussion పూర్తిగా reverse అవుతుంది. "
        f"ఇప్పుడు social media లో reactions వేగంగా వస్తున్నాయి. Telugu fans especially emotion తో react అవుతున్నారు. "
        f"next matches మీద impact ఎలా ఉంటుందో కూడా చాలా మంది discuss చేస్తున్నారు. "
        f"మీ prediction ఏంటి, next update లో ఎవరు highlight అవుతారు, ఈ performance team balance ని ఎలా change చేస్తుంది అన్నది కూడా ముఖ్యమే. "
        f"ఇలాంటి fast Telugu sports updates కోసం మన channel ని follow అవ్వండి, video ని share చేయండి, మీ opinion comment చేయండి."
    )
    thumbnail_text = "భారీ స్పోర్ట్స్ షాక్"
    thumbnail_idea = (
        f"High contrast thumbnail with {player_text}, bold Telugu headline, red/yellow energy burst, "
        f"scoreboard feel, and emotional reaction face."
    )
    description = (
        f"{topic.title} పై తాజా Telugu sports update ఇది. {topic.summary} "
        f"Full analysis, match emotion, fan reaction అన్నీ ఈ వీడియోలో ఉన్నాయి. "
        f"Like, Share, Subscribe for daily sports updates.\n\n"
        f"#TeluguSports #CricketUpdate"
    )
    hashtags = ["#TeluguSports", "#CricketUpdate", "#SportsNews", "#IndiaCricket", "#IPL", "#Shorts"]
    tags = [
        "telugu sports",
        "cricket update telugu",
        "sports news",
        "ipl telugu",
        "india cricket",
        player_text.lower(),
        topic.topic.lower(),
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
