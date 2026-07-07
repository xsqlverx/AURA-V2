"""LLM routing — classifier (Gemini), convo (OpenRouter), tools (Groq), research (Mistral)."""

import logging

from openai import AsyncOpenAI

from core.config import (
    GEMINI_API_KEY,
    MISTRAL_API_KEY,
    OPENROUTER_API_KEY,
    GROQ_API_KEY,
    MODEL_DEEP,
    MODEL_FAST,
    MODEL_TOOLS,
)

logger = logging.getLogger(__name__)

# ── Clients ──────────────────────────────────────────────────────────────────

gemini_client = AsyncOpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

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

# ── Intent Classifier (Gemini 1.5 Flash) ──────────────────────────────────────
# Replaces the old brittle needs_tools() keyword-matcher with a lightweight LLM
# call that asks Gemini 1.5 Flash for a strict TRUE / FALSE answer.

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

CLASSIFIER_MODEL = "gemini-1.5-flash"


async def classify_intent(message: str) -> bool:
    """Use Gemini 1.5 Flash to determine if the message requires tools/web access.
    Returns True for tool-requiring messages, False for pure conversation."""
    try:
        response = await gemini_client.chat.completions.create(
            model=CLASSIFIER_MODEL,
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
        logger.error("Gemini classifier failed: %s. Defaulting to FALSE (conversation).", e)
        return False


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
            return (openrouter_client, MODEL_FAST) if openrouter_client else (gemini_client, CLASSIFIER_MODEL)
        case "tools":
            return (groq_client, MODEL_TOOLS) if groq_client else (gemini_client, CLASSIFIER_MODEL)
        case "deep":
            return (mistral_client, MODEL_DEEP) if mistral_client else (gemini_client, CLASSIFIER_MODEL)
        case _:
            return (openrouter_client, MODEL_FAST) if openrouter_client else (gemini_client, CLASSIFIER_MODEL)
