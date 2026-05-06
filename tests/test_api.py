from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app import app


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

    def test_generate_video_alias_queues_job(self) -> None:
        response = self.client.post("/generate-video", json={"mode": "test", "language": "en", "prompt": ""})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "queued")
        self.assertIn("job_id", payload)


if __name__ == "__main__":
    unittest.main()
