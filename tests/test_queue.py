from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import queue_manager
from queue_manager import JobQueueManager


class QueueManagerTests(unittest.TestCase):
    def test_queue_state_persists_job(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            original_queue_file = queue_manager.QUEUE_FILE
            queue_manager.QUEUE_FILE = Path(tmp_dir) / "queue_state.json"
            try:
                manager = JobQueueManager()
                job = manager.enqueue(mode="test", language="en", prompt="demo")
                restored = JobQueueManager()
                snapshot = restored.snapshot()
                self.assertEqual(job["id"], snapshot["queued_jobs"][0]["id"])
            finally:
                queue_manager.QUEUE_FILE = original_queue_file


if __name__ == "__main__":
    unittest.main()
