from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

import openai
from openai import OpenAI

from data import TopicCandidate
from scoring import ScoredTopic
from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)

SUPPORTED_LANGUAGES = {"te": "Telugu", "en": "English"}
EXPECTED_KEYS = {
    "title",
    "description",
    "tags",
    "thumbnail_text",
    "hook",
    "shorts_script",
    "long_script",
    "highlights",
    "visual_queries",
    "hashtags",
}


@dataclass
class ContentPackage:
    title: str
    description: str
    tags: list[str]
    thumbnail_text: str
    hook: str
    shorts_script: str
    long_script: str
    highlights: list[str] = field(default_factory=list)
    visual_queries: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)
    language: str = "te"
    language_label: str = "Telugu"

    @property
    def thumbnail_idea(self) -> str:
        return (
            "High-contrast sports news thumbnail with one main emotional subject, dark dramatic background, "
            "large Telugu headline, yellow red and white palette, and strong mobile readability."
        )

    @property
    def scene_lines(self) -> list[str]:
        source = self.long_script if self.long_script.strip() else self.shorts_script
        return _split_sentences(source)

    @property
    def shorts_script_telugu(self) -> str:
        return self.shorts_script if self.language == "te" else ""

    @property
    def long_script_telugu(self) -> str:
        return self.long_script if self.language == "te" else ""

    @property
    def shorts_script_english(self) -> str:
        return self.shorts_script if self.language == "en" else ""

    @property
    def long_script_english(self) -> str:
        return self.long_script if self.language == "en" else ""

    @property
    def highlights_telugu(self) -> list[str]:
        return self.highlights if self.language == "te" else []

    @property
    def highlights_english(self) -> list[str]:
        return self.highlights if self.language == "en" else []


def _split_sentences(text: str) -> list[str]:
    normalized = " ".join(part.strip() for part in text.splitlines() if part.strip())
    if not normalized:
        return []
    parts = re.split(r"[.!?।]+", normalized)
    return [part.strip() for part in parts if part.strip()]


def fallback_content(language: str = "te") -> dict[str, str]:
    if language == "en":
        return {
            "title": "Sports Daily Update",
            "script": (
                "You will not believe how quickly today changed in the sports world. "
                "Now let us look at the real story. "
                "From cricket to football, the biggest talking points are creating serious buzz right now. "
                "Stay till the end because the final update changes the full picture."
            ),
        }

    return {
        "title": "ఈ రోజు స్పోర్ట్స్ అప్డేట్",
        "script": (
            "ఇది మీరు నమ్మలేని విషయం. "
            "ఈ రోజు స్పోర్ట్స్ ప్రపంచంలో కొన్ని పెద్ద మార్పులు జరిగాయి. "
            "ఇప్పుడు అసలు విషయం చూద్దాం. "
            "క్రికెట్ నుంచి ఫుట్‌బాల్ వరకు అభిమానులు మాట్లాడుతున్న ముఖ్యమైన వార్తలను చాలా సింపుల్‌గా మీకు చెప్పబోతున్నాం. "
            "చివరి వరకు చూడండి, చివర్లో ఉన్న అప్డేట్ మొత్తం కథను మార్చేస్తుంది."
        ),
    }


def generate_content(
    selected_topic: TopicCandidate,
    scored: ScoredTopic,
    trends: list[str],
    highlights: list[TopicCandidate],
    *,
    language: str = "te",
) -> ContentPackage:
    normalized_language = normalize_language(language)
    if settings.openai_api_key:
        try:
            return _generate_with_llm(selected_topic, scored, trends, highlights, language=normalized_language)
        except Exception:
            logging.warning("Using template fallback content")
            logger.exception("LLM generation failed")

    try:
        return _fallback_content(selected_topic, trends, highlights, language=normalized_language)
    except Exception:
        logger.exception("Template fallback failed")
        return _minimal_content_package(normalized_language)


def generate_custom_script(
    topic: str,
    *,
    language: str = "te",
    include_video_prompt: bool = False,
) -> dict[str, object]:
    normalized_language = normalize_language(language)
    language_label = SUPPORTED_LANGUAGES[normalized_language]
    if settings.openai_api_key:
        try:
            return _generate_custom_with_llm(topic, normalized_language, include_video_prompt)
        except Exception:
            logger.exception("Custom script generation failed, using fallback")

    title = f"{topic.strip()[:70] or 'Sports Topic'} Breakdown"
    if normalized_language == "en":
        script = (
            f"You will not believe this update about {topic}. "
            "Now let us get into the real story. "
            "I will explain what happened, why it matters, and what fans should watch next."
        )
    else:
        script = (
            f"{topic} గురించి ఇది మీరు నమ్మలేని విషయం. "
            "ఇప్పుడు అసలు విషయం చూద్దాం. "
            "ఏం జరిగింది, అది ఎందుకు ముఖ్యమో, తరువాత ఏం జరగొచ్చో చాలా సింపుల్ తెలుగు లో చూసేద్దాం."
        )

    return {
        "title": title,
        "script": script,
        "language": normalized_language,
        "language_label": language_label,
        "video_prompt": (
            f"Create a professional {'vertical' if include_video_prompt else 'wide'} Telugu sports explainer with matching visuals for {topic}."
            if include_video_prompt
            else ""
        ),
    }


def normalize_language(language: str | None) -> str:
    candidate = (language or settings.default_language or "te").strip().lower()
    return candidate if candidate in SUPPORTED_LANGUAGES else "te"


def _system_prompt(language: str) -> str:
    language_label = SUPPORTED_LANGUAGES[language]
    script_rule = f"All narration, hooks, scene lines, and highlights must be fully in natural {language_label}."
    return f"""
You are a top-tier Telugu YouTube producer building a polished, high-retention sports video package.

OUTPUT (STRICT JSON ONLY):
{{
  "title": "",
  "description": "",
  "tags": [],
  "thumbnail_text": "",
  "hook": "",
  "shorts_script": "",
  "long_script": "",
  "highlights": [],
  "visual_queries": [],
  "hashtags": []
}}

RULES:
1. {script_rule}
2. Title, description, tags, and hashtags must be in English for YouTube SEO.
3. Telugu wording must be simple, conversational, emotional, and easy for mass audiences.
4. Start with a curiosity hook in the first 1 to 2 lines.
5. Use short sentences and clean storytelling flow:
   - hook
   - main points
   - closing summary with engagement prompt
6. Avoid robotic, textbook, or overly formal Telugu.
7. Long script:
   - 450 to 750 words
   - 6 to 10 compact paragraphs
   - every paragraph should map well to visuals
8. Shorts script:
   - 60 to 90 words
   - fast, punchy, emotionally engaging
9. highlights:
   - 6 to 10 concise Telugu scene lines
   - each line should work as a subtitle/visual beat
10. visual_queries:
   - exactly one English visual prompt per highlight
   - highly specific, literal, and visually matchable
   - mention player/team/event/object when possible
11. Thumbnail text:
   - Telugu only
   - 2 to 4 words
   - high emotion, high curiosity, mobile readable
12. Description:
   - concise SEO-focused English summary
   - include keywords and end with hashtags
13. Tags:
   - at least 12 relevant English tags
14. Stay factual. Do not invent scores, quotes, or statistics.
15. Output JSON only.
""".strip()


def _generate_with_llm(
    selected_topic: TopicCandidate,
    scored: ScoredTopic,
    trends: list[str],
    highlights: list[TopicCandidate],
    *,
    language: str,
) -> ContentPackage:
    client = OpenAI(api_key=settings.openai_api_key)
    highlight_lines = []
    for index, item in enumerate(highlights[: settings.max_daily_highlights], start=1):
        highlight_lines.append(
            f"{index}. {item.title} | {item.summary} | category={item.category} | source={item.source} | published={item.published_at or 'unknown'}"
        )

    prompt = f"""
MAIN STORY:
- Topic: {selected_topic.title}
- Summary: {selected_topic.summary}
- Score: {scored.score}
- Decision: {scored.decision}
- Reasons: {", ".join(scored.reasons) or "none"}

DAILY HIGHLIGHTS:
{chr(10).join(highlight_lines)}

TRENDING KEYWORDS:
{", ".join(trends[:12]) or "cricket, football, tennis, olympics"}
""".strip()

    def operation() -> ContentPackage:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": _system_prompt(language)},
                {"role": "user", "content": prompt},
            ],
        )
        payload = _parse_response_payload(response.output_text, language)
        return ContentPackage(**payload)

    def should_retry(exc: Exception, attempt: int) -> bool:
        del attempt
        if isinstance(exc, openai.RateLimitError):
            return False
        return True

    return retry(operation, operation_name="content generation", should_retry=should_retry)


def _generate_custom_with_llm(topic: str, language: str, include_video_prompt: bool) -> dict[str, object]:
    client = OpenAI(api_key=settings.openai_api_key)
    language_label = SUPPORTED_LANGUAGES[language]
    prompt = f"""
Create a clean YouTube-ready sports explainer in {language_label} about: {topic}

Rules:
- Keep the script simple and natural.
- Start with a strong hook.
- Use short conversational sentences.
- End with a summary and audience engagement line.
- Avoid robotic tone.
Return strict JSON with keys: title, script, language, language_label, video_prompt
""".strip()
    def operation() -> dict[str, object]:
        response = client.responses.create(model=settings.openai_model, input=prompt)
        text = response.output_text.strip()
        match = re.search(r"\{.*\}", text, flags=re.S)
        payload = json.loads(match.group(0) if match else text)
        payload["language"] = language
        payload["language_label"] = language_label
        if include_video_prompt and not payload.get("video_prompt"):
            payload["video_prompt"] = f"Professional sports explainer visuals for {topic}"
        return payload

    def should_retry(exc: Exception, attempt: int) -> bool:
        del attempt
        if isinstance(exc, openai.RateLimitError):
            return False
        return True

    return retry(operation, operation_name="custom content generation", should_retry=should_retry)


def _fallback_content(
    selected_topic: TopicCandidate,
    trends: list[str],
    highlights: list[TopicCandidate],
    *,
    language: str,
) -> ContentPackage:
    base = fallback_content(language)
    scene_lines = []
    visual_queries = []
    for item in highlights[: settings.max_daily_highlights]:
        scene_lines.append(item.title.strip())
        visual_queries.append(f"professional sports news visual for {item.title}")
    if not scene_lines:
        scene_lines = _split_sentences(base["script"])
    if not visual_queries:
        visual_queries = ["professional sports breaking news studio"] * max(1, len(scene_lines))

    title = (
        f"Big Sports Shock Today | Telugu Sports News"
        if language == "te"
        else "Big Sports Shock Today | Sports News Update"
    )
    hashtags = ["#TeluguNews", "#SportsNews", "#SportsUpdate"]
    description = (
        "A fast, professional Telugu sports update covering the biggest trending stories, key developments, and what fans should watch next.\n\n"
        + "Keywords: telugu sports news, sports update, cricket news, football update\n\n"
        + " ".join(hashtags)
    )
    return ContentPackage(
        title=title,
        description=description,
        tags=[
            "telugu sports news",
            "sports update",
            "cricket news telugu",
            "football news telugu",
            "latest sports news",
            "breaking sports news",
            "telugu youtube news",
            "sports headlines",
            "daily sports bulletin",
            "trending sports topics",
            *trends[:4],
        ],
        thumbnail_text="షాక్ న్యూస్",
        hook=_split_sentences(base["script"])[0],
        shorts_script=base["script"],
        long_script=base["script"] + " " + " ".join(item.summary for item in highlights[:4] if item.summary),
        highlights=scene_lines[:8],
        visual_queries=visual_queries[:8],
        hashtags=hashtags,
        language=language,
        language_label=SUPPORTED_LANGUAGES[language],
    )


def _minimal_content_package(language: str) -> ContentPackage:
    base = fallback_content(language)
    return ContentPackage(
        title=base["title"],
        description="Automated sports video update.",
        tags=["sports update", "telugu sports"],
        thumbnail_text="షాక్ అప్డేట్" if language == "te" else "SPORTS UPDATE",
        hook=_split_sentences(base["script"])[0] if _split_sentences(base["script"]) else base["script"],
        shorts_script=base["script"],
        long_script=base["script"],
        highlights=_split_sentences(base["script"])[:6],
        visual_queries=["professional sports visual"] * max(1, len(_split_sentences(base["script"])[:6])),
        hashtags=["#SportsNews"],
        language=language,
        language_label=SUPPORTED_LANGUAGES[language],
    )


def _parse_response_payload(raw_text: str, language: str) -> dict[str, object]:
    payload = _extract_json_object(raw_text)
    missing = EXPECTED_KEYS - set(payload)
    if missing:
        raise ValueError(f"Missing keys in content payload: {sorted(missing)}")

    visual_queries = [str(item).strip() for item in payload.get("visual_queries", []) if str(item).strip()]
    highlights = [str(item).strip() for item in payload.get("highlights", []) if str(item).strip()]
    if not visual_queries:
        visual_queries = ["professional sports visual"] * max(1, len(highlights))
    if len(visual_queries) < len(highlights):
        visual_queries.extend([visual_queries[-1]] * (len(highlights) - len(visual_queries)))

    return {
        "title": str(payload["title"]).strip(),
        "description": str(payload["description"]).strip(),
        "tags": [str(item).strip() for item in payload.get("tags", []) if str(item).strip()][:20],
        "thumbnail_text": str(payload["thumbnail_text"]).strip(),
        "hook": str(payload["hook"]).strip(),
        "shorts_script": str(payload["shorts_script"]).strip(),
        "long_script": str(payload["long_script"]).strip(),
        "highlights": highlights[:10],
        "visual_queries": visual_queries[:10],
        "hashtags": [str(item).strip() for item in payload.get("hashtags", []) if str(item).strip()][:8],
        "language": language,
        "language_label": SUPPORTED_LANGUAGES[language],
    }


def _extract_json_object(raw_text: str) -> dict[str, object]:
    text = raw_text.strip()
    match = re.search(r"\{.*\}", text, flags=re.S)
    if match:
        text = match.group(0)
    return json.loads(text)
