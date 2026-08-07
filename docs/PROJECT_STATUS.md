# AURA — Project Status (Updated)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  AURA Backend (C:\AURA_V2)                      │
│  FastAPI on port 8000                            │
│  - /weather (Open-Meteo)                        │
│  - /tasks (CRUD, stored in data/tasks.json)     │
│  - /chat, /memory, /discord, /voice, ...        │
│  - WebSocket /ws (STATE:, USER:, etc.)          │
└──────────────────────┬──────────────────────────┘
                       │ HTTP + WS
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌─────────────────┐ ┌──────┐ ┌──────────────┐
│  HUD (Next.js)  │ │Python│ │  Dynamic     │
│  Tauri desktop  │ │Island│ │  Island      │
│  app            │ │Pill  │ │  (PySide6)   │
│  port 3000      │ │      │ │              │
│                 │ │      │ │  Pill with   │
│  Widgets:       │ │Hover │ │  clock +     │
│  - Chat         │ │panel │ │  weather +   │
│  - Discord      │ │with  │ │  task peek   │
│  - Music        │ │tasks │ │              │
│  - Notes        │ │      │ │              │
│  - Memory       │ │      │ │              │
│  - System Stats │ │      │ │              │
│  - Quick Actions│ │      │ │              │
│  - Voice        │ │      │ │              │
│                 │ │      │ │              │
│  Island Panel   │ │      │ │              │
│  (right slide)  │ │      │ │              │
└─────────────────┘ └──────┘ └──────────────┘
```

## What's Built

### Backend (`C:\AURA_V2\core\server.py` — 998 lines)
- [x] Weather endpoint (`/weather`) — Open-Meteo + ip-api, cached 30min
- [x] Tasks CRUD (`GET/POST/DELETE /tasks`) — stored in `data/tasks.json`
- [x] WebSocket `/ws` — broadcasts `STATE:idle|listening|thinking|speaking`
- [x] Chat, memory, Discord, voice, system, media, notes, etc.
- [x] Curated memory CRUD (`/curated-memory`)
- [x] Voice options/select (`/voice/options`, `/voice/select`)
- [x] Mobile API key auth (`MOBILE_API_KEY`)

### Agent Loop (`C:\AURA_V2\core\agent.py` — 473 lines)
- [x] 3-round tool execution with Groq Llama 70B
- [x] Mistral classifier with keyword fallback
- [x] YouTube play priority guard (bypasses classifier)
- [x] Vault context injection into system prompt
- [x] WhatsApp contacts injection
- [x] Memory auto-nudge every 3 turns
- [x] Tag scrubber (`_scrub()`) — strips function tags, preserves voice tags

### Tools (36 total)
- [x] Audio: `set_volume`, `get_volume`, `mute_audio`
- [x] Media: `play_pause`, `next_track`, `prev_track`
- [x] Apps: `launch_app`, `list_running_processes`
- [x] Files: `open_path`, `create_folder`, `list_directory`
- [x] Web: `web_search`, `open_website`, `play_youtube`, `open_z_agent`, `scrape_website`, `browser_control`
- [x] System: `get_system_stats`, `shutdown`, `restart`, `sleep_pc`, `lock_pc`, `lock_screen`, `cancel_shutdown`
- [x] Clipboard: `clipboard_copy`, `clipboard_paste`
- [x] Vault: `vault` (search, read, create, append, delete, list, reindex)
- [x] Study: `study` (quiz, summarize, draft from vault notes)
- [x] Input: `type_text`, `press_key`, `execute_hotkey`
- [x] Comm: `send_whatsapp`
- [x] Calendar: `create_task`, `list_tasks`, `delete_task`
- [x] Memory: `memory` (add, replace, remove, search, list)
- [ ] `browser_control` registered but NOT dispatched (no case in `_run_tool()`)

### Voice Pipeline (`voice/pipeline.py` — 504 lines)
- [x] Wake word detection (openwakeword "hey_jarvis")
- [x] Push-to-talk (Right Shift via pynput)
- [x] Speech recording with energy-based VAD
- [x] Speech-to-text (faster-whisper base, CPU int8)
- [x] Three TTS engines: Edge (default), Supertonic, Kokoro
- [x] Inline emotion/expression tags
- [x] Voice switching via voice command
- [x] Intent intercepts (briefing, Discord reply, auto-convo)

### Memory System
- [x] ChromaDB vector store (cosine similarity, dedup at 0.95)
- [x] Curated file memory (USER.md / MEMORY.md) with drift detection
- [x] Live context injection (weather + time)
- [x] Hermes-style behavioral guidance in memory tool schema
- [x] Obsidian vault integration (`memory/vault.py` — 234 lines)

### Discord Bot (`comms/discord_bot.py` — 259 lines)
- [x] DM-only handler
- [x] Single mode (manual reply) + auto mode (autonomous)
- [x] Importance classifier (LLM-based)
- [x] 5-minute auto-convo timeout
- [x] Session management via REST API

### Next.js HUD (`C:\AURA_V2_UI`)
- [x] **75 total components** (18 custom + 9 widgets + 48 shadcn/ui)
- [x] TopBar — weather, clock, 8 widget toggles, connection status, Island toggle
- [x] Central Orb — 4 states (idle/listening/thinking/speaking) with rotating rings
- [x] WidgetManager — draggable + resizable widgets with Genie effect animations
- [x] ChatWidget — scrollable messages, streaming text
- [x] DiscordWidget — message log, friends list, session management
- [x] SystemStatsWidget — CPU/RAM animated progress bars
- [x] MusicPlayerWidget — track info, controls, album art
- [x] NotesWidget — rich text notes synced to backend
- [x] MemoryWidget — dual-tab (All/Curated), search, CRUD
- [x] QuickActionsWidget — Volume Up/Down, Mute, Lock, Sleep, Restart
- [x] VoiceWidget — voice selector with live switching
- [x] IslandPanel — right-slide panel with Calendar/Performance/Media tabs
- [x] BriefingMode — full-screen shift with weather, news, stats, streaming subtitles
- [x] BootSequence — sci-fi startup animation
- [x] NotificationFeed — toast notifications (info/success/warning/error)
- [x] AudioWaveform — circular waveform visualizer
- [x] Background — grid overlay, grain texture, edge glow, corner brackets

### Tauri Desktop (`C:\AURA_V2_UI\aura-desktop`)
- [x] Tauri v2 wrapper — 1280x800 resizable window
- [x] Static export from Next.js (`out/` directory)
- [x] `cargo tauri dev` for hot reload, `cargo tauri build` for standalone exe

### Dynamic Island (`C:\AURA_V2_UI\aura_island` — PySide6)
- [x] Floating pill — matte black, 22px corner radius
- [x] 4 AURA states (idle/listening/thinking/speaking)
- [x] Clock + weather in pill
- [x] Hover to expand — shows calendar + task peek
- [x] Tasks fetched from backend `/tasks`, refreshes every 5s
- [x] Animated transitions (easeOutExpo, 0.6s)

## How to Run

```powershell
# Terminal 1: Backend
cd C:\AURA_V2
.\venv\Scripts\Activate.ps1
python main.py

# Terminal 2: HUD (browser — fast iteration)
cd C:\AURA_V2_UI
npm run dev

# Terminal 2 alt: HUD (desktop window — hot reload)
cd C:\AURA_V2_UI\aura-desktop
cargo tauri dev

# Terminal 3: Dynamic Island overlay
cd C:\AURA_V2_UI
npm run island
```

## Build Ship

```powershell
cd C:\AURA_V2_UI\aura-desktop
cargo tauri build
# exe at: aura-desktop\src-tauri\target\release\aura-desktop.exe
```

## Testing

```powershell
# Backend integration tests (server must be running)
cd C:\AURA_V2
python Test.py

# Unit tests
cd C:\AURA_V2
python -m pytest tests/
```

## Known Issues

1. `browser_control` tool registered but not dispatched — no case in `_run_tool()`
2. `requirements.txt` incomplete — many packages imported but not listed
3. `memory/memory_tool.py` has dead `forget` action stub
4. `voice/wake.py` imports non-existent `WhisperSTT` — dead code
5. `tools/tracker.py` exists but unused (not in registry or dispatch)
6. `_turns_since_memory` global not thread-safe
7. No CI/CD — manual testing only

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Island framework | PySide6 | Rust looked "trash" after 2 attempts |
| HUD framework | Next.js + Tauri | Web-based UI, fast iteration |
| Expandable pill | Single window, dynamic resize | Cleaner than full-screen overlay |
| Click-through | Never enable WS_EX_TRANSPARENT | Layered windows pass clicks through transparent pixels naturally |
| Task storage | Backend `data/tasks.json` | Single source of truth for HUD + island |
| Task refresh | Island polls every 5s | Simple, no need for WS push for tasks |
| Animations | easeOutExpo (0.6s) | Matches Apple Dynamic Island feel |
| Weather source | Open-Meteo + ip-api.com | Free, no API key, accurate |
| TTS default | Edge TTS | Changed from Supertonic |
| LLM classifier | Mistral Small | Changed from Gemini (stale docstring) |
