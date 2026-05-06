from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import app as app_module

app = app_module.app


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_dashboard_state_endpoint(self) -> None:
        response = self.client.get("/dashboard-state")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("status", payload)
        self.assertIn("queue", payload["status"])

    def test_analytics_endpoint(self) -> None:
        response = self.client.get("/analytics")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("status", payload)
        self.assertIn("queue", payload)

    def test_generate_video_alias_queues_job(self) -> None:
        with patch.object(app_module, "_launch_pipeline", return_value={"status": "queued", "job_id": "job-test", "mode": "test", "language": "en"}):
            response = self.client.post("/generate-video", json={"mode": "test", "language": "en", "prompt": ""})
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["status"], "queued")
            self.assertEqual(payload["job_id"], "job-test")

    def test_ask_ai_returns_production_brief(self) -> None:
        response = self.client.post("/ask-ai", json={"topic": "Virat Kohli form analysis", "language": "en", "mode": "full"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("script", payload)
        self.assertIn("scene_breakdown", payload)
        self.assertIn("subtitle_timing", payload)
        self.assertIn("thumbnail_strategy", payload)
        self.assertIn("engagement_score", payload)
        self.assertTrue(payload["scene_breakdown"])


if __name__ == "__main__":
    unittest.main()
