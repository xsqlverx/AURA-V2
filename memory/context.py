"""Live context injection — weather, time, and system state for the agent."""

import logging
import time
from datetime import datetime
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

# ── Cache ─────────────────────────────────────────────────────────────────────

_cache: dict = {
    "weather": None,
    "city": None,
    "fetched_at": 0.0,
}
_CACHE_TTL = 1800  # 30 minutes


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_city() -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get("https://ipapi.co/json/")
            return r.json().get("city")
    except Exception as e:
        logger.warning("City fetch failed: %s", e)
        return None


async def _fetch_weather(city: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"https://wttr.in/{city}?format=3")
            return r.text.strip()
    except Exception as e:
        logger.warning("Weather fetch failed: %s", e)
        return None


# ── Public ────────────────────────────────────────────────────────────────────

async def get_context_block() -> str:
    """
    Return a formatted string of live context to inject into the system prompt.
    Uses cached weather if fresh. Fails silently — returns partial context on error.
    """
    global _cache

    now = time.time()
    current_time = datetime.now().strftime("%A, %B %d %Y — %I:%M %p")

    # Refresh weather cache if stale
    if now - _cache["fetched_at"] > _CACHE_TTL:
        city = await _fetch_city()
        weather = await _fetch_weather(city) if city else None
        _cache.update({
            "city": city,
            "weather": weather,
            "fetched_at": now,
        })

    lines = [f"Current time: {current_time}"]
    if _cache["weather"]:
        lines.append(f"Weather: {_cache['weather']}")

    return "\n".join(lines)