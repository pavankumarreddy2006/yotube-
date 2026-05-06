from __future__ import annotations

import unittest

from data import TopicCandidate
from ml_engine.intelligence import (
    DailyLearningState,
    generate_optimization_recommendations,
    rank_content_opportunities,
    simulate_performance_snapshot,
    update_learning_state,
)


class IntelligenceEngineTests(unittest.TestCase):
    def test_opportunity_ranking_prioritizes_high_emotion_trending_story(self) -> None:
        state = DailyLearningState(updated_at="2026-05-06T00:00:00")
        candidates = [
            TopicCandidate(
                title="IPL final thriller shocks fans",
                summary="A last-over finish created huge debate and reactions.",
                source="test",
                topic="IPL final thriller",
                category="Cricket",
                is_thriller=True,
                is_trending=True,
                is_india=True,
                published_at="2026-05-06T08:00:00",
            ),
            TopicCandidate(
                title="Routine training update",
                summary="A quiet team preparation report.",
                source="test",
                topic="training update",
                category="Cricket",
                published_at="2026-05-06T08:00:00",
            ),
        ]
        ranked = rank_content_opportunities(candidates, ["IPL", "final"], state)
        self.assertEqual(ranked[0].topic, "IPL final thriller shocks fans")
        self.assertGreater(ranked[0].total_score, ranked[1].total_score)

    def test_learning_state_updates_rolling_metrics(self) -> None:
        state = DailyLearningState(updated_at="2026-05-06T00:00:00")
        candidates = [
            TopicCandidate(
                title="Virat Kohli rivalry update",
                summary="Fans are debating the latest twist.",
                source="test",
                topic="Virat Kohli rivalry",
                category="Cricket",
                is_trending=True,
                published_at="2026-05-06T08:00:00",
            )
        ]
        opportunities = rank_content_opportunities(candidates, ["Virat Kohli"], state)
        snapshot = simulate_performance_snapshot(
            title="Virat Kohli rivalry update",
            topic="Virat Kohli rivalry update",
            mode="long",
            language="en",
            opportunity=opportunities[0],
        )
        updated = update_learning_state(state, snapshot, opportunities)
        self.assertEqual(updated.runs_analyzed, 1)
        self.assertGreater(updated.rolling_metrics["ctr"], 0.0)
        self.assertTrue(updated.best_topics)
        self.assertTrue(updated.last_recommendations)

    def test_recommendations_flag_low_ctr_and_retention(self) -> None:
        state = DailyLearningState(updated_at="2026-05-06T00:00:00")
        snapshot = simulate_performance_snapshot(
            title="Low performer",
            topic="Low performer",
            mode="short",
            language="en",
            opportunity=None,
        )
        snapshot.ctr = 3.1
        snapshot.retention = 31.0
        recommendations = generate_optimization_recommendations(
            snapshot=snapshot,
            state=state,
            opportunities=[],
        )
        areas = {item.area for item in recommendations}
        self.assertIn("thumbnail", areas)
        self.assertIn("title", areas)
        self.assertIn("retention", areas)


if __name__ == "__main__":
    unittest.main()
