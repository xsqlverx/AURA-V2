"""Web search — Tavily (preferred) + DuckDuckGo fallback.
Supports modes: search, news, research, price, compare.
Also provides news headline gathering (Tavily news + RSS fallback)."""

import asyncio
import logging
import os
import threading

import httpx

logger = logging.getLogger(__name__)

TAVILY_NEWS_FALLBACK_FEEDS = [
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/World.xml",
]


async def get_news_headlines(count: int = 5) -> list[dict]:
    """Fetch top news headlines. Tries Tavily news endpoint, falls back to RSS."""
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


async def _tavily_search(query: str, max_results: int = 5, depth: str = "basic") -> dict | None:
    """Run a Tavily search. Returns None if not configured or fails."""
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        return None
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        r = client.search(query=query, search_depth=depth, max_results=max_results, include_answer=True)
        results = r.get("results", [])
        if results:
            return {
                "source": "tavily",
                "answer": r.get("answer"),
                "results": [
                    {"title": x.get("title"), "url": x.get("url"), "content": x.get("content", "")[:400]}
                    for x in results[:max_results]
                ],
            }
    except Exception as e:
        logger.warning("Tavily search failed: %s", e)
    return None


async def _ddg_search(query: str, max_results: int = 5) -> dict | None:
    """DuckDuckGo fallback search."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get("https://api.duckduckgo.com/", params={
                "q": query, "format": "json", "no_redirect": 1,
                "no_html": 1, "skip_disambig": 1,
            })
            data = r.json()

        if data.get("AbstractText"):
            return {"source": "ddg", "answer": data["AbstractText"], "url": data.get("AbstractURL")}
        if data.get("Answer"):
            return {"source": "ddg", "answer": data["Answer"]}
        if data.get("RelatedTopics"):
            first = data["RelatedTopics"][0]
            return {"source": "ddg", "answer": first.get("Text", ""), "url": first.get("FirstURL")}
    except Exception as e:
        logger.warning("DDG search failed: %s", e)
    return None


async def _ddg_news(query: str, max_results: int = 8) -> list[dict]:
    """DDG news search — returns actual articles."""
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.news(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("url", ""),
                    "source": r.get("source", ""),
                })
        return results
    except ImportError:
        try:
            from ddgs import DDGS
            results = []
            with DDGS() as ddgs:
                for r in ddgs.news(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "snippet": r.get("body", ""),
                        "url": r.get("url", ""),
                        "source": r.get("source", ""),
                    })
            return results
        except ImportError:
            logger.warning("duckduckgo_search not installed, skipping DDG news")
            return []
    except Exception as e:
        logger.warning("DDG news failed: %s", e)
        return []


# ── Mode implementations ───────────────────────────────────────────────────────

async def _search_mode(query: str) -> dict:
    """Default search — Tavily first, DDG fallback."""
    result = await _tavily_search(query)
    if result:
        return {"success": True, **result}
    result = await _ddg_search(query)
    if result:
        return {"success": True, **result}
    return {"error": f"No results found for: {query}"}


async def _news_mode(query: str) -> dict:
    """News — parallel Tavily news + DDG news, first wins."""
    _tavily_key = os.getenv("TAVILY_API_KEY")
    result_box = [None]
    done_event = threading.Event()

    def _store(r):
        if r:
            result_box[0] = r
            done_event.set()

    async def _try_tavily_news():
        if not _tavily_key:
            _store(None)
            return
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=_tavily_key)
            r = client.search(query=query or "latest news", search_depth="basic", max_results=8, include_answer=True)
            results = r.get("results", [])
            if results:
                lines = [f"Latest news: {query}\n"]
                for i, x in enumerate(results[:8], 1):
                    lines.append(f"{i}. {x.get('title', '')}")
                    if x.get('content'):
                        lines.append(f"   {x['content'][:200]}")
                    if x.get('url'):
                        lines.append(f"   {x['url']}")
                    lines.append("")
                _store("\n".join(lines).strip())
                return
        except Exception as e:
            logger.warning("Tavily news search failed: %s", e)
        _store(None)

    def _try_ddg_news():
        try:
            articles = asyncio.run_coroutine_threadsafe(
                _ddg_news(query or "world news", max_results=8),
                asyncio.get_event_loop(),
            ).result(timeout=10)
            if articles:
                lines = [f"Latest news: {query}\n"]
                for i, a in enumerate(articles[:8], 1):
                    lines.append(f"{i}. {a['title']}  [{a['source']}]" if a.get('source') else f"{i}. {a['title']}")
                    if a.get('snippet'):
                        lines.append(f"   {a['snippet'][:200]}")
                    if a.get('url'):
                        lines.append(f"   {a['url']}")
                    lines.append("")
                _store("\n".join(lines).strip())
                return
        except Exception as e:
            logger.warning("DDG news failed: %s", e)
        _store(None)

    t1 = threading.Thread(target=_try_ddg_news, daemon=True)
    t2 = threading.Thread(target=lambda: asyncio.run_coroutine_threadsafe(
        _try_tavily_news(), asyncio.get_event_loop()
    ).result(timeout=10) if asyncio.get_event_loop().is_running() else None, daemon=True)
    t1.start()
    t2.start()

    done_event.wait(timeout=12)
    if result_box[0]:
        return {"success": True, "source": "news", "content": result_box[0]}
    return {"error": f"No news found for: {query}"}


async def _research_mode(query: str) -> dict:
    """Deep dive — more results, comprehensive."""
    result = await _tavily_search(query, max_results=10, depth="advanced")
    if result:
        return {"success": True, **result}
    result = await _ddg_search(query, max_results=8)
    if result:
        return {"success": True, **result}
    return {"error": f"No research results for: {query}"}


async def _price_mode(query: str) -> dict:
    """Product price lookup."""
    price_query = f"current price of {query}"
    result = await _tavily_search(price_query, max_results=5)
    if result:
        return {"success": True, **result}
    result = await _ddg_search(f"{query} price buy", max_results=5)
    if result:
        return {"success": True, "source": "ddg", **result}
    return {"error": f"No price info for: {query}"}


async def _compare_mode(items: list, aspect: str = "") -> dict:
    """Compare multiple items — search each in parallel, combine results."""
    if not items:
        return {"error": "No items to compare"}
    queries = [f"{item} {aspect}".strip() for item in items]

    async def search_item(query: str) -> tuple:
        result = await _tavily_search(query, max_results=3)
        if result:
            return (query, result["results"])
        ddg = await _ddg_search(query)
        if ddg:
            return (query, [{"title": ddg.get("answer", ""), "url": ddg.get("url", ""), "content": ""}])
        return (query, [])

    tasks = [search_item(q) for q in queries]
    results = await asyncio.gather(*tasks)

    lines = [f"Comparison — {aspect.upper()}" if aspect else "Comparison", "─" * 40]
    for query, res in results:
        lines.append(f"\n▸ {query}")
        for r in res[:3]:
            if r.get("title"):
                lines.append(f"  • {r['title']}")
            if r.get("content"):
                lines.append(f"    {r['content'][:200]}")
            if r.get("url"):
                lines.append(f"    {r['url']}")
    content = "\n".join(lines).strip()
    return {"success": True, "source": "compare", "mode": "compare", "content": content}


# ── Public entry point ─────────────────────────────────────────────────────────

async def web_search(
    query: str = "",
    mode: str = "search",
    items: list = None,
    aspect: str = "",
) -> dict:
    if items and mode == "compare":
        return await _compare_mode(items, aspect)

    if not query:
        return {"error": "No search query provided"}

    match mode:
        case "news":
            return await _news_mode(query)
        case "research":
            return await _research_mode(query)
        case "price":
            return await _price_mode(query)
        case "compare":
            return await _compare_mode([query], aspect)
        case _:
            return await _search_mode(query)
