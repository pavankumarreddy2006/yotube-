from __future__ import annotations

from dataclasses import dataclass, field

from data import TopicCandidate


@dataclass
class ScoredTopic:
    candidate: TopicCandidate
    score: int
    decision: str
    reasons: list[str] = field(default_factory=list)


def score_candidate(candidate: TopicCandidate) -> ScoredTopic:
    score = 0
    reasons: list[str] = []
    combined = f"{candidate.title} {candidate.summary} {candidate.tournament}".lower()

    if candidate.is_india:
        score += 3
        reasons.append("India-related")
    if candidate.is_thriller:
        score += 3
        reasons.append("Last-over/thriller energy")
    if "ipl" in combined or "world cup" in combined or candidate.tournament:
        score += 2
        reasons.append("Tournament angle")
    if candidate.is_trending:
        score += 2
        reasons.append("Trending topic")
    if candidate.players:
        score += 1
        reasons.append("Popular player present")

    if score >= 8:
        decision = "FULL"
    elif score >= 5:
        decision = "SHORT"
    else:
        decision = "SKIP"

    return ScoredTopic(candidate=candidate, score=score, decision=decision, reasons=reasons)


def choose_best_topic(candidates: list[TopicCandidate]) -> ScoredTopic:
    scored = [score_candidate(candidate) for candidate in candidates]
    scored.sort(key=lambda item: item.score, reverse=True)
    return scored[0]
