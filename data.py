from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import requests
from pytrends.request import TrendReq

from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)


SPORTS_KEYWORDS = [
    "IPL",
    "India cricket",
    "Virat Kohli",
    "Rohit Sharma",
    "MS Dhoni",
    "Telugu sports",
    "cricket score",
    "football transfer",
]


FALLBACK_STORIES = [
    {
        "title": "భారత్ జట్టు తర్వాతి మ్యాచ్ కోసం భారీ అంచనాలు",
        "summary": "టీమ్ ఇండియా ఫామ్, కీలక ప్లేయర్లు, ఫ్యాన్స్ ఎక్స్‌పెక్టేషన్స్ మీద ఫోకస్.",
        "source": "fallback",
        "topic": "india cricket",
        "players": ["Virat Kohli", "Rohit Sharma"],
        "tournament": "international",
        "is_india": True,
        "is_thriller": False,
    },
    {
        "title": "IPL రేస్ మరింత హీట్: ప్లే ఆఫ్స్ కోసం పోటీ టఫ్",
        "summary": "పాయింట్స్ టేబుల్, స్టార్ ప్లేయర్ల ప్రభావం, నెక్స్ట్ మ్యాచ్ హైప్.",
        "source": "fallback",
        "topic": "ipl",
        "players": ["MS Dhoni"],
        "tournament": "IPL",
        "is_india": False,
        "is_thriller": True,
    },
]


@dataclass
class TopicCandidate:
    title: str
    summary: str
    source: str
    topic: str
    players: list[str] = field(default_factory=list)
    tournament: str = ""
    score_details: str = ""
    is_india: bool = False
    is_thriller: bool = False
    is_trending: bool = False
    published_at: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


def _safe_get(url: str, params: dict[str, Any]) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        response = requests.get(url, params=params, timeout=20)
        response.raise_for_status()
        return response.json()

    return retry(operation, operation_name=f"GET {url}")


def fetch_news() -> list[TopicCandidate]:
    if not settings.newsapi_key:
        logger.warning("NEWSAPI_KEY missing. Using fallback news only.")
        return []

    payload = _safe_get(
        "https://newsapi.org/v2/top-headlines",
        {
            "apiKey": settings.newsapi_key,
            "category": "sports",
            "language": "en",
            "pageSize": 10,
        },
    )
    candidates: list[TopicCandidate] = []
    for article in payload.get("articles", []):
        title = article.get("title") or ""
        description = article.get("description") or "Sports update."
        text = f"{title} {description}".lower()
        candidates.append(
            TopicCandidate(
                title=title,
                summary=description,
                source="newsapi",
                topic=title,
                players=_extract_players(text),
                tournament="IPL" if "ipl" in text else "",
                is_india="india" in text or "team india" in text,
                is_thriller=any(phrase in text for phrase in ["last over", "thriller", "super over", "dramatic"]),
                published_at=article.get("publishedAt", ""),
                raw=article,
            )
        )
    return candidates


def fetch_cricket_updates() -> list[TopicCandidate]:
    if not settings.cricapi_key:
        logger.warning("CRICAPI_KEY missing. Using fallback cricket data only.")
        return []

    payload = _safe_get(
        "https://api.cricapi.com/v1/currentMatches",
        {
            "apikey": settings.cricapi_key,
            "offset": 0,
        },
    )
    candidates: list[TopicCandidate] = []
    for match in payload.get("data", [])[:10]:
        teams = match.get("teams", [])
        name = match.get("name", "Cricket update")
        status = match.get("status", "")
        score = " | ".join(
            f"{item.get('inning', '')} {item.get('r', '')}/{item.get('w', '')} ({item.get('o', '')})"
            for item in match.get("score", [])
        )
        text = f"{name} {status} {score}".lower()
        candidates.append(
            TopicCandidate(
                title=name,
                summary=status or "Latest cricket score update.",
                source="cricapi",
                topic=name,
                players=_extract_players(text),
                tournament="IPL" if "ipl" in text else (match.get("matchType", "") or ""),
                score_details=score,
                is_india=any("india" in team.lower() for team in teams),
                is_thriller=any(phrase in text for phrase in ["need", "won by", "last over", "super over", "1 run", "2 runs"]),
                published_at=datetime.now(timezone.utc).isoformat(),
                raw=match,
            )
        )
    return candidates


def fetch_trends() -> list[str]:
    try:
        pytrends = TrendReq(hl="en-US", tz=330)
        pytrends.build_payload(SPORTS_KEYWORDS, timeframe="now 7-d", geo="IN")
        related = pytrends.related_queries()
        trend_terms: list[str] = []
        for keyword, payload in related.items():
            top_df = payload.get("top") if payload else None
            if top_df is not None:
                trend_terms.extend(top_df["query"].head(3).astype(str).tolist())
        return list(dict.fromkeys(term for term in trend_terms if term))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Trend detection failed: %s", exc)
        return ["India cricket", "IPL", "Virat Kohli"]


def fetch_all_candidates() -> tuple[list[TopicCandidate], list[str]]:
    news = []
    cricket = []
    trends = fetch_trends()

    try:
        news = fetch_news()
    except Exception as exc:  # noqa: BLE001
        logger.exception("News fetch failed: %s", exc)

    try:
        cricket = fetch_cricket_updates()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Cricket fetch failed: %s", exc)

    merged = news + cricket
    if not merged:
        merged = [TopicCandidate(**story) for story in FALLBACK_STORIES]

    for candidate in merged:
        haystack = f"{candidate.title} {candidate.summary} {candidate.topic}".lower()
        candidate.is_trending = any(term.lower() in haystack for term in trends)

    return merged, trends


def fallback_story_for_date() -> TopicCandidate:
    story = FALLBACK_STORIES[datetime.now().day % len(FALLBACK_STORIES)]
    return TopicCandidate(**story)


def _extract_players(text: str) -> list[str]:
    known_players = [
        "virat kohli",
        "rohit sharma",
        "ms dhoni",
        "hardik pandya",
        "jasprit bumrah",
        "kl rahul",
        "suryakumar yadav",
    ]
    return [name.title() for name in known_players if name in text]
