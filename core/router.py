"""LLM routing — classifier (keyword fallback), convo (OpenRouter), tools (Groq), deep (Nvidia NIM)."""

import logging

from openai import AsyncOpenAI

from core.config import (
    OPENROUTER_API_KEY,
    GROQ_API_KEY,
    NVIDIA_API_KEY,
    MODEL_DEEP,
    MODEL_FAST,
    MODEL_TOOLS,
)

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

# ── Intent Classifier (keyword fallback — instant, zero API calls) ───────────
# Keyword matching covers all AURA use cases. No API calls, no rate limits,
# no latency. If a message triggers a tool keyword, it needs tools.

_TOOL_KEYWORDS = {
    "search", "find", "open ", "weather", "youtube", "google",
    "what is", "who is", "play", "volume", "mute", "shutdown",
    "restart", "lock", "scrape", "browser", "click", "type",
    "scroll", "remember", "save ", "memory", "vault", "note",
    "study", "whatsapp", "send ", "compare", "price", "news",
    "research", "go to", "launch", "stop", "pause", "next",
    "previous", "create ", "clipboard", "copy", "paste", "press",
    "stats", "kill", "list ", "make ", "build ", "generate",
    "quiz", "summarize", "draft", "assign",
    "shut", "date", "time", "define", "calculate", "translate",
    "download", "screenshot", "record",
    "remind", "reminder", "task", "schedule", "calendar",
    "delete", "remove ",
}


async def classify_intent(message: str) -> bool:
    """Classify whether the message needs tools or is pure conversation.

    Uses keyword matching — instant, zero API calls, zero rate limits.
    """
    msg = message.lower().strip()
    result = any(kw in msg for kw in _TOOL_KEYWORDS)
    logger.info("[LLM] stage=classify model=keyword → %s", "TRUE" if result else "FALSE")
    return result


# ── Client Selection ─────────────────────────────────────────────────────────

def get_client_and_model(mode: str = "convo") -> tuple:
    """Returns (client, model_name) for the requested mode.

    Modes:
        "convo" — OpenRouter Llama 3.1 8B (conversation, no tools)
        "tools" — Groq Llama 3.3 70B (tool execution via <function=name>)
        "deep"  — Nvidia NIM DeepSeek V4 Flash (deep research, summarization)
    """
    match mode:
        case "convo":
            return (openrouter_client, MODEL_FAST) if openrouter_client else (groq_client, "llama-3.1-8b-instant")
        case "tools":
            return (groq_client, MODEL_TOOLS) if groq_client else (openrouter_client, MODEL_FAST)
        case "deep":
            return (nvidia_client, MODEL_DEEP) if nvidia_client else (openrouter_client, MODEL_FAST)
        case _:
            return (openrouter_client, MODEL_FAST) if openrouter_client else (groq_client, "llama-3.1-8b-instant")
