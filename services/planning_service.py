from __future__ import annotations

import math
import re

from backend.models import RenderFormat, ScenePlan, SubtitleCue, VideoRenderPlan, VoiceoverPlan, WordTiming


def split_sentences(text: str) -> list[str]:
    normalized = " ".join(part.strip() for part in text.splitlines() if part.strip())
    if not normalized:
        return []
    chunks = re.split(r"(?<=[.!?])\s+|[.!?]\s*", normalized)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def build_word_timings(script: str, duration: float) -> list[WordTiming]:
    words = [word for word in re.findall(r"\S+", script) if word.strip()]
    if not words:
        return []
    safe_duration = max(duration, 0.1)
    total_chars = sum(max(len(word), 1) for word in words)
    cursor = 0.0
    timings: list[WordTiming] = []
    for index, word in enumerate(words):
        weight = max(len(word), 1) / total_chars
        slot = safe_duration * weight
        end = safe_duration if index == len(words) - 1 else min(safe_duration, cursor + slot)
        timings.append(WordTiming(word=word, start=round(cursor, 3), end=round(max(end, cursor + 0.01), 3)))
        cursor = end
    return timings


def build_subtitle_cues(lines: list[str], duration: float) -> list[SubtitleCue]:
    if not lines:
        return []
    word_counts = [max(len(re.findall(r"\S+", line)), 1) for line in lines]
    total_words = sum(word_counts)
    safe_duration = max(duration, 0.1)
    cursor = 0.0
    cues: list[SubtitleCue] = []
    for index, line in enumerate(lines, start=1):
        segment = safe_duration * (word_counts[index - 1] / total_words)
        end = safe_duration if index == len(lines) else min(safe_duration, cursor + segment)
        words = re.findall(r"\b[\w'-]+\b", line)
        highlight_count = min(2, len(words))
        cues.append(
            SubtitleCue(
                index=index,
                start=round(cursor, 3),
                end=round(max(end, cursor + 0.2), 3),
                text=line.strip(),
                highlighted_words=words[:highlight_count],
            )
        )
        cursor = end
    return cues


def build_render_plan(
    *,
    script: str,
    duration: float,
    highlights: list[str] | None,
    visual_queries: list[str] | None,
    scene_image_paths: list[str] | None,
    vertical: bool,
    background_image: str = "",
    background_music: str = "",
) -> VideoRenderPlan:
    lines = [line.strip() for line in (highlights or []) if str(line).strip()] or split_sentences(script)
    if not lines:
        raise ValueError("Unable to build render plan without script or highlights")

    visuals = [item.strip() for item in (visual_queries or []) if str(item).strip()]
    cues = build_subtitle_cues(lines, duration)
    scenes: list[ScenePlan] = []
    images = list(scene_image_paths or [])

    for index, cue in enumerate(cues, start=1):
        query = visuals[index - 1] if index - 1 < len(visuals) else cue.text
        emotion = _emotion_from_text(cue.text)
        scenes.append(
            ScenePlan(
                index=index,
                text=cue.text,
                visual_query=query,
                start=cue.start,
                end=cue.end,
                duration=round(max(cue.end - cue.start, 0.2), 3),
                subtitle=cue,
                preferred_image=images[index - 1] if index - 1 < len(images) else "",
                keywords=_keywords_from_text(cue.text),
                transition=_transition_for_scene(index, len(cues), emotion),
                motion_effect=_motion_for_scene(index, emotion),
                visual_style=_visual_style_for_query(query, emotion),
                emotion=emotion,
                overlay_text=_overlay_text(cue.text),
            )
        )

    render_format = RenderFormat(width=1080, height=1920) if vertical else RenderFormat(width=1920, height=1080)
    return VideoRenderPlan(
        format=render_format,
        duration=round(max(duration, 0.1), 3),
        scenes=scenes,
        subtitles=cues,
        voiceover=VoiceoverPlan(script=script, duration=duration, word_timings=build_word_timings(script, duration)),
        background_image=background_image,
        background_music=background_music,
    )


def _keywords_from_text(text: str) -> list[str]:
    words = re.findall(r"\b[\w'-]+\b", text.lower())
    unique: list[str] = []
    for word in words:
        if len(word) < 4:
            continue
        if word not in unique:
            unique.append(word)
    return unique[:5]


def _emotion_from_text(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ["shock", "stun", "upset", "dramatic", "controvers", "collapse"]):
        return "shock"
    if any(term in lowered for term in ["win", "victory", "celebrat", "lifted", "champion"]):
        return "triumph"
    if any(term in lowered for term in ["injury", "miss", "doubt", "setback", "out"]):
        return "concern"
    if any(term in lowered for term in ["transfer", "rumor", "deadline", "talks"]):
        return "speculation"
    return "focused"


def _transition_for_scene(index: int, total: int, emotion: str) -> str:
    if index == 1:
        return "cold_open_flash"
    if index == total:
        return "slow_fade_out"
    if emotion in {"shock", "triumph"}:
        return "impact_whip_pan"
    if emotion == "concern":
        return "dip_to_black"
    return "smooth_cut"


def _motion_for_scene(index: int, emotion: str) -> str:
    if index == 1:
        return "fast_push_in"
    if emotion == "shock":
        return "punch_zoom"
    if emotion == "triumph":
        return "parallax_pan"
    if emotion == "concern":
        return "slow_drift"
    return "ken_burns"


def _visual_style_for_query(query: str, emotion: str) -> str:
    lowered = query.lower()
    if "crowd" in lowered or "stadium" in lowered:
        return "cinematic crowd atmosphere"
    if any(term in lowered for term in ["close-up", "portrait", "reaction"]):
        return "emotional player close-up"
    if any(term in lowered for term in ["scoreboard", "stat", "table"]):
        return "broadcast data overlay"
    if emotion == "shock":
        return "high-contrast breaking news"
    return "sports documentary highlight"


def _overlay_text(text: str) -> str:
    words = re.findall(r"\b[\w'-]+\b", text)
    if not words:
        return ""
    return " ".join(words[:4]).upper()
