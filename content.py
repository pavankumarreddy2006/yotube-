from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

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
    "long_script_telugu",
    "highlights_telugu",
    "hashtags",
}


@dataclass
class ContentPackage:
    title: str
    description: str
    tags: list[str]
    thumbnail_text: str
    hook: str
    shorts_script_telugu: str
    long_script_telugu: str
    highlights_telugu: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)

    @property
    def shorts_script(self) -> str:
        return self.shorts_script_telugu

    @property
    def long_script(self) -> str:
        return self.long_script_telugu

    @property
    def thumbnail_idea(self) -> str:
        return "Bold sports thumbnail with strong contrast, player emotion, breaking-news urgency, and Telugu news styling."


SYSTEM_PROMPT = """
You are a professional YouTube sports newsroom producer for a Telugu audience.

Create a DAILY sports bulletin package from multiple fresh sports highlights.

OUTPUT (STRICT JSON ONLY):
{
  "title": "",
  "description": "",
  "tags": [],
  "thumbnail_text": "",
  "hook": "",
  "shorts_script_telugu": "",
  "long_script_telugu": "",
  "highlights_telugu": [],
  "hashtags": []
}

RULES:
1. Voiceover scripts must be fully in natural Telugu.
2. Title, description, tags, and hashtags must be in English.
3. Long script:
   - 650 to 950 Telugu words
   - Cover 5 to 10 sports highlights
   - Energetic sports-news anchor tone
   - Start with a hook, then move through the biggest updates, then end with a closing CTA
4. Shorts script:
   - 30 to 60 seconds
   - Mention 3 to 4 strongest highlights
   - Fast, punchy, highly engaging
5. highlights_telugu:
   - 5 to 10 short Telugu bullet lines
6. Thumbnail text:
   - Max 4 words
   - Uppercase English
   - Breaking-news feel
7. Description:
   - English summary of the bulletin
   - Add hashtags at the end
8. Tags:
   - At least 10 relevant English tags
9. Output JSON only.
""".strip()


def fallback_content() -> dict[str, str]:
    return {
        "title": "Telugu Sports Daily Update",
        "script": (
            "ఈరోజు స్పోర్ట్స్ ప్రపంచంలో ఎన్నో కీలక అప్డేట్లు వచ్చాయి. క్రికెట్, ఫుట్‌బాల్, "
            "అంతర్జాతీయ టోర్నమెంట్లు, స్టార్ ప్లేయర్స్ గురించి ప్రస్తుతం ఫ్యాన్స్ మాట్లాడుకుంటున్నారు."
        ),
    }


def generate_content(
    selected_topic: TopicCandidate,
    scored: ScoredTopic,
    trends: list[str],
    highlights: list[TopicCandidate],
) -> ContentPackage:
    if settings.openai_api_key:
        try:
            return _generate_with_llm(selected_topic, scored, trends, highlights)
        except Exception:
            logging.warning("Using template fallback content")
            logger.exception("LLM generation failed")

    try:
        return _fallback_content(selected_topic, scored, trends, highlights)
    except Exception:
        logger.exception("Template fallback failed")
        return _minimal_content_package()


def _generate_with_llm(
    selected_topic: TopicCandidate,
    scored: ScoredTopic,
    trends: list[str],
    highlights: list[TopicCandidate],
) -> ContentPackage:
    client = OpenAI(api_key=settings.openai_api_key)
    highlight_lines = []
    for index, item in enumerate(highlights[: settings.max_daily_highlights], start=1):
        highlight_lines.append(
            f"{index}. {item.title} | {item.summary} | source={item.source} | published={item.published_at or 'unknown'}"
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
{", ".join(trends[:12]) or "sports news, cricket, football, olympics"}

Create a fact-based daily Telugu sports bulletin for YouTube. Do not invent statistics or scores.
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


def _fallback_content(
    selected_topic: TopicCandidate,
    scored: ScoredTopic,
    trends: list[str],
    highlights: list[TopicCandidate],
) -> ContentPackage:
    del scored
    base = fallback_content()["script"]
    chosen = highlights[: settings.max_daily_highlights] or [selected_topic]
    telugu_lines: list[str] = []
    english_summaries: list[str] = []

    for item in chosen:
        line = _build_telugu_highlight(item)
        telugu_lines.append(line)
        english_summaries.append(f"- {item.title}: {item.summary}")

    top_items = telugu_lines[:4]
    shorts_script_telugu = (
        "హలో స్పోర్ట్స్ ఫ్యాన్స్, ఇవాళ్టి టాప్ స్పోర్ట్స్ అప్డేట్స్ మీ కోసం రెడీగా ఉన్నాయి. "
        + " ".join(top_items)
        + " మరిన్ని ఇలాంటి స్పోర్ట్స్ న్యూస్ కోసం ఛానల్‌ను ఫాలో అవ్వండి."
    ).strip()

    body_segments = [
        "నమస్కారం స్పోర్ట్స్ అభిమానులారా, ఇవాళ ప్రపంచ క్రీడల్లో ట్రెండింగ్‌లో ఉన్న ముఖ్యమైన వార్తలను ఇప్పుడు వివరంగా చూద్దాం.",
    ]
    body_segments.extend(telugu_lines)
    body_segments.append(
        "ఈరోజు మొత్తం స్పోర్ట్స్ ప్రపంచాన్ని చూస్తే క్రికెట్ నుండి ఫుట్‌బాల్ వరకు ప్రతి అప్‌డేట్ కూడా ఫ్యాన్స్‌లో పెద్ద చర్చకు దారి తీసింది."
    )
    body_segments.append(
        "మీకు ఏ అప్‌డేట్ ఎక్కువగా ఆసక్తికరంగా అనిపించిందో కామెంట్స్‌లో చెప్పండి. ఇలాంటి డైలీ తెలుగు స్పోర్ట్స్ బులెటిన్స్ కోసం లైక్, షేర్, సబ్‌స్క్రైబ్ చేయండి."
    )

    description_hashtags = _normalize_hashtags(
        ["#SportsNews", "#CricketNews", "#FootballNews", "#Olympics", "#TeluguSports"]
    )
    trend_tags = _normalize_tags(trends)
    description = (
        "Today's biggest sports stories in one Telugu bulletin.\n\n"
        + "\n".join(english_summaries[:8])
        + "\n\nsports news, cricket, football, highlights"
        + "\nLike, Share, Subscribe for more daily sports updates."
        + f"\n\n{' '.join(description_hashtags[:5])}"
    )

    return ContentPackage(
        title=_build_title(chosen),
        description=description,
        tags=_merge_tags(
            [
                "daily sports news",
                "telugu sports news",
                "cricket news today",
                "football news today",
                "olympics news",
                "sports highlights",
                "breaking sports news",
                "youtube sports update",
            ],
            trend_tags,
        ),
        thumbnail_text="SPORTS NEWS TODAY",
        hook="ఈరోజు స్పోర్ట్స్ ప్రపంచంలో పెద్ద మార్పులు జరిగాయి, టాప్ అప్డేట్స్ ఇప్పుడే చూద్దాం.",
        shorts_script_telugu=shorts_script_telugu,
        long_script_telugu=" ".join(body_segments),
        highlights_telugu=telugu_lines,
        hashtags=description_hashtags,
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
            "breaking sports news",
            "daily sports bulletin",
            "telugu sports news",
            "olympics update",
            "world sports news",
        ],
        thumbnail_text="SPORTS UPDATE",
        hook=data["script"],
        shorts_script_telugu=data["script"],
        long_script_telugu=data["script"],
        highlights_telugu=[data["script"]],
        hashtags=["#SportsNews", "#TeluguSports"],
    )


def _build_telugu_highlight(item: TopicCandidate) -> str:
    tournament = f"{item.tournament}లో " if item.tournament else ""
    score = f" స్కోర్ విషయానికి వస్తే {item.score_details}." if item.score_details else ""
    source = f" ఈ అప్‌డేట్ {item.source} ద్వారా వెలుగులోకి వచ్చింది." if item.source else ""
    return (
        f"{tournament}{item.title} ఇప్పుడు స్పోర్ట్స్ ప్రపంచంలో ప్రధాన చర్చగా మారింది. "
        f"{item.summary}.{score}{source}"
    ).replace("..", ".")


def _build_title(items: list[TopicCandidate]) -> str:
    if not items:
        return "Top Sports News Today | Cricket, Football & More"
    primary = items[0].title.split("|")[0].strip()
    return f"Top Sports News Today: {primary[:45]} & More"


def _parse_response_payload(raw_text: str) -> dict[str, object]:
    cleaned = (raw_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    payload = json.loads(cleaned)
    if not isinstance(payload, dict):
        raise ValueError("Model response was not a JSON object")

    normalized = {key: payload.get(key) for key in EXPECTED_KEYS}
    hashtags = _normalize_hashtags(normalized.get("hashtags"))
    description = _ensure_keywords_and_cta(_as_text(normalized.get("description"), fallback_content()["script"]))
    if hashtags:
        description = f"{description}\n\n{' '.join(hashtags[:6])}"

    return {
        "title": _as_text(normalized.get("title"), "Sports Update"),
        "description": description,
        "tags": _normalize_tags(normalized.get("tags")),
        "thumbnail_text": _normalize_thumbnail_text(normalized.get("thumbnail_text")),
        "hook": _as_text(normalized.get("hook"), "ఈరోజు టాప్ స్పోర్ట్స్ అప్డేట్స్ చూద్దాం."),
        "shorts_script_telugu": _as_text(normalized.get("shorts_script_telugu"), fallback_content()["script"]),
        "long_script_telugu": _as_text(normalized.get("long_script_telugu"), fallback_content()["script"]),
        "highlights_telugu": _normalize_highlights(normalized.get("highlights_telugu")),
        "hashtags": hashtags,
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
        "olympics news",
        "sports highlights",
        "breaking sports news",
        "telugu sports news",
        "world sports update",
        "sports shorts",
    ]
    return _merge_tags(raw_tags, fallback_tags)[:15]


def _merge_tags(*groups: list[str]) -> list[str]:
    merged: list[str] = []
    for group in groups:
        for item in group:
            text = str(item).strip()
            if text and text.lower() not in {existing.lower() for existing in merged}:
                merged.append(text)
    return merged


def _normalize_thumbnail_text(value: object) -> str:
    text = _as_text(value, "BIG SPORTS ALERT")
    words = text.upper().split()
    trimmed = " ".join(words[:4]).strip()
    return trimmed or "BIG SPORTS ALERT"


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
    for item in items:
        tag = item if item.startswith("#") else f"#{item.replace(' ', '')}"
        if tag.lower() not in {existing.lower() for existing in normalized}:
            normalized.append(tag)
    return normalized[:8]


def _ensure_keywords_and_cta(description: str) -> str:
    required_line = "sports news, cricket, football, highlights"
    cta_line = "Like, Share, Subscribe"
    updated = description.strip()
    if required_line not in updated:
        updated = f"{updated}\n\n{required_line}".strip()
    if cta_line.lower() not in updated.lower():
        updated = f"{updated}\n{cta_line}".strip()
    return updated
