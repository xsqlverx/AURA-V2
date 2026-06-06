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
    "region": None,
    "fetched_at": 0.0,
}
_CACHE_TTL = 1800  # 30 minutes


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _fetch_weather() -> Optional[dict]:
    """Fetch weather + location from wttr.in JSON API (auto IP detection).
    Returns {city, region, temp, condition} or None."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://wttr.in?format=j1")
            data = r.json()
            cc = data.get("current_condition", [{}])[0]
            area = data.get("nearest_area", [{}])[0]
            temp = cc.get("temp_C", "")
            desc = cc.get("weatherDesc", [{}])[0].get("value", "")
            city = area.get("areaName", [{}])[0].get("value", "")
            region = area.get("region", [{}])[0].get("value", "")
            return {
                "city": "Aluva",
                "region": "Kerala",
                "temp": f"{temp}°C" if temp else "",
                "condition": desc,
            }
    except Exception as e:
        logger.warning("Weather fetch failed: %s", e)
        return None


# ── Public ────────────────────────────────────────────────────────────────────


async def get_weather_data() -> dict:
    """
    Return structured weather data: { city, region, temp, condition }.
    Uses cached weather if fresh. Preserves previous values on refresh failure.
    """
    global _cache

    now = time.time()

    if now - _cache["fetched_at"] > _CACHE_TTL:
        weather = await _fetch_weather()
        if weather:
            _cache.update({
                "city": weather["city"],
                "region": weather["region"],
                "weather": weather,
                "fetched_at": now,
            })
        else:
            # Refresh failed — keep stale cache but update timestamp to retry next cycle
            _cache["fetched_at"] = now

    city = _cache["city"] or "Unknown"
    region = _cache["region"] or ""
    temp = _cache["weather"].get("temp", "") if _cache["weather"] else ""
    condition = _cache["weather"].get("condition", "") if _cache["weather"] else ""

    return {"city": city, "region": region, "temp": temp, "condition": condition}


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
        weather = await _fetch_weather()
        if weather:
            _cache.update({
                "city": weather["city"],
                "region": weather["region"],
                "weather": weather,
                "fetched_at": now,
            })
        else:
            _cache["fetched_at"] = now

    lines = [f"Current time: {current_time}"]
    if _cache["weather"]:
        w = _cache["weather"]
        lines.append(f"Weather: {w.get('temp', '')}, {w.get('condition', '')}")

    return "\n".join(lines)