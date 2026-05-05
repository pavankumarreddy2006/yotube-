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
        return "Bold sports thumbnail with strong contrast, player emotion, breaking-news urgency, and premium broadcast styling."

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


def fallback_content(language: str = "te") -> dict[str, str]:
    if language == "en":
        return {
            "title": "Sports Daily Update",
            "script": (
                "The latest sports stories are moving fast today, from cricket to football and the global tournament circuit. "
                "Here is your quick daily bulletin with the biggest highlights fans are watching right now."
            ),
        }

    return {
        "title": "Telugu Sports Daily Update",
        "script": (
            "ఈరోజు స్పోర్ట్స్ ప్రపంచంలో ఎన్నో కీలక అప్‌డేట్లు వచ్చాయి. క్రికెట్, ఫుట్‌బాల్, టెన్నిస్, ఒలింపిక్స్ "
            "విషయాల్లో అభిమానులు ఆసక్తిగా గమనిస్తున్న ప్రధాన వార్తలను ఇప్పుడు మీకోసం తీసుకొచ్చాం."
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
            f"Welcome back sports fans. Today we are diving into {topic}. "
            "We will cover the key storyline, why it matters right now, the players or teams in focus, "
            "and what to watch next as this story develops."
        )
    else:
        script = (
            f"స్పోర్ట్స్ ఫ్యాన్స్ అందరికీ స్వాగతం. ఈరోజు {topic} గురించి క్లియర్‌గా మాట్లాడుకుందాం. "
            "ఈ అంశం ఎందుకు ముఖ్యమో, ఇందులో ప్రధాన ఆటగాళ్లు లేదా జట్లు ఎవరో, తర్వాత ఏం జరుగుతుందో ఇప్పుడు చూద్దాం."
        )

    return {
        "title": title,
        "script": script,
        "language": normalized_language,
        "language_label": language_label,
        "video_prompt": f"Create a {'vertical' if include_video_prompt else 'studio'} sports explainer around {topic}."
        if include_video_prompt
        else "",
    }


def normalize_language(language: str | None) -> str:
    candidate = (language or settings.default_language or "te").strip().lower()
    return candidate if candidate in SUPPORTED_LANGUAGES else "te"


def _system_prompt(language: str) -> str:
    language_label = SUPPORTED_LANGUAGES[language]
    script_rule = f"Voiceover scripts and highlights must be fully in natural {language_label}."
    return f"""
You are a professional YouTube sports newsroom producer.

Create a DAILY sports bulletin package from multiple fresh sports highlights.

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
2. Title, description, tags, and hashtags must always be in English.
3. Long script:
   - 650 to 950 words
   - Cover 5 to 10 sports highlights
   - Energetic sports-news anchor tone
4. Shorts script:
   - 30 to 60 seconds
   - Mention 1 to 2 strongest highlights
   - Fast, punchy, highly engaging
5. highlights:
   - 5 to 10 concise bullet lines in {language_label}
6. visual_queries:
   - 5 to 10 short English scene-image prompts
   - one prompt per highlight
7. Thumbnail text:
   - Max 4 words
   - Uppercase English
   - Breaking-news feel
8. Description:
   - English summary of the bulletin
   - Add hashtags at the end
9. Tags:
   - At least 10 relevant English tags
10. Stay factual. Do not invent statistics or match scores.
11. Use simple conversational Telugu with short, clear sentences.
12. Output JSON only.
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
        if isinstance(exc, openai.OpenAIError) and getattr(exc, "code", "") == "insufficient_quota":
            return False
        return True

    return retry(operation, operation_name="OpenAI content generation", should_retry=should_retry)


def _generate_custom_with_llm(topic: str, language: str, include_video_prompt: bool) -> dict[str, object]:
    client = OpenAI(api_key=settings.openai_api_key)
    language_label = SUPPORTED_LANGUAGES[language]
    system_prompt = f"""
You write engaging sports YouTube scripts.
Return strict JSON with keys: title, script, video_prompt.
Script must be in {language_label}. Title and video_prompt must be in English.
Keep it factual and energetic.
""".strip()
    user_prompt = (
        f"Create a sports explainer script about: {topic}. "
        "Length: 180 to 260 words. Include a strong opener, the main update, context, and a closing line."
    )

    response = client.responses.create(
        model=settings.openai_model,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    cleaned = (response.output_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    payload = json.loads(cleaned)
    return {
        "title": _as_text(payload.get("title"), f"{topic[:70]} Breakdown"),
        "script": _as_text(payload.get("script"), fallback_content(language)["script"]),
        "language": language,
        "language_label": language_label,
        "video_prompt": _as_text(payload.get("video_prompt"), f"Create a sports explainer around {topic}.")
        if include_video_prompt
        else "",
    }


def _fallback_content(
    selected_topic: TopicCandidate,
    trends: list[str],
    highlights: list[TopicCandidate],
    *,
    language: str,
) -> ContentPackage:
    chosen = highlights[: settings.max_daily_highlights] or [selected_topic]
    lines = [_build_highlight_line(item, language) for item in chosen]
    summaries = [f"- {item.title}: {item.summary}" for item in chosen[:8]]
    fallback_script = fallback_content(language)["script"]

    if language == "en":
        shorts_script = (
            "Sports fans, here is your quick update. "
            + " ".join(lines[:2])
            + " Stay with us for more daily sports coverage."
        ).strip()
        long_script = " ".join(
            [
                "Welcome to your daily sports bulletin.",
                fallback_script,
                *lines,
                "That wraps up the biggest stories across cricket, football, tennis, and the Olympic circuit.",
                "Like, share, and subscribe for more sports updates every day.",
            ]
        )
    else:
        shorts_script = (
            "స్పోర్ట్స్ ఫ్యాన్స్, ఇవాళ్టి టాప్ అప్‌డేట్స్ ఇవే. "
            + " ".join(lines[:2])
            + " మరిన్ని డైలీ స్పోర్ట్స్ అప్‌డేట్స్ కోసం మా ఛానల్‌ను ఫాలో అవ్వండి."
        ).strip()
        long_script = " ".join(
            [
                "స్పోర్ట్స్ అభిమానులారా, ఇవాళ్టి ముఖ్యమైన వార్తలను ఇప్పుడు విపులంగా చూద్దాం.",
                fallback_script,
                *lines,
                "క్రికెట్ నుంచి ఫుట్‌బాల్ వరకు, టెన్నిస్ నుంచి ఒలింపిక్స్ వరకు ఈరోజు ప్రధాన కథనాలు ఇవే.",
                "ఇలాంటివి మరిన్ని అప్‌డేట్స్ కోసం లైక్, షేర్, సబ్స్క్రైబ్ చేయండి.",
            ]
        )

    hashtags = _normalize_hashtags(["#SportsNews", "#CricketNews", "#FootballNews", "#Tennis", "#Olympics"])
    return ContentPackage(
        title=_build_title(chosen),
        description=(
            "Today's biggest sports stories in one professional bulletin.\n\n"
            + "\n".join(summaries)
            + "\n\nsports news, cricket, football, highlights"
            + "\nLike, Share, Subscribe for more daily sports updates."
            + f"\n\n{' '.join(hashtags[:5])}"
        ),
        tags=_merge_tags(
            [
                "sports news",
                "daily sports news",
                "cricket news",
                "football news",
                "tennis news",
                "olympics news",
                "sports highlights",
                "global sports update",
                "sports shorts",
                "youtube sports channel",
            ],
            _normalize_tags(trends),
        )[:15],
        thumbnail_text="SPORTS ALERT",
        hook=lines[0] if lines else fallback_script,
        shorts_script=shorts_script,
        long_script=long_script,
        highlights=lines[:10],
        visual_queries=[item.title for item in chosen[:10]],
        hashtags=hashtags,
        language=language,
        language_label=SUPPORTED_LANGUAGES[language],
    )


def _minimal_content_package(language: str) -> ContentPackage:
    data = fallback_content(language)
    return ContentPackage(
        title=data["title"],
        description=f"{data['script']}\n\nsports news, cricket, football, highlights\nLike, Share, Subscribe.",
        tags=[
            "sports news",
            "cricket news",
            "football news",
            "tennis news",
            "olympics update",
            "sports highlights",
            "daily sports bulletin",
            "global sports news",
            "youtube sports update",
            "breaking sports news",
        ],
        thumbnail_text="SPORTS UPDATE",
        hook=data["script"],
        shorts_script=data["script"],
        long_script=data["script"],
        highlights=[data["script"]],
        visual_queries=["sports news studio headline"],
        hashtags=["#SportsNews", "#SportsUpdate"],
        language=language,
        language_label=SUPPORTED_LANGUAGES[language],
    )


def _build_highlight_line(item: TopicCandidate, language: str) -> str:
    if language == "en":
        return f"{item.title}. {item.summary}".strip()
    return _build_telugu_highlight_line(item)


def _build_telugu_highlight_line(item: TopicCandidate) -> str:
    subject = _topic_subject(item.title)
    category = (item.category or "Sports").lower()
    summary = (item.summary or "").strip()

    if category == "cricket":
        detail = "క్రికెట్ వర్గాల్లో ఈ అప్‌డేట్ ఇప్పుడు బాగా చర్చలో ఉంది."
    elif category == "football":
        detail = "ఫుట్‌బాల్ అభిమానులు ఈ పరిణామాన్ని దగ్గరగా గమనిస్తున్నారు."
    elif category == "tennis":
        detail = "టెన్నిస్ ప్రపంచంలో ఇది ముఖ్యమైన మార్పుగా కనిపిస్తోంది."
    elif category == "olympics":
        detail = "ఒలింపిక్స్ దిశగా ఇది గమనించాల్సిన ముఖ్యమైన అప్‌డేట్."
    else:
        detail = "స్పోర్ట్స్ ప్రపంచంలో ఇది ఇప్పుడు ప్రధాన చర్చగా మారింది."

    summary_hint = _telugu_summary_hint(summary)
    return f"{subject} గురించి కొత్త అప్‌డేట్ వచ్చింది. {detail} {summary_hint}".strip()


def _topic_subject(title: str) -> str:
    cleaned = re.sub(r"\s*-\s*[^-]+$", "", title or "").strip()
    return cleaned or "ఈ వార్త"


def _telugu_summary_hint(summary: str) -> str:
    lowered = (summary or "").lower()
    if any(term in lowered for term in ["injured", "injury", "injured list", "rehab", "shoulder"]):
        return "ఫిట్‌నెస్ మరియు జట్టు ఎంపికలపై దీని ప్రభావం ఉండొచ్చు."
    if any(term in lowered for term in ["won", "beat", "victory", "game 7", "comeback"]):
        return "ఫలితం తర్వాత అభిమానుల్లో చర్చ మరింత పెరిగింది."
    if any(term in lowered for term in ["penalty", "incident", "controversy"]):
        return "ఈ నిర్ణయంపై అభిమానులు మరియు నిపుణులు చర్చిస్తున్నారు."
    if any(term in lowered for term in ["transfer", "trade", "optioned"]):
        return "జట్టు భవిష్యత్ ప్లాన్లపై ఇప్పుడు ఆసక్తి పెరిగింది."
    if any(term in lowered for term in ["media", "criticized", "criticism"]):
        return "జట్టు నిర్వహణపై కూడా ఇప్పుడు ప్రశ్నలు వస్తున్నాయి."
    return "ఇంకా పూర్తి వివరాల కోసం అభిమానులు తదుపరి అప్‌డేట్ కోసం ఎదురుచూస్తున్నారు."


def _build_title(items: list[TopicCandidate]) -> str:
    if not items:
        return "Top Sports News Today | Cricket, Football, Tennis & Olympics"
    primary = items[0].title.split("|")[0].strip()
    return f"Top Sports News Today: {primary[:45]} & More"


def _parse_response_payload(raw_text: str, language: str) -> dict[str, object]:
    cleaned = (raw_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    payload = json.loads(cleaned)
    if not isinstance(payload, dict):
        raise ValueError("Model response was not a JSON object")

    normalized = {key: payload.get(key) for key in EXPECTED_KEYS}
    hashtags = _normalize_hashtags(normalized.get("hashtags"))
    description = _ensure_keywords_and_cta(_as_text(normalized.get("description"), fallback_content(language)["script"]))
    if hashtags:
        description = f"{description}\n\n{' '.join(hashtags[:6])}"

    return {
        "title": _as_text(normalized.get("title"), "Sports Update"),
        "description": description,
        "tags": _normalize_tags(normalized.get("tags")),
        "thumbnail_text": _normalize_thumbnail_text(normalized.get("thumbnail_text")),
        "hook": _as_text(normalized.get("hook"), "Top sports updates are here."),
        "shorts_script": _as_text(normalized.get("shorts_script"), fallback_content(language)["script"]),
        "long_script": _as_text(normalized.get("long_script"), fallback_content(language)["script"]),
        "highlights": _normalize_highlights(normalized.get("highlights")),
        "visual_queries": _normalize_visual_queries(normalized.get("visual_queries")),
        "hashtags": hashtags,
        "language": language,
        "language_label": SUPPORTED_LANGUAGES[language],
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
        "daily sports news",
        "cricket news",
        "football news",
        "tennis news",
        "olympics news",
        "sports highlights",
        "world sports update",
        "sports shorts",
        "breaking sports news",
    ]
    return _merge_tags(raw_tags, fallback_tags)[:15]


def _merge_tags(*groups: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for item in group:
            text = str(item).strip()
            if not text:
                continue
            lowered = text.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            merged.append(text)
    return merged


def _normalize_thumbnail_text(value: object) -> str:
    text = _as_text(value, "BIG SPORTS ALERT")
    return " ".join(text.upper().split()[:4]).strip() or "BIG SPORTS ALERT"


def _normalize_highlights(value: object) -> list[str]:
    if isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
    elif isinstance(value, str):
        items = [line.strip("- ").strip() for line in value.splitlines() if line.strip()]
    else:
        items = []
    return items[:10]


def _normalize_hashtags(value: object) -> list[str]:
    if isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
    elif isinstance(value, str):
        items = [part.strip() for part in value.replace(",", " ").split() if part.strip()]
    else:
        items = []

    normalized: list[str] = []
    seen: set[str] = set()
    for item in items:
        tag = item if item.startswith("#") else f"#{item.replace(' ', '')}"
        lowered = tag.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(tag)
    return normalized[:8]


def _normalize_visual_queries(value: object) -> list[str]:
    if isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
    elif isinstance(value, str):
        items = [line.strip("- ").strip() for line in value.splitlines() if line.strip()]
    else:
        items = []

    fallback = [
        "sports newsroom breaking alert",
        "cricket stadium crowd reaction",
        "football player press conference",
        "tennis player celebration shot",
        "olympic athlete action moment",
    ]
    return (items or fallback)[:10]


def _ensure_keywords_and_cta(description: str) -> str:
    required_line = "sports news, cricket, football, highlights"
    cta_line = "Like, Share, Subscribe"
    updated = description.strip()
    if required_line not in updated:
        updated = f"{updated}\n\n{required_line}".strip()
    if cta_line.lower() not in updated.lower():
        updated = f"{updated}\n{cta_line}".strip()
    return updated
