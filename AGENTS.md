# AGENTS.md — Working with AURA V2

## What This Project Is

AURA V2 is a Windows-only, locally-hosted AI companion daemon. Three threads run in parallel: a FastAPI backend (port 8000), a voice pipeline (wake word + PTT + STT + TTS), and a Discord bot. A separate UI repo (`C:\AURA_V2_UI`) provides a Next.js HUD wrapped in Tauri v2 and a PySide6 Dynamic Island overlay.

## Running the Project

```powershell
.\venv\Scripts\Activate.ps1
python main.py          # Starts all 3 threads + waits for health check
```

Tests require the server to be running first:
```powershell
python Test.py          # Integration tests hitting localhost:8000/chat
```

Unit tests (if any exist in `tests/`):
```powershell
python -m pytest tests/
```

## Project Layout

```
C:\AURA_V2\
  main.py              # Entry point — launches 3 daemon threads
  Test.py              # Integration tests (requires running server)
  requirements.txt     # Python deps (24 packages — some imports are missing from this file)
  .env.local           # API keys (NEVER commit)
  .env.example         # Template for env vars

  core/                # Backend brain
    config.py          # All env vars, model names, thresholds
    server.py          # FastAPI app (~998 lines), 20+ endpoints, WebSocket, socket bridge
    agent.py           # Agent loop (~473 lines), system prompt (AURA_PERSONA), tool dispatch
    router.py          # LLM routing (Mistral classifier + keyword fallback, 3 models)

  tools/               # 36 LLM-callable tools
    registry.py        # Tool schemas (OpenAI function-calling format)
    system.py          # Volume, apps, files, clipboard, notes, input, power
    web.py             # Tavily + DuckDuckGo search, RSS news, YouTube
    media.py           # Now-playing detection via Win32 window titles
    browser_agent.py   # Playwright singleton — z_agent_submit, scrape_website, browser_control
    whatsapp_web.py    # WhatsApp Web messaging via Playwright
    study.py           # Quiz, summarize, draft from Obsidian vault notes
    hotkeys.py         # Global hotkeys (Alt+M stops TTS)
    tracker.py         # Foreground window tracker (polls every 30s)
    audio_manager.py   # COM-threaded audio manager via pycaw

  voice/               # Voice pipeline
    pipeline.py        # Main loop (~504 lines): wake word, PTT, STT, TTS, intent intercepts
    tts.py             # 3 TTS engines: Supertonic, Edge (default), Kokoro
    stt.py             # Speech recording + faster-whisper transcription
    emotion.py         # Emotion tag parser for TTS
    wake.py            # openwakeword "hey_jarvis" detection
    audio_utils.py     # Audio utility functions

  memory/              # Memory system
    chroma_store.py    # ChromaDB vector store (~290 lines), cosine similarity, dedup
    store.py           # Curated file memory (USER.md, MEMORY.md), drift detection
    context.py         # Live context injection (weather + time)
    memory_tool.py     # LLM-callable memory handler (add/replace/remove/search/list)
    vault.py           # Obsidian vault integration (search/read/create/append/delete/list/reindex)

  comms/               # Communications
    discord_bot.py     # Discord DM bot, single + auto mode, importance classifier
    state.py           # Shared state between comms modules

  data/                # Runtime data (gitignored except structure)
    chroma/            # ChromaDB persistent storage
    memories/          # USER.md, MEMORY.md
    tasks.json         # Calendar/task entries
    notes.json         # Notes backend
    friends.json       # Discord friend ID mapping
    .vault_index.json  # Obsidian vault note index
```

## LLM Routing

Three providers, routed by task (`core/router.py`):

| Role | Provider | Model | Notes |
|------|----------|-------|-------|
| Classifier | Mistral | `mistral-small-latest` | Determines if tools are needed. Has keyword fallback (~50 patterns) if Mistral is unreachable. |
| Conversation | OpenRouter | `meta-llama/llama-3.1-8b-instruct` | Casual chat, no tools. |
| Tools | Groq | `llama-3.3-70b-versatile` | Native `<function=name>` text format. NOT OpenAI `tools=` parameter. |
| Deep/Summary | Mistral | `mistral-small-latest` | Post-tool-loop summarization, research. |

The classifier in `router.py` uses a structured TRUE/FALSE prompt. Keyword fallback in `_TOOL_KEYWORDS` catches common patterns if the API is down.

## Tool System

36 tools defined in `tools/registry.py`. Dispatched in `core/agent.py:_run_tool()`.

### Native Function Format

Groq uses text-based `<function=name>` calls, NOT JSON `tools=`. Parser: `core/agent.py:_parse_native_function()`.

```
<function=open_website {"url":"https://example.com"}<function=open_website>
<function=get_system_stats<function=get_system_stats>
```

Regex: `<function=(\w+)[=>\s]*(\{.*?\})?\s*(?:</function>|<function=\1>)`

### Tool Loop

- `MAX_TOOL_ROUNDS = 3` per user message
- After tools execute, Mistral generates the final summary response
- `_scrub()` strips leaked `<function>` tags from streaming output but preserves voice tags like `<laugh>`

### Important: Undispatched Tools

`browser_control` is registered in `tools/registry.py` but has NO `case` branch in `_run_tool()`. If the LLM calls it, it returns `{"error": "Unhandled tool: browser_control"}`. Do NOT add more tools to the registry without adding a corresponding dispatch case.

## How to Make Changes

### Adding a new tool
1. Add schema to `tools/registry.py` (OpenAI function-calling format)
2. Add `case "tool_name":` branch in `core/agent.py:_run_tool()`
3. Implement the function in the appropriate `tools/*.py` file
4. If the tool needs new keywords for classifier routing, add them to `_TOOL_KEYWORDS` in `core/router.py`

### Adding a new API endpoint
1. Add route in `core/server.py`
2. If the UI needs it, add the fetch call in `C:\AURA_V2_UI\src\lib\api.ts`

### Adding a new widget (UI)
1. Create component in `C:\AURA_V2_UI\src\components\widgets/`
2. Register in `WidgetManager.tsx` and the Zustand store (`aura-store.ts`)
3. Add toggle in `TopBar.tsx`

### Modifying the system prompt
The system prompt is assembled in `core/agent.py:_build_system_prompt()`. The persona template is the `AURA_PERSONA` constant. Memory, contacts, live context, and vault snippets are injected dynamically.

### Modifying tool routing
Keywords live in `core/router.py:_TOOL_KEYWORDS`. The classifier prompt is in `router.py` as `_CLASSIFIER_SYSTEM`. If tools aren't being triggered, check both the keywords and the classifier prompt.

## Conventions

- **Python 3.14**, Windows-only
- **No comments** in code unless explicitly asked
- **No unit test framework** assumed — `Test.py` is integration-only (hits running server). `tests/` has isolated unit tests using pytest.
- **Thread safety**: `_turns_since_memory` is a module global — NOT thread-safe. Don't add more globals.
- **Env vars**: Read from `.env.local` via `python-dotenv`. See `.env.example` for the template.
- **TTS default is `edge`** in config.py, but `.env.local` overrides to `supertonic`. Check `.env.local` for actual provider.
- **Playwright** is used for browser automation (z_agent_submit, scrape_website, browser_control, whatsapp_web)
- **PyAutoGUI** is used for keyboard/mouse automation outside the browser
- **pynput** is used for global hotkeys and PTT detection
- **COM threading** (`pycaw`, `comtypes`) for Windows audio control
- **ChromaDB** uses `all-MiniLM-L6-v2` embeddings (384-dim), cosine similarity
- **Curated memory** files (USER.md, MEMORY.md) have char limits and drift detection via SHA-256

## Known Issues

1. **`browser_control` tool is registered but not dispatched** — no `case` in `_run_tool()`. Will error if called.
2. **`requirements.txt` is incomplete** — `playwright`, `pynput`, `pyautogui`, `pyperclip`, `openai`, `tavily`, `requests`, `discord.py` are imported but not listed. They're installed manually or via other means.
3. **`memory/memory_tool.py` has a dead `forget` action stub** — returns "not yet implemented", not in schema enum, LLM never calls it.
4. **`voice/wake.py` imports non-existent `WhisperSTT`** from `voice.stt` — dead code, not imported anywhere.
5. **`tools/tracker.py` exists but is not imported in `_run_tool()` or the registry.**
6. **Classifier model comments in `agent.py` docstring say "Gemini 1.5 Flash"** — actual code uses Mistral Small. Docstring is stale.
7. **No CI/CD** — manual testing only.
8. **`_turns_since_memory` global is not thread-safe** for concurrent requests.

## Verification

After making changes:
1. Start the server: `python main.py`
2. Wait for health check to pass
3. Run `python Test.py` for integration coverage
4. Check `python -m pytest tests/` for unit tests
5. Manually test affected endpoints via curl or the UI

## UI Repo

The UI lives at `C:\AURA_V2_UI` (separate git repo). Key facts:
- **Next.js 16** + **Tauri v2** desktop wrapper + **PySide6** Dynamic Island overlay
- **75 total components** (18 custom + 9 widgets + 48 shadcn/ui primitives)
- **Zustand** for state, **React Query** for server state, **Framer Motion** for animations
- All API calls go to `http://localhost:8000` (the FastAPI backend)
- WebSocket at `ws://localhost:8000/ws` for real-time state push
- Widgets are draggable + resizable, animate in/out with Genie effect
- Island polls tasks every 5s, shows clock + weather + calendar + perf + media
