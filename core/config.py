"""All environment variables and constants. Single source of truth for the entire app."""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.local")

logger = logging.getLogger(__name__)

# ── API Keys ─────────────────────────────────────────────────────────────────
MISTRAL_API_KEY    = os.getenv("MISTRAL_API_KEY")      # Router + deep research
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")   # Conversation
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")         # Tools
DISCORD_BOT_TOKEN  = os.getenv("DISCORD_BOT_TOKEN")
TAVILY_API_KEY     = os.getenv("TAVILY_API_KEY")

if not MISTRAL_API_KEY:
    logger.warning("MISTRAL_API_KEY not set — router and deep research unavailable")
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not set — tool execution unavailable")
if not OPENROUTER_API_KEY:
    logger.warning("OPENROUTER_API_KEY not set — conversation unavailable")

# ── LLM Models ───────────────────────────────────────────────────────────────
MODEL_DEEP    = "mistral-small-latest"                 # Router + deep research
MODEL_FAST    = "meta-llama/llama-3.1-8b-instruct"     # OpenRouter conversation
MODEL_TOOLS   = "llama-3.3-70b-versatile"              # Groq tool execution

# ── Server ───────────────────────────────────────────────────────────────────
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
SERVER_URL  = f"http://127.0.0.1:{SERVER_PORT}"

MOBILE_API_KEY = os.getenv("MOBILE_API_KEY", "")

# ── Memory ───────────────────────────────────────────────────────────────────
CHROMA_PATH                 = Path(__file__).parent.parent / "data" / "chroma"
MEMORY_SIMILARITY_THRESHOLD = 0.55
MEMORY_MAX_RESULTS          = 5
MEMORY_DEDUP_THRESHOLD      = 0.95

MEMORY_DIR           = Path(__file__).parent.parent / "data" / "memories"
MEMORY_CHAR_LIMIT    = 8000
USER_CHAR_LIMIT      = 4000
MEMORY_AUTOSAVE_INTERVAL = 3

# ── Obsidian Vault ─────────────────────────────────────────────────────────────
OBSIDIAN_VAULT_PATH  = os.getenv("OBSIDIAN_VAULT_PATH", str(Path.home() / "Documents" / "Obsidian Vault"))
OBSIDIAN_AURA_FOLDER = os.getenv("OBSIDIAN_AURA_FOLDER", "AURA")
VAULT_SIMILARITY_THRESHOLD = 0.35

# ── Voice ─────────────────────────────────────────────────────────────────────
UI_SOCKET_PORT = 9_001
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge")
TTS_VOICE = os.getenv("TTS_VOICE", "en-US-AvaNeural")

PICOVOICE_KEY   = os.getenv("PICOVOICE_KEY")
_wake_word_path = os.getenv("WAKE_WORD_PATH")
WAKE_WORD_PATH: Path | None = (
    Path(_wake_word_path).expanduser() if _wake_word_path else None
)
