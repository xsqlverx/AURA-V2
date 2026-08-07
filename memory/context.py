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

WMO_CODES = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    56: "Light freezing drizzle", 57: "Dense freezing drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}

WMO_ICONS = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    56: "🌧️", 57: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    66: "🌧️", 67: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "❄️",
    77: "❄️",
    80: "🌦️", 81: "🌧️", 82: "🌧️",
    85: "🌨️", 86: "❄️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_location() -> Optional[dict]:
    """Get lat/lon/city via ip-api.com (free, no key)."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get("http://ip-api.com/json/")
            data = r.json()
            if data.get("status") == "success":
                return {
                    "lat": data["lat"],
                    "lon": data["lon"],
                    "city": data["city"],
                    "region": data.get("regionName", ""),
                }
    except Exception as e:
        logger.warning("Location fetch failed: %s", e)
    return None


async def _fetch_weather() -> Optional[dict]:
    """Fetch weather from Open-Meteo (free, no key).
    Returns {city, region, temp, condition, icon} or None."""
    try:
        loc = await _fetch_location()
        if not loc:
            return None

        async with httpx.AsyncClient(timeout=10) as client:
            url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={loc['lat']}&longitude={loc['lon']}"
                f"&current_weather=true"
            )
            r = await client.get(url)
            data = r.json()
            cw = data.get("current_weather", {})
            code = cw.get("weathercode", 0)
            temp = cw.get("temperature", "")
            desc = WMO_CODES.get(code, "Unknown")
            icon = WMO_ICONS.get(code, "❓")
            return {
                "city": loc["city"],
                "region": loc["region"],
                "temp": f"{temp}°" if temp != "" else "",
                "condition": desc,
                "icon": icon,
            }
    except Exception as e:
        logger.warning("Weather fetch failed: %s", e)
        return None


# ── Public ────────────────────────────────────────────────────────────────────

async def get_weather_data() -> dict:
    """
    Return structured weather data: { city, region, temp, condition, icon }.
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
            _cache["fetched_at"] = now

    city = _cache["city"] or "Unknown"
    region = _cache["region"] or ""
    temp = _cache["weather"].get("temp", "") if _cache["weather"] else ""
    condition = _cache["weather"].get("condition", "") if _cache["weather"] else ""
    icon = _cache["weather"].get("icon", "❓") if _cache["weather"] else "❓"

    return {"city": city, "region": region, "temp": temp, "condition": condition, "icon": icon}


async def get_context_block() -> str:
    """
    Return a formatted string of live context to inject into the system prompt.
    Uses cached weather if fresh. Fails silently — returns partial context on error.
    """
    global _cache

    now = time.time()
    current_time = datetime.now().strftime("%A, %B %d %Y — %I:%M %p")

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
        lines.append(f"Weather: {w.get('icon', '')} {w.get('temp', '')}, {w.get('condition', '')}")

    return "\n".join(lines)
