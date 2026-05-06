from __future__ import annotations

import re


SPORTS_ENTITY_ALIASES = {
    "messi": ["messi", "lionel messi"],
    "ronaldo": ["ronaldo", "cristiano ronaldo"],
    "ipl": ["ipl", "indian premier league"],
    "nba": ["nba", "playoffs", "basketball"],
    "stadium": ["stadium", "arena", "crowd"],
    "cricket": ["cricket", "innings", "wicket"],
    "football": ["football", "soccer", "transfer"],
    "tennis": ["tennis", "grand slam", "atp", "wta"],
    "esports": ["esports", "e-sports", "gaming"],
}


class SemanticMediaMatcher:
    def extract_entities(self, text: str) -> list[str]:
        lowered = text.lower()
        matches: list[str] = []
        for label, aliases in SPORTS_ENTITY_ALIASES.items():
            if any(alias in lowered for alias in aliases):
                matches.append(label)
        return matches

    def score_visual_query(self, narration: str, visual_query: str) -> float:
        narration_terms = set(re.findall(r"\b[\w'-]+\b", narration.lower()))
        visual_terms = set(re.findall(r"\b[\w'-]+\b", visual_query.lower()))
        if not narration_terms or not visual_terms:
            return 0.0
        return len(narration_terms & visual_terms) / len(narration_terms | visual_terms)
from .intelligence import (
    DailyLearningState,
    OpportunityScore,
    PerformanceSnapshot,
    build_competitor_insights,
    build_trend_signals,
    generate_optimization_recommendations,
    intelligence_snapshot,
    load_learning_state,
    rank_content_opportunities,
    save_learning_state,
    simulate_performance_snapshot,
    update_learning_state,
)

__all__ = [
    "DailyLearningState",
    "OpportunityScore",
    "PerformanceSnapshot",
    "build_competitor_insights",
    "build_trend_signals",
    "generate_optimization_recommendations",
    "intelligence_snapshot",
    "load_learning_state",
    "rank_content_opportunities",
    "save_learning_state",
    "simulate_performance_snapshot",
    "update_learning_state",
]
