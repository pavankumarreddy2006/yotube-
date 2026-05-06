from __future__ import annotations

import unittest

from services.planning_service import build_render_plan, build_subtitle_cues, build_word_timings


class PlanningServiceTests(unittest.TestCase):
    def test_word_timings_cover_full_duration(self) -> None:
        timings = build_word_timings("Messi wins again in a dramatic final", 7.5)
        self.assertTrue(timings)
        self.assertEqual(timings[0].start, 0.0)
        self.assertAlmostEqual(timings[-1].end, 7.5, places=2)

    def test_subtitle_cues_are_sequential(self) -> None:
        cues = build_subtitle_cues(["First line", "Second line", "Third line"], 9.0)
        self.assertEqual(len(cues), 3)
        self.assertEqual(cues[0].start, 0.0)
        self.assertGreaterEqual(cues[1].start, cues[0].end)
        self.assertAlmostEqual(cues[-1].end, 9.0, places=2)

    def test_render_plan_matches_scene_count(self) -> None:
        plan = build_render_plan(
            script="Messi scored. The crowd erupted. Argentina celebrated.",
            duration=12.0,
            highlights=["Messi scored", "Crowd erupted", "Argentina celebrated"],
            visual_queries=["Messi close-up", "stadium crowd", "Argentina team"],
            scene_image_paths=[],
            vertical=True,
        )
        self.assertEqual(len(plan.scenes), 3)
        self.assertEqual(len(plan.subtitles), 3)
        self.assertEqual(plan.format.size, (1080, 1920))
        self.assertAlmostEqual(plan.duration, 12.0, places=2)
        self.assertTrue(plan.scenes[0].transition)
        self.assertTrue(plan.scenes[0].motion_effect)
        self.assertTrue(plan.scenes[0].emotion)


if __name__ == "__main__":
    unittest.main()
