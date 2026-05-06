from __future__ import annotations

import unittest

from content import fallback_content, generate_custom_script


class ContentFallbackTests(unittest.TestCase):
    def test_telugu_fallback_content_is_not_mojibake(self) -> None:
        payload = fallback_content("te")
        self.assertNotIn("à°", payload["title"])
        self.assertNotIn("à°", payload["script"])
        self.assertTrue(payload["title"].strip())
        self.assertTrue(payload["script"].strip())

    def test_english_video_prompt_uses_english_label(self) -> None:
        payload = generate_custom_script(
            "Virat Kohli form analysis",
            language="en",
            include_video_prompt=True,
        )
        self.assertIn("English sports explainer", str(payload["video_prompt"]))
        self.assertNotIn("Telugu sports explainer", str(payload["video_prompt"]))


if __name__ == "__main__":
    unittest.main()
