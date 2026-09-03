# AURA Mobile V2 — Briefing

## The Main Project: AURA V2
A locally-hosted AI companion that runs 24/7 on a Windows PC. Three components in one Python process:

**Backend** (`C:\AURA_V2` — Python 3.14, FastAPI, port 8000):
- Multi-provider LLM routing: Mistral (classifier), Groq (tools), OpenRouter (chat)
- 36 LLM-callable tools: volume, apps, files, clipboard, keyboard, power, web search, YouTube, WhatsApp, Discord, Obsidian vault
- Voice pipeline: wake word ("hey_jarvis"), push-to-talk, faster-whisper STT, 3 TTS engines (Edge/Supertonic/Kokoro)
- Memory: ChromaDB vector store + curated Markdown files (USER.md, MEMORY.md) + Obsidian vault integration
- Communications: Discord DM bot, WhatsApp Web (Playwright), phone notification relay
- Daily briefings, macro recorder, activity tracker, browser automation (Playwright)

**Frontend** (`C:\AURA_V2_UI` — Next.js 16, Tauri v2, TypeScript):
- JARVIS-style dark HUD with canvas-rendered plasma orb (4 states: idle/listening/processing/speaking)
- 9 sidebar views: Home, Chat, Memory, Actions, Stats, Processes, Notes, Glances, Settings
- Right panel: weather, calendar, telemetry rings (CPU/RAM/Disk/Battery), quick actions
- Real-time WebSocket push from backend (state, chat streaming, Discord, briefings)
- PySide6 Dynamic Island overlay (floating pill with clock, tasks, media, performance)

**Protocol**: REST (`localhost:8000`) + WebSocket (`localhost:8000/ws`) + TCP socket bridge (port 9001)

---

## What Was AURA Mobile?
An Android AI companion app (Expo SDK 57 / React Native 0.86.2). Three capabilities:
1. **Chat** — Talk to the same LLM backend via WebSocket
2. **Remote control** — Execute actions on the phone (volume, brightness, apps) and on the PC (lock, shutdown, clipboard)
3. **Accessibility automation** — Read the Android accessibility tree, find UI elements, and tap/scroll/type to automate WhatsApp, Instagram, settings, etc.

## What Did It Have?
- **Orb** — Animated state indicator (14 states)
- **Chat screen** — Conversation with message history, tool cards, memory badges
- **Task router** — Regex-based intent classifier (26+ intents) routing to MOBILE/PC/CHAT
- **TTS** — 3 engines (expo-audio, backend WebSocket, expo-speech)
- **182 passing tests** — Routing + accessibility tree tests

## Why Did It Fail?
1. Scope explosion — 13 tabs built before chat worked
2. Silent failures — no error boundaries
3. Build fragility — native module half-done
4. TTS bug — expo-audio vendor issue
5. 3 conflicting design docs — no single source of truth
6. No CI/CD

## What Are We Doing Now?
Rebuilding the mobile app from scratch. Legacy code archived at `C:\AURA_V2\legacy\aura-mobile`.

**Full technical deep-dive:** `C:\AURA_V2\legacy\aura-mobile\AURA_MOBILE_V2_BRIEFING.md` (696 lines)

## V2 Rules
1. Chat first — everything else is secondary
2. No silent failures — every error visible
3. Build incrementally — core first, features second
4. Backend is immutable — don't change the daemon
5. TTS needs reliable fallbacks
6. CI from day 1
