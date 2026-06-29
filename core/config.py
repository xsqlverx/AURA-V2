"""All environment variables and constants. Single source of truth for the entire app."""

import os
import sys
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
MODEL_TOOLS = "llama-3.3-70b-versatile"               # Groq — reliable function calling

# ── Server ───────────────────────────────────────────────────────────────────
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
# Internal URL for local clients (voice pipeline, Discord bot, etc. connect here)
SERVER_URL  = f"http://127.0.0.1:{SERVER_PORT}"

# Mobile API key for external access (Tailscale + auth)
MOBILE_API_KEY = os.getenv("MOBILE_API_KEY", "")

# ── Memory ───────────────────────────────────────────────────────────────────
CHROMA_PATH                 = Path(__file__).parent.parent / "data" / "chroma"
MEMORY_SIMILARITY_THRESHOLD = 0.35
MEMORY_MAX_RESULTS          = 5
MEMORY_DEDUP_THRESHOLD      = 0.95

# Curated (file-based) memory
MEMORY_DIR           = Path(__file__).parent.parent / "data" / "memories"
MEMORY_CHAR_LIMIT    = 2200   # max chars for agent's self-memories (MEMORY.md)
USER_CHAR_LIMIT      = 1375   # max chars for user profile (USER.md)
MEMORY_AUTOSAVE_INTERVAL = 3   # turns between proactive memory-save nudges

# ── Obsidian Vault ─────────────────────────────────────────────────────────────
OBSIDIAN_VAULT_PATH  = os.getenv("OBSIDIAN_VAULT_PATH", str(Path.home() / "Documents" / "Obsidian Vault"))
OBSIDIAN_AURA_FOLDER = os.getenv("OBSIDIAN_AURA_FOLDER", "AURA")
VAULT_SIMILARITY_THRESHOLD = 0.35

# ── Voice ─────────────────────────────────────────────────────────────────────
UI_SOCKET_PORT = 9_001

# TTS provider: "supertonic", "edge", or "kokoro".
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge")

# Edge / Kokoro voice name (default: en-US-AvaNeural for Edge, af_bella for Kokoro)
TTS_VOICE = os.getenv("TTS_VOICE", "en-US-AvaNeural")

PICOVOICE_KEY   = os.getenv("PICOVOICE_KEY")
_wake_word_path = os.getenv("WAKE_WORD_PATH")
WAKE_WORD_PATH: Path | None = (
    Path(_wake_word_path).expanduser() if _wake_word_path else None
)