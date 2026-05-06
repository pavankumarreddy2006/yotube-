from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Any

from data import TopicCandidate
from settings import OUTPUT_DIR
from utils import dump_json, load_json


LEARNING_STATE_FILE = OUTPUT_DIR / "learning_state.json"


@dataclass
class TrendSignal:
    source: str
    label: str
    signal_type: str
    momentum: float
    confidence: float
    observed_at: str
    notes: str = ""


@dataclass
class CompetitorInsight:
    channel: str
    niche: str
    hook_style: str
    thumbnail_pattern: str
    pacing_style: str
    title_pattern: str
    posting_frequency: str
    audience_psychology: str
    confidence: float = 0.5


@dataclass
class OpportunityScore:
    topic: str
    category: str
    viral_score: float
    ctr_score: float
    retention_score: float
    seo_score: float
    freshness_score: float
    emotion_score: float
    competition_score: float
    total_score: float
    reasons: list[str] = field(default_factory=list)
    recommended_format: str = "long"
    upload_window: str = "18:00-21:00"


@dataclass
class PerformanceSnapshot:
    created_at: str
    title: str
    topic: str
    mode: str
    language: str
    ctr: float
    avg_view_duration: float
    retention: float
    engagement_rate: float
    likes: int
    comments: int
    shares: int
    impressions: int
    watch_time_minutes: float
    dropoff_points: list[str] = field(default_factory=list)


@dataclass
class OptimizationRecommendation:
    area: str
    action: str
    reason: str
    priority: str
    expected_impact: str


@dataclass
class DailyLearningState:
    updated_at: str
    runs_analyzed: int = 0
    preferred_formats: list[str] = field(default_factory=lambda: ["short", "long"])
    best_topics: list[str] = field(default_factory=list)
    best_title_patterns: list[str] = field(default_factory=list)
    best_thumbnail_patterns: list[str] = field(default_factory=list)
    best_hook_patterns: list[str] = field(default_factory=list)
    best_upload_windows: list[str] = field(default_factory=lambda: ["18:00-21:00"])
    target_metrics: dict[str, float] = field(
        default_factory=lambda: {
            "ctr": 7.5,
            "retention": 48.0,
            "engagement_rate": 5.0,
            "avg_view_duration": 95.0,
        }
    )
    rolling_metrics: dict[str, float] = field(
        default_factory=lambda: {
            "ctr": 0.0,
            "retention": 0.0,
            "engagement_rate": 0.0,
            "avg_view_duration": 0.0,
        }
    )
    experimentation_budget: dict[str, int] = field(
        default_factory=lambda: {
            "thumbnail_variants": 2,
            "title_variants": 3,
            "hook_variants": 2,
        }
    )
    last_recommendations: list[dict[str, Any]] = field(default_factory=list)
    history: list[dict[str, Any]] = field(default_factory=list)

    def to_public_dict(self) -> dict[str, Any]:
        return asdict(self)


def load_learning_state() -> DailyLearningState:
    payload = load_json(LEARNING_STATE_FILE, default={}) or {}
    if not isinstance(payload, dict):
        payload = {}
    merged = {
        **asdict(DailyLearningState(updated_at=_now())),
        **payload,
    }
    return DailyLearningState(**merged)


def save_learning_state(state: DailyLearningState) -> DailyLearningState:
    normalized = DailyLearningState(**asdict(state))
    dump_json(asdict(normalized), LEARNING_STATE_FILE)
    return normalized


def build_trend_signals(candidates: list[TopicCandidate], trends: list[str]) -> list[TrendSignal]:
    observed_at = _now()
    signals: list[TrendSignal] = []
    for term in trends[:8]:
        related_items = [item for item in candidates if term.lower() in f"{item.title} {item.summary} {item.topic}".lower()]
        momentum = min(100.0, 35.0 + (len(related_items) * 12.0))
        confidence = 0.85 if related_items else 0.55
        signals.append(
            TrendSignal(
                source="trend-engine",
                label=term,
                signal_type="search_momentum",
                momentum=round(momentum, 1),
                confidence=confidence,
                observed_at=observed_at,
                notes=f"{len(related_items)} matching content candidates.",
            )
        )
    for candidate in candidates[:5]:
        if not candidate.is_trending and not candidate.is_thriller:
            continue
        signals.append(
            TrendSignal(
                source=candidate.source,
                label=candidate.title,
                signal_type="viral_candidate",
                momentum=round(60 + (10 if candidate.is_trending else 0) + (12 if candidate.is_thriller else 0), 1),
                confidence=0.78,
                observed_at=observed_at,
                notes=candidate.summary[:180],
            )
        )
    return signals[:12]


def build_competitor_insights() -> list[CompetitorInsight]:
    return [
        CompetitorInsight(
            channel="SportsCenter",
            niche="Global sports highlights",
            hook_style="Start with the biggest twist before explaining context.",
            thumbnail_pattern="Single hero athlete plus bold contrast headline.",
            pacing_style="Fast first 20 seconds, then alternating recap and payoff beats.",
            title_pattern="Curiosity-led headline anchored on the star player or controversy.",
            posting_frequency="Multiple times daily around live events.",
            audience_psychology="Fans want instant stakes, emotion, and what-happens-next clarity.",
            confidence=0.74,
        ),
        CompetitorInsight(
            channel="ESPN FC",
            niche="Football reactions and debates",
            hook_style="Lead with strong opinion or rivalry tension.",
            thumbnail_pattern="Face reaction plus club badge or transfer visual.",
            pacing_style="Rapid opinion framing followed by short debate segments.",
            title_pattern="Player name + change/twist + direct consequence.",
            posting_frequency="High frequency during transfer windows and matchdays.",
            audience_psychology="Audience stays for conflict, credibility, and quick takeaways.",
            confidence=0.72,
        ),
        CompetitorInsight(
            channel="Cricbuzz",
            niche="Cricket match analysis",
            hook_style="Immediate scoreboard stakes and player pressure.",
            thumbnail_pattern="Action frame with score context and emotionally loaded text.",
            pacing_style="Hook, turning point, tactical explanation, emotional finish.",
            title_pattern="Match moment + player impact + why it matters.",
            posting_frequency="Daily and event-driven during tournaments.",
            audience_psychology="Cricket fans reward clarity, match tension, and future implications.",
            confidence=0.76,
        ),
    ]


def rank_content_opportunities(
    candidates: list[TopicCandidate],
    trends: list[str],
    learning_state: DailyLearningState,
) -> list[OpportunityScore]:
    ranked: list[OpportunityScore] = []
    trend_lookup = {item.lower() for item in trends}
    for candidate in candidates:
        haystack = f"{candidate.title} {candidate.summary} {candidate.topic}".lower()
        freshness = 92.0 if candidate.published_at else 68.0
        emotion = 55.0
        reasons: list[str] = []
        if candidate.is_thriller:
            emotion += 20.0
            reasons.append("high-drama sports angle")
        if candidate.is_india:
            emotion += 10.0
            reasons.append("strong fan-base relevance")
        if candidate.is_trending or any(term in haystack for term in trend_lookup):
            freshness += 5.0
            reasons.append("active trend alignment")
        if any(word in haystack for word in ["controvers", "shock", "transfer", "final", "injury", "rivalry"]):
            emotion += 10.0
            reasons.append("curiosity and emotional tension")

        ctr_score = min(100.0, 45.0 + (emotion * 0.35) + (8.0 if candidate.players else 0.0))
        retention_score = min(100.0, 42.0 + (12.0 if candidate.score_details else 0.0) + (10.0 if candidate.is_thriller else 0.0))
        seo_score = min(100.0, 48.0 + (10.0 if candidate.category in {"Cricket", "Football", "NBA", "Tennis", "UFC", "eSports"} else 0.0) + (6.0 if candidate.players else 0.0))
        competition_score = 66.0 if candidate.category in {"Cricket", "Football"} else 58.0
        viral_score = round((ctr_score * 0.28) + (retention_score * 0.26) + (freshness * 0.18) + (emotion * 0.18) + (seo_score * 0.1), 2)
        total_score = round((viral_score * 0.4) + (competition_score * 0.1) + (retention_score * 0.2) + (ctr_score * 0.2) + (seo_score * 0.1), 2)

        preferred_long = learning_state.rolling_metrics.get("avg_view_duration", 0.0) >= 75.0
        recommended_format = "long" if preferred_long and retention_score >= 55.0 else "short"
        upload_window = learning_state.best_upload_windows[0] if learning_state.best_upload_windows else "18:00-21:00"
        ranked.append(
            OpportunityScore(
                topic=candidate.title,
                category=candidate.category,
                viral_score=viral_score,
                ctr_score=round(ctr_score, 2),
                retention_score=round(retention_score, 2),
                seo_score=round(seo_score, 2),
                freshness_score=round(freshness, 2),
                emotion_score=round(emotion, 2),
                competition_score=round(competition_score, 2),
                total_score=total_score,
                reasons=reasons or ["broad sports interest"],
                recommended_format=recommended_format,
                upload_window=upload_window,
            )
        )
    return sorted(ranked, key=lambda item: item.total_score, reverse=True)[:12]


def simulate_performance_snapshot(
    *,
    title: str,
    topic: str,
    mode: str,
    language: str,
    opportunity: OpportunityScore | None = None,
) -> PerformanceSnapshot:
    base_ctr = 4.6
    base_retention = 39.0
    base_engagement = 3.2
    boost = (opportunity.total_score / 100.0) if opportunity else 0.6
    ctr = round(base_ctr + (boost * 4.5), 2)
    retention = round(base_retention + (boost * 22.0), 2)
    avg_view_duration = round((42.0 if mode == "short" else 96.0) + (boost * 18.0), 2)
    engagement = round(base_engagement + (boost * 3.8), 2)
    impressions = 1800 + int(boost * 4200)
    likes = max(8, int(impressions * 0.025))
    comments = max(3, int(impressions * 0.006))
    shares = max(1, int(impressions * 0.002))
    watch_time = round((avg_view_duration * impressions * 0.18) / 60.0, 2)
    dropoff_points = [
        "0:00-0:05 needs stronger curiosity hook",
        "0:25-0:40 visual refresh should be faster",
    ]
    if mode == "long":
        dropoff_points.append("1:10-1:35 needs a mid-video payoff or stat reveal")
    return PerformanceSnapshot(
        created_at=_now(),
        title=title,
        topic=topic,
        mode=mode,
        language=language,
        ctr=ctr,
        avg_view_duration=avg_view_duration,
        retention=retention,
        engagement_rate=engagement,
        likes=likes,
        comments=comments,
        shares=shares,
        impressions=impressions,
        watch_time_minutes=watch_time,
        dropoff_points=dropoff_points,
    )


def update_learning_state(
    state: DailyLearningState,
    snapshot: PerformanceSnapshot,
    opportunities: list[OpportunityScore],
) -> DailyLearningState:
    history = list(state.history)
    history.append(asdict(snapshot))
    recent = history[-14:]
    ctrs = [float(item.get("ctr", 0.0)) for item in recent]
    retentions = [float(item.get("retention", 0.0)) for item in recent]
    engagements = [float(item.get("engagement_rate", 0.0)) for item in recent]
    durations = [float(item.get("avg_view_duration", 0.0)) for item in recent]

    best_topics = [item.topic for item in opportunities[:5]]
    title_patterns = [
        "Player + twist + consequence",
        "Breaking update + emotional stake",
        "What changed + why fans care",
    ]
    thumbnail_patterns = [
        "Hero face + action frame + 3-word emotional text",
        "Score context + reaction face + bright contrast",
    ]
    hook_patterns = [
        "Start with the surprise, not the setup",
        "Reveal stakes in the first 5 seconds",
    ]

    recommendations = generate_optimization_recommendations(
        snapshot=snapshot,
        state=state,
        opportunities=opportunities,
    )
    return DailyLearningState(
        updated_at=_now(),
        runs_analyzed=state.runs_analyzed + 1,
        preferred_formats=["long", "short"] if snapshot.avg_view_duration >= 80 else ["short", "long"],
        best_topics=best_topics,
        best_title_patterns=title_patterns,
        best_thumbnail_patterns=thumbnail_patterns,
        best_hook_patterns=hook_patterns,
        best_upload_windows=["18:00-21:00", "12:00-14:00"],
        target_metrics=state.target_metrics,
        rolling_metrics={
            "ctr": round(mean(ctrs), 2) if ctrs else 0.0,
            "retention": round(mean(retentions), 2) if retentions else 0.0,
            "engagement_rate": round(mean(engagements), 2) if engagements else 0.0,
            "avg_view_duration": round(mean(durations), 2) if durations else 0.0,
        },
        experimentation_budget=state.experimentation_budget,
        last_recommendations=[asdict(item) for item in recommendations],
        history=recent,
    )


def generate_optimization_recommendations(
    *,
    snapshot: PerformanceSnapshot,
    state: DailyLearningState,
    opportunities: list[OpportunityScore],
) -> list[OptimizationRecommendation]:
    recommendations: list[OptimizationRecommendation] = []
    target_ctr = float(state.target_metrics.get("ctr", 7.5))
    target_retention = float(state.target_metrics.get("retention", 48.0))

    if snapshot.ctr < target_ctr:
        recommendations.append(
            OptimizationRecommendation(
                area="thumbnail",
                action="Increase emotional contrast and simplify text to 2-4 words.",
                reason=f"CTR {snapshot.ctr}% is below the current target of {target_ctr}%.",
                priority="high",
                expected_impact="Higher click-through from browse and suggested traffic.",
            )
        )
        recommendations.append(
            OptimizationRecommendation(
                area="title",
                action="Lead titles with the player, rivalry, or breaking twist before the broader context.",
                reason="Title structure is likely diluting curiosity in the first visible words.",
                priority="high",
                expected_impact="Better CTR and recommendation pickup.",
            )
        )

    if snapshot.retention < target_retention:
        recommendations.append(
            OptimizationRecommendation(
                area="retention",
                action="Move the strongest payoff into the first 20 seconds and add a visual refresh every 3-5 seconds.",
                reason=f"Retention {snapshot.retention}% is below the current target of {target_retention}%.",
                priority="high",
                expected_impact="Reduced early dropoff and longer watch time.",
            )
        )

    if snapshot.engagement_rate < float(state.target_metrics.get("engagement_rate", 5.0)):
        recommendations.append(
            OptimizationRecommendation(
                area="engagement",
                action="End with a sharper debate prompt tied to a player decision, controversy, or next-match prediction.",
                reason="Engagement is lagging, which suggests the videos need stronger conversational prompts.",
                priority="medium",
                expected_impact="More comments, shares, and return viewers.",
            )
        )

    top_opportunity = opportunities[0] if opportunities else None
    if top_opportunity:
        recommendations.append(
            OptimizationRecommendation(
                area="strategy",
                action=f"Prioritize {top_opportunity.recommended_format}-form coverage around '{top_opportunity.topic}' during {top_opportunity.upload_window}.",
                reason="Current ranking engine sees this as the strongest near-term growth opportunity.",
                priority="high",
                expected_impact="Better alignment with trend momentum and fan curiosity.",
            )
        )
    return recommendations[:6]


def intelligence_snapshot(
    *,
    candidates: list[TopicCandidate],
    trends: list[str],
    latest_run: dict[str, Any] | None = None,
) -> dict[str, Any]:
    state = load_learning_state()
    opportunities = rank_content_opportunities(candidates, trends, state)
    trend_signals = build_trend_signals(candidates, trends)
    recommendations = [
        OptimizationRecommendation(**item)
        for item in state.last_recommendations
        if isinstance(item, dict)
    ]
    latest_run = latest_run or {}
    return {
        "updated_at": _now(),
        "trend_signals": [asdict(item) for item in trend_signals],
        "competitor_insights": [asdict(item) for item in build_competitor_insights()],
        "opportunities": [asdict(item) for item in opportunities],
        "recommendations": [asdict(item) for item in recommendations],
        "learning_state": asdict(state),
        "latest_topic": _latest_topic_label(latest_run),
    }


def _now() -> str:
    return datetime.now().isoformat()


def _latest_topic_label(latest_run: dict[str, Any]) -> str:
    title = latest_run.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()
    selected_topic = latest_run.get("selected_topic")
    if isinstance(selected_topic, dict):
        return str(selected_topic.get("title", "")).strip()
    if isinstance(selected_topic, str):
        return selected_topic.strip()
    return ""
