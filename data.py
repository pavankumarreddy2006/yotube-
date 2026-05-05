from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import requests
from pytrends.request import TrendReq

from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)


def _contains_term(text: str, term: str) -> bool:
    pattern = r"\b" + re.escape(term.lower()) + r"\b"
    return bool(re.search(pattern, text.lower()))


def _contains_any_term(text: str, terms: list[str]) -> bool:
    return any(_contains_term(text, term) for term in terms)


SPORTS_KEYWORDS = [
    "IPL",
    "India cricket",
    "Virat Kohli",
    "Rohit Sharma",
    "MS Dhoni",
    "cricket score",
    "football transfer",
    "tennis grand slam",
    "olympics qualifiers",
]


FALLBACK_STORIES = [
    {
        "title": "India Team Build-Up Before The Next Big Match",
        "summary": "Focus is on form, key players, pressure moments, and what fans are expecting next.",
        "source": "fallback",
        "topic": "india cricket",
        "category": "Cricket",
        "players": ["Virat Kohli", "Rohit Sharma"],
        "tournament": "international cricket",
        "is_india": True,
        "is_thriller": False,
    },
    {
        "title": "IPL Race Heats Up As Playoff Pressure Builds",
        "summary": "Points table pressure, star player momentum, and huge interest around the next fixture.",
        "source": "fallback",
        "topic": "ipl",
        "category": "Cricket",
        "players": ["MS Dhoni"],
        "tournament": "IPL",
        "is_india": False,
        "is_thriller": True,
    },
    {
        "title": "Football Transfer Race Intensifies Across Europe",
        "summary": "Top clubs are moving aggressively, with fans tracking the latest transfer twists and tactical upgrades.",
        "source": "fallback",
        "topic": "football transfer",
        "category": "Football",
        "players": [],
        "tournament": "club football",
    },
    {
        "title": "Grand Slam Build-Up Puts Tennis Stars In Focus",
        "summary": "Training rhythm, form, and draw expectations are building ahead of the next major tennis test.",
        "source": "fallback",
        "topic": "tennis",
        "category": "Tennis",
        "players": [],
        "tournament": "Grand Slam",
    },
    {
        "title": "Olympic Qualification Battles Bring Fresh Momentum",
        "summary": "Athletes across disciplines are pushing for qualification, with every result carrying major Olympic stakes.",
        "source": "fallback",
        "topic": "olympics",
        "category": "Olympics",
        "players": [],
        "tournament": "Olympics",
    },
]


@dataclass
class TopicCandidate:
    title: str
    summary: str
    source: str
    topic: str
    image_url: str = ""
    category: str = "Sports"
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
        title = article.get("title") or "Sports update"
        description = article.get("description") or "Sports update."
        text = f"{title} {description}".lower()
        candidates.append(
            TopicCandidate(
                title=title,
                summary=description,
                source="newsapi",
                topic=title,
                image_url=article.get("urlToImage") or "",
                category=_categorize_text(text),
                players=_extract_players(text),
                tournament="IPL" if _contains_term(text, "ipl") else "",
                is_india=_contains_term(text, "india") or "team india" in text,
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
                image_url="",
                category="Cricket",
                players=_extract_players(text),
                tournament="IPL" if _contains_term(text, "ipl") else (match.get("matchType", "") or ""),
                score_details=score,
                is_india=any(_contains_term(team.lower(), "india") for team in teams),
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
        for _, payload in related.items():
            top_df = payload.get("top") if payload else None
            if top_df is not None:
                trend_terms.extend(top_df["query"].head(3).astype(str).tolist())
        return list(dict.fromkeys(term for term in trend_terms if term))
    except Exception as exc:
        logger.warning("Trend detection failed: %s", exc)
        return ["India cricket", "IPL", "football transfer", "tennis grand slam", "olympics"]


def fetch_all_candidates() -> tuple[list[TopicCandidate], list[str]]:
    trends = fetch_trends()
    news: list[TopicCandidate] = []
    cricket: list[TopicCandidate] = []

    try:
        news = fetch_news()
    except Exception as exc:
        logger.exception("News fetch failed: %s", exc)

    try:
        cricket = fetch_cricket_updates()
    except Exception as exc:
        logger.exception("Cricket fetch failed: %s", exc)

    merged = _dedupe_candidates(news + cricket)
    if not merged:
        merged = [TopicCandidate(**story) for story in FALLBACK_STORIES]

    for candidate in merged:
        haystack = f"{candidate.title} {candidate.summary} {candidate.topic}".lower()
        candidate.is_trending = any(term.lower() in haystack for term in trends)

    return merged, trends


def select_daily_highlights(candidates: list[TopicCandidate]) -> list[TopicCandidate]:
    ranked = sorted(
        candidates,
        key=lambda item: (
            int(item.is_trending),
            int(item.is_thriller),
            int(item.is_india),
            int(bool(item.score_details)),
            item.published_at or "",
        ),
        reverse=True,
    )
    minimum = max(1, settings.min_daily_highlights)
    maximum = max(minimum, settings.max_daily_highlights)
    selected = ranked[:maximum]
    if len(selected) < minimum:
        fallback = [TopicCandidate(**story) for story in FALLBACK_STORIES]
        selected.extend(fallback[: minimum - len(selected)])
    return _dedupe_candidates(selected)


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


def _dedupe_candidates(candidates: list[TopicCandidate]) -> list[TopicCandidate]:
    unique: list[TopicCandidate] = []
    seen: set[str] = set()
    for item in candidates:
        key = f"{item.title}|{item.summary}".strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def _categorize_text(text: str) -> str:
    lowered = text.lower()
    if _contains_any_term(lowered, ["cricket", "ipl", "odi", "test match", "t20"]):
        return "Cricket"
    if _contains_any_term(lowered, ["football", "soccer", "premier league", "transfer"]):
        return "Football"
    if _contains_any_term(lowered, ["tennis", "atp", "wta", "grand slam"]):
        return "Tennis"
    if _contains_term(lowered, "olympic") or _contains_term(lowered, "olympics"):
        return "Olympics"
    return "Sports"
