from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class RenderFormat:
    width: int
    height: int
    fps: int = 24

    @property
    def size(self) -> tuple[int, int]:
        return (self.width, self.height)


@dataclass
class WordTiming:
    word: str
    start: float
    end: float


@dataclass
class SubtitleCue:
    index: int
    start: float
    end: float
    text: str
    highlighted_words: list[str] = field(default_factory=list)


@dataclass
class ScenePlan:
    index: int
    text: str
    visual_query: str
    start: float
    end: float
    duration: float
    subtitle: SubtitleCue
    preferred_image: str = ""
    keywords: list[str] = field(default_factory=list)


@dataclass
class VoiceoverPlan:
    script: str
    duration: float
    word_timings: list[WordTiming] = field(default_factory=list)


@dataclass
class VideoRenderPlan:
    format: RenderFormat
    duration: float
    scenes: list[ScenePlan]
    subtitles: list[SubtitleCue]
    voiceover: VoiceoverPlan
    background_image: str = ""
    background_music: str = ""


@dataclass
class PipelineArtifacts:
    work_dir: Path
    audio_path: str | None = None
    video_path: str | None = None
    thumbnail_path: str | None = None
    subtitles_path: str | None = None
