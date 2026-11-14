"""LLM routing — classifier (keyword fallback), convo (OpenRouter), tools (Groq), deep (Nvidia NIM)."""

import logging
import time

from openai import AsyncOpenAI

from core.config import (
    OPENROUTER_API_KEY,
    GROQ_API_KEY,
    NVIDIA_API_KEY,
    MODEL_DEEP,
    MODEL_FAST,
    MODEL_TOOLS,
    MODEL_TOOLS_FALLBACK,
)
from tools.registry import TOOLS, TOOL_MAP

logger = logging.getLogger(__name__)

# ── Clients ──────────────────────────────────────────────────────────────────

openrouter_client = (
    AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
    if OPENROUTER_API_KEY else None
)

groq_client = (
    AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    if GROQ_API_KEY else None
)

nvidia_client = (
    AsyncOpenAI(api_key=NVIDIA_API_KEY, base_url="https://integrate.api.nvidia.com/v1")
    if NVIDIA_API_KEY else None
)

# ── Groq Rate Limit Circuit Breaker ──────────────────────────────────────────
# Avoid hammering Groq when a 429 occurs
_groq_cooldown_until: float = 0.0

def report_groq_rate_limit(cooldown_seconds: float = 60.0) -> None:
    global _groq_cooldown_until
    _groq_cooldown_until = time.time() + cooldown_seconds
    logger.warning("[ROUTER] Groq rate limit registered. Backing off for %.0fs", cooldown_seconds)

def is_groq_available() -> bool:
    return groq_client is not None and time.time() >= _groq_cooldown_until


# ── Intent Classifier (keyword fallback — instant, zero API calls) ───────────
_TOOL_KEYWORDS = {
    "search", "find", "open ", "weather", "youtube", "google",
    "play", "volume", "mute", "unmute", "loud", "quiet", "sound",
    "shutdown", "restart", "lock", "sleep", "screen",
    "scrape", "browser", "click", "type", "scroll",
    "remember", "save ", "memory", "vault", "note", "notes",
    "study", "whatsapp", "send ", "compare", "price", "news",
    "research", "go to", "launch", "stop", "pause", "next", "skip",
    "previous", "prev", "create ", "clipboard", "copy", "paste", "press",
    "stats", "kill ", "list ", "make ", "build ", "generate",
    "quiz", "summarize", "draft", "assign",
    "shut down", "date", "time", "define", "calculate", "translate",
    "download", "screenshot", "record",
    "remind", "reminder", "task", "tasks", "schedule", "calendar",
    "delete", "remove ", "clear", "app", "application", "calc", "notepad",
    "chrome", "spotify", "process", "processes", "cpu", "ram", "battery",
    "disk", "storage", "folder", "directory", "hotkey", "shortcut",
}


async def classify_intent(message: str) -> bool:
    """Classify whether the message needs tools or is pure conversation.
    Uses keyword matching — instant, zero API calls, zero rate limits.
    """
    msg = message.lower().strip()
    result = any(kw in msg for kw in _TOOL_KEYWORDS)
    logger.info("[LLM] stage=classify model=keyword → %s", "TRUE" if result else "FALSE")
    return result


# ── Dynamic Tool Scoping (95% Token Reduction) ──────────────────────────────
# Categorized tool sets to drastically reduce token consumption and protect TPM.

_TOOL_DOMAINS = {
    "audio": {
        "keywords": {"volume", "sound", "mute", "unmute", "loud", "louder", "quiet", "quieter"},
        "tools": ["set_volume", "get_volume", "mute_audio"],
    },
    "media": {
        "keywords": {"pause", "play", "stop", "next", "previous", "prev", "skip", "track", "song", "music"},
        "tools": ["play_pause", "next_track", "prev_track"],
    },
    "apps": {
        "keywords": {"open ", "launch ", "start ", "run ", "process", "processes", "kill ", "app", "application", "notepad", "calculator", "calc", "chrome", "spotify", "code"},
        "tools": ["launch_app", "list_running_processes"],
    },
    "files": {
        "keywords": {"file", "files", "folder", "directory", "dir", "downloads", "desktop", "documents", "path"},
        "tools": ["open_path", "create_folder", "list_directory"],
    },
    "web": {
        "keywords": {"search", "google", "web", "youtube", "yt", "video", "news", "website", "url", "scrape", "browse", "price", "compare", "research", "z.ai", "build", "make app"},
        "tools": ["web_search", "open_website", "play_youtube", "open_z_agent", "scrape_website", "browser_control"],
    },
    "system": {
        "keywords": {"stats", "cpu", "ram", "memory", "disk", "battery", "shutdown", "restart", "sleep", "lock", "pc"},
        "tools": ["get_system_stats", "shutdown", "restart", "sleep_pc", "lock_pc", "lock_screen", "cancel_shutdown"],
    },
    "clipboard": {
        "keywords": {"clipboard", "copy", "paste", "clip"},
        "tools": ["clipboard_copy", "clipboard_paste"],
    },
    "vault": {
        "keywords": {"vault", "obsidian", "note", "notes", "study", "quiz", "summarize", "draft"},
        "tools": ["vault", "study"],
    },
    "tasks": {
        "keywords": {"task", "tasks", "remind", "reminder", "schedule", "calendar", "todo", "to-do"},
        "tools": ["create_task", "list_tasks", "delete_task"],
    },
    "input": {
        "keywords": {"type", "press", "key", "hotkey", "shortcut"},
        "tools": ["type_text", "press_key", "execute_hotkey"],
    },
    "comm": {
        "keywords": {"whatsapp", "sms", "text message", "message", "send", "phone", "android"},
        "tools": ["send_whatsapp", "android_handoff"],
    },
    "memory": {
        "keywords": {"remember", "don't forget", "keep in mind", "save", "memory", "preference", "preferences"},
        "tools": ["memory"],
    },
}


def get_scoped_tools(message: str) -> list[dict]:
    """Select ONLY the relevant tools for this specific user message.
    Reduces prompt tokens from ~5,000 to ~250 (95% token savings).
    """
    msg = message.lower()
    selected_names = set()

    is_internal_search = any(k in msg for k in ["search memory", "search my memory", "search your memory", "search vault", "search notes"])

    for domain, spec in _TOOL_DOMAINS.items():
        if domain == "web" and is_internal_search:
            continue
        if any(kw in msg for kw in spec["keywords"]):
            selected_names.update(spec["tools"])

    # If no domain matched specifically or multiple domains matched, provide a focused core set
    if not selected_names:
        # Fallback to a general core bundle
        selected_names = {
            "web_search", "open_website", "play_youtube",
            "launch_app", "get_system_stats", "set_volume",
            "get_volume", "memory", "vault", "create_task",
        }

    scoped = [TOOL_MAP[name] for name in selected_names if name in TOOL_MAP]
    logger.info("[ROUTER] Dynamic tool scoping: %d tools selected (%s)", len(scoped), ", ".join(selected_names))
    return scoped


# ── Client Selection ─────────────────────────────────────────────────────────

def get_client_and_model(mode: str = "convo") -> tuple:
    """Returns (client, model_name) for the requested mode.

    Modes:
        "convo" — configured OpenRouter conversation model (no tools)
        "tools" — Groq Qwen 2.5 27B / Fallback OpenRouter Llama 3.3 70B
        "deep"  — Nvidia NIM DeepSeek V4 Flash (deep research, summarization)
    """
    match mode:
        case "convo":
            return (openrouter_client, MODEL_FAST) if openrouter_client else (groq_client, "llama-3.1-8b-instant")
        case "tools":
            if is_groq_available():
                return (groq_client, MODEL_TOOLS)
            # Circuit breaker: Groq is cooling down or unavailable -> fallback to OpenRouter
            logger.info("[ROUTER] Using OpenRouter tool-capable fallback model: %s", MODEL_TOOLS_FALLBACK)
            return (openrouter_client, MODEL_TOOLS_FALLBACK) if openrouter_client else (groq_client, MODEL_TOOLS)
        case "deep":
            return (nvidia_client, MODEL_DEEP) if nvidia_client else (openrouter_client, MODEL_FAST)
        case _:
            return (openrouter_client, MODEL_FAST) if openrouter_client else (groq_client, "llama-3.1-8b-instant")
