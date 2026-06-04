"""LLM routing — Mistral (deep) + OpenRouter (fast/tools).
Both use OpenAI-compatible endpoints so agent.py needs zero changes.
"""

from openai import AsyncOpenAI

from core.config import (
    MISTRAL_API_KEY,
    OPENROUTER_API_KEY,
    MODEL_DEEP,
    MODEL_FAST,
    MODEL_TOOLS,
)

# ── Clients ───────────────────────────────────────────────────────────────────

mistral_client = AsyncOpenAI(
    api_key=MISTRAL_API_KEY,
    base_url="https://api.mistral.ai/v1",
)

openrouter_client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

# ── Tool keyword classifier ───────────────────────────────────────────────────
_TOOL_KEYWORDS = {
    "volume", "mute", "unmute", "louder", "quieter", "play", "pause",
    "next track", "previous track", "skip", "music",
    "open", "launch", "start", "close", "run", "app",
    "shutdown", "restart", "reboot", "sleep", "lock", "hibernate",
    "cancel shutdown",
    "file", "folder", "directory", "create folder", "list files",
    "search", "look up", "google", "find", "browse", "website", "url",
    "cpu", "ram", "memory", "disk", "battery", "stats", "usage",
    "clipboard", "copy", "paste", "type", "press", "hotkey",
    "note", "notes", "write down", "remind",
    "whatsapp", "message", "send",
    "screenshot", "screen",
}


def needs_tools(message: str) -> bool:
    lowered = message.lower()
    return any(kw in lowered for kw in _TOOL_KEYWORDS)


def get_client_and_model(mode: str) -> tuple:
    """
    Modes:
        "deep"  — Mistral Large (smart, research, conversation)
        "fast"  — OpenRouter Llama 3.1 8B (casual, low latency)
        "tools" — OpenRouter Llama 3.1 8B (function calling)
    """
    match mode:
        case "deep":
            return mistral_client, MODEL_DEEP
        case "fast":
            return openrouter_client, MODEL_FAST
        case "tools":
            return openrouter_client, MODEL_TOOLS
        case _:
            return openrouter_client, MODEL_FAST