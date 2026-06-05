"""All environment variables and constants. Single source of truth for the entire app."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.local")

# ── API Keys ─────────────────────────────────────────────────────────────────
MISTRAL_API_KEY    = os.getenv("MISTRAL_API_KEY")      # Mistral — deep/research
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")   # OpenRouter — fast/casual
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")         # Groq — free tool calling
DISCORD_BOT_TOKEN  = os.getenv("DISCORD_BOT_TOKEN")
TAVILY_API_KEY     = os.getenv("TAVILY_API_KEY")

_MISSING = [k for k, v in {
    "MISTRAL_API_KEY":    MISTRAL_API_KEY,
    "OPENROUTER_API_KEY": OPENROUTER_API_KEY,
    "GROQ_API_KEY":       GROQ_API_KEY,
}.items() if not v]
if _MISSING:
    sys.exit(f"[config] Missing required environment variables: {', '.join(_MISSING)}")

# ── LLM Models ───────────────────────────────────────────────────────────────
MODEL_DEEP  = "mistral-small-latest"                   # Mistral — free tier, smart
MODEL_FAST  = "meta-llama/llama-3.1-8b-instruct"      # OpenRouter — fast/casual
MODEL_TOOLS = "llama-3.1-8b-instant"                   # Groq — free, great at function calling

# ── Server ───────────────────────────────────────────────────────────────────
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8000
SERVER_URL  = f"http://{SERVER_HOST}:{SERVER_PORT}"

# ── Memory ───────────────────────────────────────────────────────────────────
CHROMA_PATH                 = Path(__file__).parent.parent / "data" / "chroma"
MEMORY_SIMILARITY_THRESHOLD = 0.35
MEMORY_MAX_RESULTS          = 5
MEMORY_DEDUP_THRESHOLD      = 0.95

# Curated (file-based) memory
MEMORY_DIR           = Path(__file__).parent.parent / "data" / "memories"
MEMORY_CHAR_LIMIT    = 2200   # max chars for agent's self-memories (MEMORY.md)
USER_CHAR_LIMIT      = 1375   # max chars for user profile (USER.md)
MEMORY_NUDGE_INTERVAL = 10   # turns between memory-save reminders

# ── Voice ─────────────────────────────────────────────────────────────────────
UI_SOCKET_PORT = 9_001

# Supertonic voice style name. 10 built-ins: M1-M5 (male), F1-F5 (female).
TTS_VOICE = os.getenv("TTS_VOICE", "M1")

PICOVOICE_KEY   = os.getenv("PICOVOICE_KEY")
_wake_word_path = os.getenv("WAKE_WORD_PATH")
WAKE_WORD_PATH: Path | None = (
    Path(_wake_word_path).expanduser() if _wake_word_path else None
)