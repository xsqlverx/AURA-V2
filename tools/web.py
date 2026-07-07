"""Web search — Tavily (preferred) with DuckDuckGo fallback.
Also provides news headline gathering (Tavily news + RSS fallback)."""

import os
import logging

import httpx

logger = logging.getLogger(__name__)

TAVILY_NEWS_FALLBACK_FEEDS = [
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/World.xml",
]


async def get_news_headlines(count: int = 5) -> list[dict]:
    """Fetch top news headlines. Tries Tavily news endpoint, falls back to RSS."""
    # Try Tavily news endpoint first
    tavily_key = os.getenv("TAVILY_API_KEY")
    if tavily_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)
            r = client.search(
                query="latest news today",
                search_depth="basic",
                max_results=count,
                include_answer=False,
            )
            results = r.get("results", [])
            if results:
                return [
                    {"title": x.get("title", ""), "source": x.get("source", "News"), "url": x.get("url", "")}
                    for x in results[:count]
                ]
        except Exception as e:
            logger.warning("Tavily news failed, falling back to RSS: %s", e)

    # RSS fallback
    return await _fetch_rss_headlines(count)


async def _fetch_rss_headlines(count: int) -> list[dict]:
    try:
        import feedparser
    except ImportError:
        logger.warning("feedparser not installed, skipping RSS fallback")
        return []

    headlines: list[dict] = []
    for feed_url in TAVILY_NEWS_FALLBACK_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            source = feed.feed.get("title", "News") if hasattr(feed, "feed") else "News"
            for entry in feed.entries:
                headlines.append({
                    "title": entry.get("title", ""),
                    "source": source,
                    "url": entry.get("link", ""),
                })
                if len(headlines) >= count:
                    break
        except Exception as e:
            logger.warning("RSS feed failed (%s): %s", feed_url, e)
            continue
        if len(headlines) >= count:
            break

    return headlines[:count]


async def web_search(query: str) -> dict:
    # Try Tavily first
    tavily_key = os.getenv("TAVILY_API_KEY")
    if tavily_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)
            r = client.search(query=query, search_depth="basic", max_results=5, include_answer=True)
            return {
                "success": True,
                "source": "tavily",
                "answer": r.get("answer"),
                "results": [
                    {"title": x.get("title"), "url": x.get("url"), "content": x.get("content", "")[:300]}
                    for x in r.get("results", [])[:5]
                ],
            }
        except Exception as e:
            logger.warning("Tavily failed, falling back to DDG: %s", e)

    # DuckDuckGo fallback
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get("https://api.duckduckgo.com/", params={
                "q": query, "format": "json", "no_redirect": 1,
                "no_html": 1, "skip_disambig": 1,
            })
            data = r.json()

        if data.get("AbstractText"):
            return {"success": True, "source": "ddg", "answer": data["AbstractText"], "url": data.get("AbstractURL")}
        if data.get("Answer"):
            return {"success": True, "source": "ddg", "answer": data["Answer"]}
        if data.get("RelatedTopics"):
            first = data["RelatedTopics"][0]
            return {"success": True, "source": "ddg", "answer": first.get("Text", ""), "url": first.get("FirstURL")}

        return {"error": f"No results for: {query}"}
    except Exception as e:
        logger.error("DDG search failed: %s", e)
        return {"error": str(e)}