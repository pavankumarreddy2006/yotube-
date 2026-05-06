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
        "title": "E roju sports update",
        "script": (
            "Idi meeru nammaleni vishayam. "
            "E roju sports prapanchamlo konni pedda marpulu jarigayi. "
            "Ippudu asalu vishayam chuddam. "
            "Cricket nunchi football varaku abhimanulu maatladutunna mukhyamaina vaarthalu meeku simple ga cheppabotunnam. "
            "Chivari varaku chudandi, chivarilo unna update mottham kathanu marchesstundi."
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
            f"{topic} gurinchi idi meeru nammaleni vishayam. "
            "Ippudu asalu vishayam chuddam. "
            "Em jarigindi, adi enduku mukhyamo, taruvata em jaragochcho chaala simple Telugu lo chuseddam."
        )

    return _normalize_custom_script_payload(
        {
            "title": title,
            "script": script,
            "language": normalized_language,
            "language_label": language_label,
            "video_prompt": (
                f"Create a professional {'vertical' if include_video_prompt else 'wide'} {language_label} sports explainer with matching visuals for {topic}."
                if include_video_prompt
                else ""
            ),
            "hook": _split_sentences(script)[0] if _split_sentences(script) else script,
            "research": _fallback_research_points(topic, normalized_language),
            "scene_breakdown": _fallback_scene_breakdown(script, normalized_language),
            "subtitle_timing": _fallback_subtitle_timing(script),
            "thumbnail_strategy": _fallback_thumbnail_strategy(topic, normalized_language),
            "title_options": _fallback_title_options(topic, normalized_language),
            "engagement_score": 78,
            "retention_score": 74,
            "viral_angle": _fallback_viral_angle(topic, normalized_language),
            "mode": "custom",
        },
        include_video_prompt=include_video_prompt,
        topic=topic,
    )


def normalize_language(language: str | None) -> str:
    candidate = (language or settings.default_language or "te").strip().lower()
    return candidate if candidate in SUPPORTED_LANGUAGES else "te"


def _system_prompt(language: str) -> str:
    language_label = SUPPORTED_LANGUAGES[language]
    script_rule = f"All narration, hooks, scene lines, and highlights must be fully in natural {language_label}."
    return f"""
You are a top-tier {language_label} YouTube producer building a polished, high-retention sports video package.

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
You are an AI sports media production studio.

Create a deeply engaging YouTube-ready sports package in {language_label} about: {topic}

Return strict JSON with these keys only:
title, script, hook, research, scene_breakdown, subtitle_timing, thumbnail_strategy, title_options, video_prompt, viral_angle, engagement_score, retention_score

Rules:
- Sound human, emotional, cinematic, and conversational.
- Do not invent scores, stats, quotes, or injuries.
- The first 5 seconds must create curiosity.
- Script structure: hook, context, main story, emotional build-up, ending, CTA.
- Script should be visually mappable scene by scene.
- research must be an array of 4 to 6 concise verified-angle bullets about what matters in the story.
- scene_breakdown must be an array of 5 to 8 objects with keys:
  scene_number, narration, visual, transition, motion, emotion, duration_seconds
- subtitle_timing must be an array of 5 to 8 objects with keys:
  start, end, text, emphasis
- thumbnail_strategy must be an object with keys:
  text, layout, focal_subject, color_strategy, emotion
- title_options must be an array of 3 strong YouTube title options.
- viral_angle must explain why fans will care right now.
- engagement_score and retention_score must be integers from 1 to 100.
- video_prompt must describe a production-ready visual brief.
""".strip()
    def operation() -> dict[str, object]:
        response = client.responses.create(model=settings.openai_model, input=prompt)
        text = response.output_text.strip()
        match = re.search(r"\{.*\}", text, flags=re.S)
        payload = json.loads(match.group(0) if match else text)
        payload["language"] = language
        payload["language_label"] = language_label
        return _normalize_custom_script_payload(payload, include_video_prompt=include_video_prompt, topic=topic)

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
        thumbnail_text="SHOCK NEWS" if language == "te" else "SPORTS SHOCK",
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
        thumbnail_text="SHOCK UPDATE" if language == "te" else "SPORTS UPDATE",
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


def _normalize_custom_script_payload(
    payload: dict[str, object],
    *,
    include_video_prompt: bool,
    topic: str | None = None,
) -> dict[str, object]:
    script = str(payload.get("script", "")).strip()
    title = str(payload.get("title", "")).strip() or f"{(topic or 'Sports Topic').strip()[:70]} Breakdown"
    language = normalize_language(str(payload.get("language", "")).strip() or None)
    language_label = SUPPORTED_LANGUAGES[language]
    hook = str(payload.get("hook", "")).strip() or (_split_sentences(script)[0] if script else "")
    research = [str(item).strip() for item in payload.get("research", []) if str(item).strip()]
    scene_breakdown = _normalize_scene_breakdown(payload.get("scene_breakdown"), script, language)
    subtitle_timing = _normalize_subtitle_timing(payload.get("subtitle_timing"), scene_breakdown)
    thumbnail_strategy = _normalize_thumbnail_strategy(payload.get("thumbnail_strategy"), topic or title, language)
    title_options = [str(item).strip() for item in payload.get("title_options", []) if str(item).strip()][:3]
    if not title_options:
        title_options = _fallback_title_options(topic or title, language)
    video_prompt = str(payload.get("video_prompt", "")).strip()
    if include_video_prompt and not video_prompt:
        video_prompt = f"Create a cinematic sports explainer with accurate visuals, emotional pacing, subtitles, and thumbnail-ready hero frames for {topic or title}."
    engagement_score = _bounded_score(payload.get("engagement_score"), default=78)
    retention_score = _bounded_score(payload.get("retention_score"), default=74)
    viral_angle = str(payload.get("viral_angle", "")).strip() or _fallback_viral_angle(topic or title, language)

    return {
        "title": title,
        "script": script,
        "hook": hook,
        "research": research or _fallback_research_points(topic or title, language),
        "scene_breakdown": scene_breakdown,
        "subtitle_timing": subtitle_timing,
        "thumbnail_strategy": thumbnail_strategy,
        "title_options": title_options,
        "video_prompt": video_prompt,
        "viral_angle": viral_angle,
        "engagement_score": engagement_score,
        "retention_score": retention_score,
        "language": language,
        "language_label": language_label,
        "mode": "custom",
    }


def _normalize_scene_breakdown(value: object, script: str, language: str) -> list[dict[str, object]]:
    if isinstance(value, list):
        normalized: list[dict[str, object]] = []
        for index, item in enumerate(value, start=1):
            if not isinstance(item, dict):
                continue
            narration = str(item.get("narration", "")).strip()
            if not narration:
                continue
            normalized.append(
                {
                    "scene_number": int(item.get("scene_number", index)),
                    "narration": narration,
                    "visual": str(item.get("visual", "")).strip() or narration,
                    "transition": str(item.get("transition", "")).strip() or "smooth_cut",
                    "motion": str(item.get("motion", "")).strip() or "ken_burns",
                    "emotion": str(item.get("emotion", "")).strip() or "focused",
                    "duration_seconds": max(float(item.get("duration_seconds", 4.0)), 1.5),
                }
            )
        if normalized:
            return normalized[:8]
    return _fallback_scene_breakdown(script, language)


def _normalize_subtitle_timing(value: object, scene_breakdown: list[dict[str, object]]) -> list[dict[str, object]]:
    if isinstance(value, list):
        normalized: list[dict[str, object]] = []
        for item in value:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            start = round(max(float(item.get("start", 0.0)), 0.0), 2)
            end = round(max(float(item.get("end", start + 1.5)), start + 0.5), 2)
            normalized.append(
                {
                    "start": start,
                    "end": end,
                    "text": text,
                    "emphasis": str(item.get("emphasis", "")).strip() or text.split()[0].upper(),
                }
            )
        if normalized:
            return normalized[:8]

    cursor = 0.0
    fallback: list[dict[str, object]] = []
    for item in scene_breakdown:
        duration = float(item.get("duration_seconds", 4.0))
        text = str(item.get("narration", "")).strip()
        fallback.append(
            {
                "start": round(cursor, 2),
                "end": round(cursor + duration, 2),
                "text": text,
                "emphasis": str(item.get("emotion", "focused")).upper(),
            }
        )
        cursor += duration
    return fallback[:8]


def _normalize_thumbnail_strategy(value: object, topic: str, language: str) -> dict[str, str]:
    if isinstance(value, dict):
        return {
            "text": str(value.get("text", "")).strip() or ("SHOCK NEWS" if language == "te" else "SPORTS SHOCK"),
            "layout": str(value.get("layout", "")).strip() or "Hero face on left, explosive action on right, bold text at bottom.",
            "focal_subject": str(value.get("focal_subject", "")).strip() or topic,
            "color_strategy": str(value.get("color_strategy", "")).strip() or "High contrast red, yellow, and white over a dark sports backdrop.",
            "emotion": str(value.get("emotion", "")).strip() or "urgent",
        }
    return _fallback_thumbnail_strategy(topic, language)


def _bounded_score(value: object, *, default: int) -> int:
    try:
        score = int(float(value))
    except Exception:
        return default
    return max(1, min(score, 100))


def _fallback_research_points(topic: str, language: str) -> list[str]:
    if language == "en":
        return [
            f"The core story around {topic} needs a clear timeline so viewers instantly understand what changed.",
            "Fans care most about the competitive stakes, not just the headline.",
            "Recent form, pressure, and momentum are the strongest emotional levers for retention.",
            "Any controversy, injury doubt, or tactical twist should be framed carefully unless verified.",
            "The payoff should answer what this means next for the player, team, or tournament.",
        ]
    return [
        f"{topic} story lo actual ga em jarigindo clear timeline tho cheppali.",
        "Headline kanna match stakes mariyu fans reaction ekkuva important.",
        "Recent form, pressure, momentum valla story ki emotion perugutundi.",
        "Controversy leda injury angle unte verify ayina vati matrame vadali.",
        "End lo next impact enti ane point clear ga undali.",
    ]


def _fallback_scene_breakdown(script: str, language: str) -> list[dict[str, object]]:
    del language
    lines = _split_sentences(script)[:6] or ([script] if script else [])
    emotions = ["shock", "focused", "focused", "hype", "triumph", "resolve"]
    visuals = [
        "breaking sports intro with headline graphics",
        "player close-up or team training footage",
        "match action or tactical replay visual",
        "crowd reaction and scoreboard overlay",
        "celebration or pressure moment montage",
        "closing hero frame with channel branding",
    ]
    scenes: list[dict[str, object]] = []
    for index, line in enumerate(lines, start=1):
        scenes.append(
            {
                "scene_number": index,
                "narration": line,
                "visual": visuals[min(index - 1, len(visuals) - 1)],
                "transition": "cold_open_flash" if index == 1 else ("slow_fade_out" if index == len(lines) else "smooth_cut"),
                "motion": "fast_push_in" if index == 1 else ("parallax_pan" if index % 2 == 0 else "ken_burns"),
                "emotion": emotions[min(index - 1, len(emotions) - 1)],
                "duration_seconds": 3.5 if index == 1 else 4.0,
            }
        )
    return scenes


def _fallback_subtitle_timing(script: str) -> list[dict[str, object]]:
    scenes = _fallback_scene_breakdown(script, "en")
    return _normalize_subtitle_timing([], scenes)


def _fallback_thumbnail_strategy(topic: str, language: str) -> dict[str, str]:
    return {
        "text": "SHOCK NEWS" if language == "te" else "SPORTS SHOCK",
        "layout": "Emotional face on one side, decisive sports action on the other, oversized text in the lower third.",
        "focal_subject": topic,
        "color_strategy": "Use dark contrast with red, yellow, and white accents so the thumbnail stays readable on mobile.",
        "emotion": "high urgency",
    }


def _fallback_title_options(topic: str, language: str) -> list[str]:
    base = topic.strip() or "Sports Story"
    if language == "te":
        return [
            f"{base}: Fans Ni Shock Chesina Twist",
            f"{base}: Match Story Lo Biggest Turning Point",
            f"{base}: Ippude Andaru Matladutunna Reason",
        ]
    return [
        f"{base}: The Twist Fans Did Not See Coming",
        f"What Really Changed In {base}",
        f"{base}: The Story Everyone Is Talking About",
    ]


def _fallback_viral_angle(topic: str, language: str) -> str:
    if language == "te":
        return f"{topic} lo immediate emotion, debate, mariyu what-happens-next curiosity strong ga untayi."
    return f"{topic} has built-in fan emotion, debate potential, and a strong what-happens-next hook."
