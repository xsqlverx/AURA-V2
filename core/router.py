"""LLM routing — classifier (Mistral + keyword fallback), convo (OpenRouter), tools (Groq), research (Mistral)."""

import logging

from openai import AsyncOpenAI

from core.config import (
    MISTRAL_API_KEY,
    OPENROUTER_API_KEY,
    GROQ_API_KEY,
    MODEL_DEEP,
    MODEL_FAST,
    MODEL_TOOLS,
)

logger = logging.getLogger(__name__)

# ── Clients ──────────────────────────────────────────────────────────────────

mistral_client = (
    AsyncOpenAI(api_key=MISTRAL_API_KEY, base_url="https://api.mistral.ai/v1")
    if MISTRAL_API_KEY else None
)

openrouter_client = (
    AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
    if OPENROUTER_API_KEY else None
)

groq_client = (
    AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    if GROQ_API_KEY else None
)

# ── Intent Classifier (Mistral + keyword fallback) ────────────────────────────
# Uses Mistral Small for AI-powered classification. Falls back to keyword
# matching if Mistral is rate-limited or unavailable — no single point of failure.

CLASSIFIER_SYSTEM_PROMPT = """You are a strict router. Your job is to determine if the user's message requires:
- Using tools (web search, browser control, system control, files, apps, memory, etc.)
- Accessing real-time data, the internet, or external information

Respond with exactly one word: TRUE or FALSE.

TRUE means: the user is asking to do something that requires a tool or web access.
FALSE means: the user is just chatting, asking for opinions, having a conversation, or asking questions that don't require external data or tool execution.

Examples:
User: "what's the weather in Tokyo?" → TRUE
User: "open youtube" → TRUE
User: "search for python tutorials" → TRUE
User: "what do you think about AI?" → FALSE
User: "hello how are you" → FALSE
User: "tell me a joke" → FALSE
User: "remember that I like coffee" → TRUE
User: "shut down the pc" → TRUE
User: "explain quantum computing" → FALSE
User: "compare iPhone 15 and Pixel 8" → TRUE"""

_CLASSIFIER_MODEL = "mistral-small-latest"

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


def _keyword_fallback(message: str) -> bool:
    """Lightweight keyword classifier — no API calls, zero latency."""
    msg = message.lower().strip()
    return any(kw in msg for kw in _TOOL_KEYWORDS)


async def classify_intent(message: str) -> bool:
    """Classify whether the message needs tools or is pure conversation.

    First tries Mistral Small (AI-powered, best accuracy).
    Falls back to keyword matching if Mistral is unavailable or rate-limited.
    """
    if mistral_client is None:
        logger.info("No Mistral client available, using keyword fallback")
        return _keyword_fallback(message)

    try:
        response = await mistral_client.chat.completions.create(
            model=_CLASSIFIER_MODEL,
            messages=[
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            max_tokens=10,
            temperature=0.0,
        )
        result = response.choices[0].message.content.strip().upper()
        return result == "TRUE"
    except Exception as e:
        logger.warning("Mistral classifier failed (%s), using keyword fallback", e)
        return _keyword_fallback(message)


# ── Client Selection ─────────────────────────────────────────────────────────

def get_client_and_model(mode: str = "convo") -> tuple:
    """Returns (client, model_name) for the requested mode.

    Modes:
        "convo" — OpenRouter Llama 3.1 8B (conversation, no tools)
        "tools" — Groq Llama 3.3 70B (tool execution via <function=name>)
        "deep"  — Mistral Small (deep research, summarization)
    """
    match mode:
        case "convo":
            return (openrouter_client, MODEL_FAST) if openrouter_client else (mistral_client, MODEL_DEEP)
        case "tools":
            return (groq_client, MODEL_TOOLS) if groq_client else (openrouter_client, MODEL_FAST)
        case "deep":
            return (mistral_client, MODEL_DEEP) if mistral_client else (openrouter_client, MODEL_FAST)
        case _:
            return (openrouter_client, MODEL_FAST) if openrouter_client else (mistral_client, MODEL_DEEP)
