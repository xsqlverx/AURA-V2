# AGENTS.md — AURA V2

## Quick Start

```bash
# Activate venv first
.\venv\Scripts\Activate.ps1

# Run AURA (starts FastAPI on port 8000 + voice pipeline + Discord bot)
python main.py

# Run tests (requires server running on localhost:8000)
python Test.py
```

Server must be UP before running tests. `Test.py` hits `http://localhost:8000/chat`.

## Architecture

AURA is a **multi-threaded daemon** — not a simple script. Three threads run in parallel:

| Thread | File | Purpose |
|--------|------|---------|
| FastAPI backend | `core/server.py` | REST API + WebSocket on port 8000 |
| Voice pipeline | `voice/pipeline.py` | Wake word + PTT + STT + TTS loop |
| Discord bot | `comms/discord_bot.py` | DM handler, importance classifier |

Socket bridge: TCP port 9001 connects voice pipeline and Discord bot to the HUD UI (`C:\AURA_V2_UI\`). Two compiled Tauri v2 desktop apps live alongside the Next.js source:

| App | Path | Purpose |
|-----|------|---------|
| Desktop EXE | `C:\AURA_V2_UI\aura-desktop\` | Wraps Next.js static export — 1280×800 resizable window, frontend-only |
| Dynamic Island | `C:\AURA_V2_UI\dynamic-island\` | Frameless transparent always-on-top pill overlay — 3 states (collapsed/expanded/full), WebSocket → AURA backend |

## LLM Routing

Three providers, three modes (`core/router.py`):

| Mode | Provider | Model | Use |
|------|----------|-------|-----|
| `deep` | Mistral | `mistral-small-latest` | Smart conversation, research |
| `fast` | OpenRouter | `meta-llama/llama-3.1-8b-instruct` | Casual, low-latency |
| `tools` | Groq | `llama-3.3-70b-versatile` | Function calling |

`needs_tools()` in `core/router.py:51` does keyword-based classification (99 patterns) to route between conversation and tool paths.

## Tool System

**31+ tools** defined in `tools/registry.py`, dispatched in `core/agent.py:_run_tool()`.

### Native Function Format

Groq Llama 3.3 uses native `<function=name>` text format (NOT OpenAI `tools=` parameter — that causes errors). Parser: `core/agent.py:_parse_native_function()`.

```
<function=open_website {"url":"https://youtube.com"}<function=open_website>
<function=get_system_stats<function=get_system_stats>   (no-args tools)
```

Regex: `<function=(\w+)[=>\s]*(\{.*?\})?\s*(?:</function>|<function=\1>)`

### Tool Loop

- `MAX_TOOL_ROUNDS = 3` — agent can call up to 3 tools per user message
- After tools execute, a final streaming LLM call (Mistral) generates the summary response
- `_scrub()` strips leaked `<function>` tags from streaming output

### One-Shot Guard

`open_z_agent` has a 10-second cooldown (`tools/system.py:_last_z_agent_call`) to prevent the LLM from re-calling it in a loop.

## Browser Automation

New in v2: AURA now uses **Playwright** (`tools/browser_agent.py`) instead of brittle PyAutoGUI screen coordinates for browser interactions. A singleton Playwright browser is reused across calls.

| Function | Purpose |
|----------|---------|
| `z_agent_submit(prompt)` | Opens `chat.z.ai` in a headed browser, toggles Agent mode via DOM selectors (falls back to coords), types prompt, submits |
| `scrape_website(url)` | Opens URL in headless browser, waits for JS render, returns visible body text |

## Key Files

| File | Lines | What it does |
|------|-------|--------------|
| `core/agent.py` | 363 | Agent loop, system prompt (`AURA_PERSONA`), tool dispatch, native function parser |
| `core/router.py` | 72 | LLM client selection, keyword classifier |
| `core/server.py` | 851 | FastAPI app, 20+ endpoints, WebSocket, socket bridge, briefing pipeline |
| `core/config.py` | 59 | All env vars, model names, memory thresholds |
| `tools/registry.py` | 50 | Tool schemas (OpenAI function-calling format) |
| `tools/system.py` | 297 | System tools (volume, apps, files, clipboard, notes, input, web) |
| `tools/browser_agent.py` | 146 | Playwright singleton — `z_agent_submit`, `scrape_website` |
| `tools/web.py` | 109 | Tavily + DuckDuckGo search, RSS news |
| `tools/media.py` | 187 | Now-playing detection via Win32 window titles |
| `voice/pipeline.py` | 598 | Main voice loop: wake word, PTT, STT, TTS, intent intercepts |
| `voice/tts.py` | 307 | 3 TTS engines: Supertonic, Edge, Kokoro |
| `memory/chroma_store.py` | 246 | ChromaDB vector store (cosine similarity, dedup, CRUD) |
| `memory/store.py` | 234 | Curated file memory (USER.md, MEMORY.md, drift detection) |
| `memory/memory_tool.py` | 128 | Memory agent tool — add, replace, remove, search, list |

## Platform Constraints

**Windows-only.** Uses:
- Win32 APIs (`EnumWindows`, `GetWindowTextW`, `GetForegroundWindow`)
- COM threading (`pycaw`, `comtypes`) for audio control
- `pyautogui` for keyboard/mouse automation (non-browser tools)
- `playwright` for browser automation (z.ai + web scraping)
- `pynput` for global hotkeys and PTT

## Configuration

`.env.local` required (see `.env.example`):

```
MISTRAL_API_KEY=     # Required — Mistral AI
OPENROUTER_API_KEY=  # Required — OpenRouter
GROQ_API_KEY=        # Required — Groq
DISCORD_BOT_TOKEN=   # Optional — Discord bot
TAVILY_API_KEY=      # Optional — Web search (falls back to DuckDuckGo)
TTS_PROVIDER=        # supertonic | edge | kokoro (default: supertonic)
TTS_VOICE=           # Engine-specific voice name
```

Python 3.14.3. All deps in `requirements.txt` (21 packages).

## Memory System

Three layers:

| Layer | File | Purpose |
|-------|------|---------|
| ChromaDB vectors | `memory/chroma_store.py` | Semantic search, dedup (cosine > 0.95) |
| Curated files | `memory/store.py` | USER.md (1375 chars), MEMORY.md (2200 chars) |
| Live context | `memory/context.py` | Weather + time injection |

Memory tool: `memory/memory_tool.py` — actions: add, replace, remove, search, list.

## Testing

`Test.py` — 15 integration tests across 14 categories:
- Audio, Media, Apps, Files, Web, System, Clipboard, Notes, Input, Memory, Z.ai Agent, Briefing, Conversation, Edge Cases
- Tests hit the `/chat` API endpoint with `stream=True`
- `SKIP_SHUTDOWN=True` by default (skips dangerous system tests)

## Gotchas

- **`.env.local` contains live API keys** — never commit, check git history
- **`_scrub()` strips XML tags** from LLM output — including leaked `<function>` tags
- **Native function format is text-based** — parser uses regex, not JSON
- **`needs_tools()` is keyword-based** — can false-positive on casual conversation
- **Voice pipeline is blocking** — `page.wait_for_timeout()` in `z_agent_submit` blocks the event loop
- **No unit tests** — only integration tests via `Test.py`
- **No CI/CD** — manual testing only
- **`_turns_since_memory` is a global** — not thread-safe for concurrent requests
