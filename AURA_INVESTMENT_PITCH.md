# AURA V2 — Investment Pitch Deck

> **Your Personal AI Companion. Entirely Local. Entirely Yours.**
>
> Aura is not another chatbot. She is a fully autonomous, voice-enabled, privacy-first AI assistant that lives on your machine — controls your PC, manages your communications, remembers who you are, and is becoming genuinely proactive.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem & The Solution](#2-the-problem--the-solution)
3. [Product Overview](#3-product-overview)
4. [System Architecture](#4-system-architecture)
5. [How Aura "Thinks" — The Agent Loop](#5-how-aura-thinks--the-agent-loop)
6. [Memory System](#6-memory-system)
7. [Voice Pipeline](#7-voice-pipeline)
8. [Communications & Integrations](#8-communications--integrations)
9. [Tool Ecosystem](#9-tool-ecosystem)
10. [Current Features (Implemented)](#10-current-features-implemented)
11. [Phase Roadmap — The Proactive AI Plan](#11-phase-roadmap--the-proactive-ai-plan)
12. [Memory System Roadmap — Hermes Collab](#12-memory-system-roadmap--hermes-collab)
13. [Future Expansion Horizons](#13-future-expansion-horizons)
14. [Technical Specifications](#14-technical-specifications)
15. [Competitive Landscape](#15-competitive-landscape)
16. [Investment Ask](#16-investment-ask)
17. [Appendix: API & Architecture Reference](#17-appendix-api--architecture-reference)

---

## 1. Executive Summary

AURA V2 is a **locally-hosted, multi-model AI companion** that operates at the intersection of three rapidly converging markets: **AI personal assistants**, **voice-enabled computing**, and **privacy-first local AI**.

Unlike cloud-dependent solutions (ChatGPT, Alexa, Google Assistant) that mine your data, charge per-token, and cannot deeply integrate with your operating system, Aura runs **entirely on your Windows machine**, uses **three different LLM providers** routed by task-appropriateness, speaks with **natural expressive voice**, remembers **everything about you in a vector database**, and can **control your PC, manage your Discord, send WhatsApp messages, search the web, and more** — all triggered by wake word or push-to-talk.

**Key differentiators:**
- **100% Local & Private** — Runs on your machine. No cloud dependency for core operations.
- **Multi-Model Intelligence** — Routes queries to the best LLM for the job (Mistral for deep reasoning, Llama 8B for casual chat, Groq Llama 70B for tool-calling).
- **Expressive Voice** — Local TTS with inline emotion tags (`<laugh>`, `<whisper>`, `<sigh>`) for genuinely natural speech.
- **Semantic Memory** — ChromaDB vector database storing 437+ memories with semantic dedup, similarity search, and CRUD.
- **Windows Deep Integration** — Volume, apps, media, shutdown, clipboard, keyboard input, file system, system stats.
- **Communication Hub** — Discord DM bot (auto/single modes), WhatsApp messaging, web search, news aggregation.
- **Proactive Architecture (In Progress)** — Background engine that observes, decides, and acts without waiting for prompts.

**Current State:** Fully operational MVP with 30+ files, 4,000+ lines of production Python, 437 memories in vector DB, Discord bot online, voice pipeline active, 19+ system tools, and a 6-phase proactive roadmap for transformation from reactive to proactive AI.

---

## 2. The Problem & The Solution

### The Problem

| Pain Point | Current Solutions | The Gap |
|---|---|---|
| **Privacy** | ChatGPT, Alexa, Google Assistant all send your data to the cloud | 
| **Deep PC Integration** | Cloud assistants can't control your volume, apps, shutdown, clipboard | No AI that truly lives on and controls your machine |
| **Memory** | Chat assistants have no persistent memory of who you are | No assistant that remembers preferences, habits, corrections across sessions |
| **Voice Quality** | Most TTS is robotic and emotionless | No locally-run assistant with expressive, emotional speech |
| **Communication Management** | No assistant handles your Discord/WhatsApp for you | No AI that acts as your communication proxy |
| **Proactivity** | Every assistant waits for you to ask | No truly proactive assistant that observes and acts on its own |
| **Cost** | Per-token pricing adds up fast | No fixed-cost, unlimited-use local AI |

### The Solution

AURA V2 solves every one of these problems in a single, integrated system:

- **Absolute Privacy:** Everything runs locally. Wake word detection, speech-to-text, text-to-speech, LLM inference (via API to Mistral/OpenRouter/Groq, but with zero data persistence on their end in your context), vector database, file storage — all on your machine.
- **Deep Windows Integration:** 19+ tools that directly manipulate the operating system — volume, media playback, application launching, file management, clipboard, system power management, keyboard input.
- **Persistent Semantic Memory:** ChromaDB vector store with 437+ entries, semantic dedup, cosine similarity search, and a file-based curated memory system (USER.md / MEMORY.md) with drift detection and atomic writes.
- **Expressive Local TTS:** Three engine options — Supertonic (local ONNX, inline emotion tags), Edge TTS (cloud, 100+ voices), Kokoro (local fallback). Emotion tags enable genuinely natural speech with laughter, whispers, sighs, and more.
- **Communication Proxy:** Discord bot with single mode (manual reply approval) and auto mode (fully autonomous, with importance classification). WhatsApp integration via contacts.json + URI protocol.
- **Proactive Engine (In Development):** Background loop that monitors system state, user presence, time patterns, and learns user behavior to suggest and execute actions autonomously.
- **Zero Per-Token Cost:** Fixed API subscription. No usage-based pricing. Unlimited conversations.

---

## 3. Product Overview

### What Aura Can Do Right Now (Live)

**Voice Interaction:**
- Wake word activation ("Hey Jarvis" via openwakeword)
- Push-to-talk (hold Right Shift)
- Speech-to-text (faster-whisper, base model, CPU, int8)
- Text-to-speech (3 engines, 100+ voices, emotion tags)
- Voice switching ("switch to a male voice" → instant change)
- Real-time speaking/idle state broadcast to UI

**PC Control:**
- Volume set/get/mute
- Media play/pause/next/prev
- Launch any application
- Open files, folders, URLs
- Create folders, list directories
- Get system stats (CPU, RAM, disk, battery, uptime)
- Shutdown, restart, sleep, lock PC
- Cancel pending shutdown
- Clipboard copy/paste
- Type text, press keys, execute hotkeys

**Communication:**
- Discord DM bot (single mode + auto mode)
- Importance classifier for Discord messages
- Auto-convo with 5-min timeout
- WhatsApp contact resolution + message sending
- Web search (Tavily primary, DuckDuckGo fallback)
- News headlines (Tavily + RSS: BBC, NYT)
- Daily briefing (system stats + weather + news + activity + memories + notes)

**Memory & Context:**
- ChromaDB vector database (437+ memories)
- Semantic dedup (cosine similarity > 0.95 skip)
- Relevant memory injection into every conversation
- Curated file-based memory with drift detection
- Weather context (wttr.in, 30-min cache, Aluva Kerala)
- Time context injection
- Notes CRUD (JSON backend)
- Memory search across all past conversations

**User Interface:**
- FastAPI REST API (20+ endpoints)
- WebSocket real-time push
- TCP socket bridge (port 9001) for cross-thread communication
- CORS-enabled for localhost:3000 frontend
- Separate UI repository (React/Next.js) with Memory Widget, TopBar, Widget Manager

---

## 4. System Architecture

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          main.py (Orchestrator)                       │
│                                                                       │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │   FastAPI Backend   │  │   Voice Pipeline   │  │   Discord Bot  │  │
│  │  (core/server.py)   │  │  (voice/pipeline)  │  │ (comms/discord)│  │
│  │  Port 8000          │  │  Wake Word + PTT   │  │  DM Handler    │  │
│  │  REST + WebSocket   │  │  STT → TTS         │  │  Single/Auto   │  │
│  └────────┬───────────┘  └────────┬───────────┘  └───────┬────────┘  │
│           │                       │                       │           │
│           └───────────────────────┼───────────────────────┘           │
│                                   │                                   │
│                          ┌────────▼────────┐                         │
│                          │  Socket Bridge   │                         │
│                          │   TCP Port 9001  │                         │
│                          └────────┬────────┘                         │
│                                   │                                   │
│                          ┌────────▼────────┐                         │
│                          │   WebSocket     │                         │
│                          │  (ws_manager)   │                         │
│                          │  → UI Clients   │                         │
│                          └─────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Core Agent Loop   │
                    │   (core/agent.py)   │
                    │                     │
                    │  System Prompt      │
                    │  ← Live Context     │
                    │  ← ChromaDB Memory  │
                    │  ← Curated Memory   │
                    │  ← Contacts List    │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Mistral   │  │  OpenRouter │  │    Groq     │
     │  Small      │  │  Llama 8B   │  │  Llama 70B  │
     │  Deep/Res.  │  │  Fast/Cas.  │  │  Tools      │
     └─────────────┘  └─────────────┘  └──────┬──────┘
                                              │
                                     ┌────────▼────────┐
                                     │  Tool Dispatch   │
                                     │  (19+ Tools)     │
                                     │                   │
                                     │  system.py        │
                                     │  web.py           │
                                     │  media.py         │
                                     │  comms.py         │
                                     │  memory_tool.py   │
                                     │  tracker.py       │
                                     └──────────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                 │   ChromaDB   │     │  Curated     │     │  Live        │
                 │  Vector DB   │     │  File Mem.   │     │  Context     │
                 │  437+ mems   │     │  USER.md     │     │  Weather     │
                 │  Cosine sim. │     │  MEMORY.md   │     │  Time        │
                 │  Semantic    │     │  Drift det.  │     │  Aluva, KL   │
                 │  dedup       │     │  Atomic w.   │     │  30-min cache│
                 └──────────────┘     └──────────────┘     └──────────────┘
```

### Directory Structure

```
C:\AURA_V2\
│
├── main.py                           # Entry point — starts backend, voice, Discord
├── requirements.txt                  # 23 Python dependencies
├── .env.example                      # Environment variable template
├── .env.local                        # Actual secrets (MISTRAL, OPENROUTER, GROQ, etc.)
│
├── core/                             # CORE BACKEND
│   ├── config.py                     # Single source of truth: all env vars, models, constants
│   ├── server.py                     # FastAPI app (851 lines): 20+ routes, WS manager, socket bridge
│   ├── agent.py                      # Agent loop (348 lines): system prompt, tool dispatch, LLM interaction
│   └── router.py                     # LLM routing (71 lines): Mistral / OpenRouter / Groq
│
├── memory/                           # MEMORY SYSTEM
│   ├── chroma_store.py               # ChromaDB: init, save, query, CRUD, semantic dedup, TCP notify
│   ├── store.py                      # Curated file memory: USER.md, MEMORY.md, drift detection
│   ├── context.py                    # Live context: weather + time injection
│   └── memory_tool.py                # LLM-callable memory handler (add/replace/remove/search/list)
│
├── voice/                            # VOICE PIPELINE
│   ├── pipeline.py                   # Voice loop (598 lines): wake word, PTT, STT, TTS, Discord intercept
│   ├── tts.py                        # TTS engines: Supertonic, Edge TTS, Kokoro
│   ├── stt.py                        # Speech recording + Whisper transcription
│   ├── emotion.py                    # Emotion tag parser + TTS text cleaner
│   └── wake.py                       # Picovoice Porcupine wake word detection
│
├── tools/                            # LLM-CALLABLE TOOLS
│   ├── registry.py                   # Tool definitions/schemas (19 tools)
│   ├── system.py                     # System: volume, apps, files, power, clipboard, notes, input
│   ├── web.py                        # Web search: Tavily + DuckDuckGo + RSS news
│   ├── media.py                      # Media: now-playing detection, transport commands
│   ├── comms.py                      # WhatsApp: contact resolution + URI protocol + pyautogui
│   ├── tracker.py                    # Window tracker: polls foreground window every 30s
│   ├── hotkeys.py                    # Global hotkeys: Alt+M to stop TTS
│   └── audio_manager.py              # COM-threaded audio manager via pycaw
│
├── comms/                            # COMMUNICATIONS
│   ├── discord_bot.py                # Discord bot (326 lines): DM handler, importance classifier
│   └── state.py                      # Thread-safe Discord session state + TTS reference
│
└── data/                             # RUNTIME DATA
    ├── chroma/                       # ChromaDB persistent storage
    ├── memories/                     # USER.md, MEMORY.md
    ├── friends.json                  # Discord friends list
    ├── notes.json                    # JSON notes backend
    └── supertonic_smoke_test.wav     # TTS test file
```

---

## 5. How Aura "Thinks" — The Agent Loop

### Multi-Model Architecture

Aura uses **three different LLM providers** routed by purpose. This is not a single-model system — it's an **intelligent router** that selects the optimal model for each task:

| Model | Provider | Purpose | Why |
|---|---|---|---|
| `mistral-small-latest` | Mistral AI | Deep reasoning, research, complex conversation | Best contextual understanding in small model class |
| `meta-llama/llama-3.1-8b-instruct` | OpenRouter | Casual chat, briefings, Discord polish | Fast, cheap, good for light conversation |
| `llama-3.3-70b-versatile` | Groq (free tier) | Tool calling | Reliable function calling at zero cost |

### The Agent Loop Flow (`core/agent.py`)

**Step 1: Message Arrival**
User sends message via `/chat` endpoint (REST) or voice pipeline.

**Step 2: System Prompt Assembly** (`_build_system_prompt()`)
The agent dynamically assembles a rich system prompt:
1. **AURA_PERSONA** — Core identity: "You are Aura, a local AI assistant and personal companion. You are sharp, warm, and direct — never robotic."
2. **Voice Tone Instructions** — Inline expression tags for emotion: `<laugh>`, `<sigh>`, `<breath>`, `<cry>`, `<whisper>`, `<shout>`, `<sing>`, `<hum>`, `<cough>`
3. **Memory Behavior Rules** — When to save, skip, search memories (Hermes-style guidance)
4. **CRITICAL RULE** — Never write tool calls as text or XML. Use function calling API only.
5. **Live Context Block** — Current time + weather from wttr.in (30-min cache)
6. **ChromaDB Relevant Memories** — Semantic search on current context, top 5 results with similarity >= 0.35
7. **WhatsApp Contacts** — Injects valid contact names for tool calling
8. **Curated Memory Block** — USER.md + MEMORY.md entries with drift detection
9. **Memory Nudge** — Every 3 turns, prompts the LLM to save if it learned something new

**Step 3: Tool Need Detection** (`needs_tools()` in `router.py`)
Keyword-based classifier checks message against 48+ patterns:
- Volume, mute, play, pause, open, launch, shutdown, search, note, memory, whatsapp, type, press, copy, paste, etc.
- If matched → tool path. If not → conversation path.

**Step 4a: Conversation Path** (no tools needed)
- Stream response directly from Mistral or OpenRouter
- No tool dispatch overhead
- Fast, natural conversation

**Step 4b: Tool Path** (tools needed)
- Up to **3 rounds** of tool execution (MAX_TOOL_ROUNDS = 3)
- Uses Groq Llama 70B with native `<function=name>` XML-style calls
- Parses function calls server-side via `_parse_native_function()`
- Falls back to OpenRouter on Groq 429 rate limits
- Each round: LLM generates call → parse → execute → feed result back to LLM

**Step 5: Response Scrubbing**
`_scrub()` removes any leaked XML/function call tags from the response:
- `<memory-context>`, `<function=name>`, `<memory>` tags stripped
- Voice expression tags (`<laugh>`, `<whisper>`) **preserved**
- Returns clean, natural text

**Step 6: Memory Persistence**
Every exchange saved to ChromaDB:
- `"User: {message}"` — user input
- `"Aura: {response}"` — Aura's reply
- Semantic dedup prevents near-duplicate storage

### The System Prompt (AURA_PERSONA)

```
You are Aura, a local AI assistant and personal companion.
You are sharp, warm, and direct — never robotic. You run entirely on
the user's machine, so privacy is guaranteed. You have access to tools
for controlling the PC, searching the web, and checking system stats.
Use tools when they are clearly needed; don't mention them otherwise.
Keep responses concise unless depth is asked for.

## Voice Tone
You have a natural, expressive voice with inline expression tags for
vocal emotion. Use them naturally mid-speech when appropriate:
- <laugh> — chuckle or laugh at something funny
- <sigh> — sigh in relief, frustration, or thoughtfulness
- <breath> — take a breath (pause, anticipation)
- <cry> — emotional or moved
- <whisper> — quiet, secretive, or intimate
- <shout> — excited or urgent
- <sing> — sing-song or playful
- <hum> — thoughtful or amused
- <cough> — awkward or hesitant

## Memory Behavior
You have a memory tool to save important facts long-term.
Use it PROACTIVELY whenever you learn something worth remembering...

CRITICAL RULE: Never write tool calls as text or XML.
Use the function calling API ONLY. No <memory> tags, no <search> tags,
no describing tool calls in your response text. Just call the function.
```

---

## 6. Memory System

Aura has a **three-layer memory architecture** that enables genuine long-term learning and personalization.

### Layer 1: ChromaDB Vector Store (`memory/chroma_store.py`)

| Property | Value |
|---|---|
| **Database** | ChromaDB PersistentClient v0.4.24 |
| **Collection** | `aura_memory` |
| **Space** | Cosine similarity (`hnsw:space: cosine`) |
| **Embedding Model** | `all-MiniLM-L6-v2` (384-dim, SentenceTransformers) |
| **Current Size** | 437+ memories |
| **Similarity Threshold** | 0.35 (minimum for relevance) |
| **Max Results** | 5 (top-k retrieval) |
| **Dedup Threshold** | 0.95 (skip if too similar) |
| **Storage Format** | `{id, document, metadata{timestamp}, embedding}` |

**Pipeline:**
1. Every user message triggers a semantic search on the live context
2. Top 5 relevant memories are injected into system prompt
3. Every response is saved back with `"Aura:"` prefix
4. Dedup check runs before every save (cosine distance → similarity)
5. CRUD operations available via REST API

**Key Innovation:** Semantic dedup prevents the vector store from bloating with near-duplicate entries. If a new memory has >0.95 cosine similarity to an existing one, it's silently skipped.

### Layer 2: Curated File-Based Memory (`memory/store.py`)

Two text files serve as persistent, curated memory:

| File | Purpose | Character Limit |
|---|---|---|
| `USER.md` | Facts about the user (preferences, identity, habits) | 1,375 chars |
| `MEMORY.md` | Aura's self-knowledge (operational notes, rules) | 2,200 chars |

**Key Features:**
- **Atomic writes** via temp file + `os.replace()` — no partial writes
- **Drift detection** — SHA-256 hash comparison, auto-backup on external modification
- **Snapshot caching** — system prompt block built once, invalidated on write
- **REST CRUD** — GET, POST, PUT, DELETE via FastAPI
- **Frontend widget** — Dual-tab UI (ALL / CURATED) with 30-sec background refresh

### Layer 3: Live Context (`memory/context.py`)

- **Current time** — formatted for natural language
- **Weather** — fetched from wttr.in, cached for 30 minutes, location: Aluva, Kerala
- Injected as `## Live Context` block in system prompt

### Memory Tool (LLM-Callable)

The `memory` tool in `tools/registry.py` has **Hermes-style behavioral guidance**:

**WHEN to save:**
- User states a preference, opinion, or habit ("I like X", "I usually do Y")
- User gives personal details (name, location, job, hobbies, family, pets)
- User corrects something — save the correction immediately
- User says "remember this", "keep that in mind", "don't forget"
- User sets a goal, deadline, or recurring task
- User reveals an environment fact ("my path is Z", "I use editor W")
- You discover a pattern or convention the user follows

**WHEN to skip:**
- Task progress or step-by-step status (session-specific)
- Temporary state like "currently doing X"
- One-off file paths, URLs, or ephemeral data

**Actions:** `add`, `replace`, `remove`, `search` (ChromaDB), `list`

---

## 7. Voice Pipeline

### Architecture

```
                    ┌──────────────────────┐
                    │   Wake Word / PTT    │
                    │  ┌────────────────┐  │
                    │  │  openwakeword  │  │  "Hey Jarvis" detection
                    │  │  "hey_jarvis"  │  │  ONNX, threshold 0.5
                    │  └───────┬────────┘  │
                    │  ┌────────────────┐  │
                    │  │  PTT (pynput)  │  │  Hold Right Shift
                    │  └───────┬────────┘  │
                    └──────────┼───────────┘
                               ▼
                    ┌──────────────────────┐
                    │     Recording        │
                    │  sounddevice 16kHz   │
                    │  int16, mono         │
                    │  Energy VAD (300)    │
                    │  1.2s silence → stop │
                    │  Max 15s             │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │   Speech-to-Text     │
                    │  faster-whisper      │
                    │  base model          │
                    │  CPU, int8           │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │   Intent Detection   │
                    │                      │
                    │  ├─ Briefing?        │
                    │  ├─ Discord reply?   │
                    │  ├─ Voice switch?    │
                    │  ├─ Session end?     │
                    │  └─ Normal chat?     │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │   Agent Response     │
                    │  (via /chat REST)    │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │   Text-to-Speech     │
                    │                      │
                    │  ├─ Supertonic (ONNX)│
                    │  │  F1-F5, M1-M5     │
                    │  │  Inline emotion   │
                    │  ├─ Edge TTS (Cloud) │
                    │  │  100+ voices      │
                    │  └─ Kokoro (Local)   │
                    │     af_bella, etc.   │
                    └──────────────────────┘
```

### TTS Engine Comparison

| Feature | Supertonic | Edge TTS | Kokoro |
|---|---|---|---|
| **Type** | Local ONNX | Cloud | Local |
| **Voices** | F1-F5 (female), M1-M5 (male) | 100+ (en-US-AvaNeural, etc.) | af_bella, af_sky, af_nicole, af_sarah |
| **Emotion Tags** | `<laugh>`, `<sigh>`, `<breath>`, etc. | Stripped before TTS | `[whisper]` inline |
| **Latency** | Low (local) | Medium (network) | Low (local) |
| **Quality** | Good | Excellent | Good |

### Voice Switching

Users can change Aura's voice mid-conversation:
- **Keyword detection** — "switch to a male voice", "change your voice", "list voices"
- **Groq LLM double-check** — A cheap `llama-3.1-8b-instant` call classifies intent as `switch`, `list`, `current`, or `none`
- **Gender mapping** — "guy" → M1, "girl" → F1, "male voice" → M1, etc.
- **Voice name extraction** — "switch to en-US-JennyNeural" → exact match

### Wake Word Options

| System | Model | Status |
|---|---|---|
| **openwakeword** | `hey_jarvis` (ONNX) | Active, primary |
| **Picovoice Porcupine** | Custom wake word | Available as alternative |

---

## 8. Communications & Integrations

### Discord Bot (`comms/discord_bot.py`)

| Feature | Detail |
|---|---|
| **Scope** | DMs only (ignores guild messages) |
| **Two Modes** | `single` (manual approval) and `auto` (autonomous) |
| **Auto Timeout** | 5 minutes of silence ends auto-convo |
| **Importance Classifier** | LLM determines if message needs user attention |
| **Attribution** | `*(Aura — Kenaz's AI assistant)*` appended to replies |
| **Session Management** | Start, end, summarize, switch modes via REST API |
| **UI Integration** | TCP socket bridge for real-time notification |
| **Friends List** | Managed via `data/friends.json` |

**Auto Mode Flow:**
1. DM received → importance classifier (YES/NO)
2. If important → TTS notification to user: "Kenaz, X sent something that might need your attention"
3. Generate reply via agent with conversation context (last 10 exchanges)
4. Send reply with attribution
5. Auto-convo timeout watcher (30-sec check, 5-min silence threshold)

### WhatsApp (`tools/comms.py`)

- Contact resolution via `contacts.json` with fuzzy matching (`difflib`)
- Sends via `whatsapp://send?phone=...` URI + Enter key press
- Contact name normalization and validation

### Web Search (`tools/web.py`)

| Engine | Type | API Key Required |
|---|---|---|
| **Tavily** | Primary, AI-optimized | Yes (TAVILY_API_KEY) |
| **DuckDuckGo** | Fallback, no key needed | No |
| **RSS News** | Fallback (BBC, NYT feeds) | No |

### Weather (`memory/context.py`)

- **Source:** wttr.in (auto IP location)
- **Cache:** 30 minutes
- **Location:** Aluva, Kerala (hardcoded)

---

## 9. Tool Ecosystem

### 19+ Tools Defined in `tools/registry.py`

| Category | Tool | Description |
|---|---|---|
| **Audio** | `set_volume(level)` | Set system volume 0-100 |
| | `get_volume()` | Get current volume |
| | `mute_audio(muted)` | Mute/unmute audio |
| **Media** | `play_pause()` | Toggle play/pause |
| | `next_track()` | Skip to next track |
| | `prev_track()` | Go to previous track |
| **Apps** | `launch_app(app_name)` | Launch application by name |
| | `list_running_processes(filter)` | List/filter processes |
| **Files** | `open_path(path)` | Open file, folder, or shortcut |
| | `create_folder(folder_path)` | Create directory |
| | `list_directory(dir_path)` | List directory contents |
| **Web** | `web_search(query)` | Search the web |
| | `open_website(url)` | Open URL in browser |
| **System** | `get_system_stats()` | CPU, RAM, disk, battery, uptime |
| | `shutdown(delay)` | Shut down PC |
| | `restart(delay)` | Restart PC |
| | `sleep_pc()` | Sleep PC |
| | `lock_pc()` | Lock workstation |
| | `cancel_shutdown()` | Cancel pending shutdown |
| **Clipboard** | `clipboard_copy(text)` | Copy to clipboard |
| | `clipboard_paste()` | Read clipboard |
| **Notes** | `write_note(name, content)` | Write/overwrite note |
| | `append_note(name, content)` | Append to note |
| | `read_note(name)` | Read note |
| | `list_notes()` | List all notes |
| | `search_notes(query)` | Search notes |
| **Input** | `type_text(text)` | Type via keyboard |
| | `press_key(key)` | Press a key |
| | `execute_hotkey(keys)` | Execute shortcut (e.g., "ctrl+c") |
| **Comm** | `send_whatsapp(contact, message)` | Send WhatsApp message |
| **Memory** | `memory(action, category, text, id)` | Full memory CRUD + search |

### Active Window Tracker (`tools/tracker.py`)
- Polls foreground window every 30 seconds
- Stores last 20 entries with timestamps
- Used in daily briefings for activity context

---

## 10. Current Features (Implemented)

### ✅ Core
- [x] Multi-model LLM routing (Mistral deep / OpenRouter fast / Groq tools)
- [x] Dynamic system prompt assembly with live context
- [x] Tool-use detection via keyword classifier (48+ patterns)
- [x] 3-round tool execution loop with Groq fallback
- [x] Response scrubbing (tag leak prevention)
- [x] Streaming responses via Server-Sent Events
- [x] FastAPI REST API (20+ endpoints)
- [x] WebSocket real-time push
- [x] TCP socket bridge (port 9001) for cross-thread communication

### ✅ Voice
- [x] Wake word detection (openwakeword "hey_jarvis")
- [x] Push-to-talk (Right Shift via pynput)
- [x] Speech recording with energy-based VAD
- [x] Audio draining (prevents pop artifacts)
- [x] Speech-to-text (faster-whisper base, CPU int8)
- [x] Three TTS engines (Supertonic, Edge, Kokoro)
- [x] Inline emotion/expression tags
- [x] Voice switching via voice command (keyword + LLM double-check)
- [x] Gender-based voice mapping
- [x] Voice intent classifier (Groq llama-3.1-8b-instant)
- [x] Real-time speaking/idle/thinking/listening state broadcast
- [x] Briefing intercept from voice
- [x] Discord intercept from voice (single reply + end session)
- [x] Auto-convo mode activation from voice

### ✅ Memory
- [x] ChromaDB vector store (437+ memories)
- [x] Semantic dedup (cosine similarity threshold 0.95)
- [x] Similarity-filtered retrieval (threshold 0.35)
- [x] Relevant memory injection into system prompt
- [x] Conversation history persistence (User: / Aura: pairs)
- [x] Curated file-based memory (USER.md / MEMORY.md)
- [x] Atomic writes with drift detection (SHA-256)
- [x] Memory snapshot caching with invalidation
- [x] Memory CRUD via REST API
- [x] Memory search across all past conversations
- [x] TCP MEMORY_ACCESS notification on retrieval
- [x] Hermes-style behavioral guidance in tool schema

### ✅ Discord
- [x] DM-only handler
- [x] Single mode (manual reply)
- [x] Auto mode (autonomous conversation)
- [x] Importance classifier (LLM-based)
- [x] 5-minute auto-convo timeout
- [x] Session management (activate, end, mode switch)
- [x] Message polishing via LLM
- [x] Conversation summarization on session end
- [x] Friends list integration
- [x] UI notification via TCP socket bridge

### ✅ PC Control
- [x] Volume set/get/mute
- [x] Media play/pause/next/prev
- [x] Application launching
- [x] File/folder/URL opening
- [x] Directory listing and creation
- [x] System stats (CPU, RAM, disk, battery, uptime)
- [x] Shutdown, restart, sleep, lock PC
- [x] Cancel pending shutdown
- [x] Clipboard copy/paste
- [x] Keyboard input (type, press key, hotkeys)
- [x] Now-playing media detection (window titles)

### ✅ Web & Information
- [x] Web search (Tavily + DuckDuckGo fallback)
- [x] News headlines (Tavily + RSS)
- [x] Weather context (wttr.in, 30-min cache)
- [x] Daily briefing (aggregated data + LLM summary)

### ✅ Notes
- [x] Create, read, update, delete notes
- [x] Search notes by keyword
- [x] List all notes
- [x] Append to existing notes

### ✅ Infrastructure
- [x] CORS middleware (localhost:3000)
- [x] Health check endpoint
- [x] Graceful shutdown
- [x] Rate limit handling (Groq 429 → OpenRouter fallback)
- [x] Global hotkeys (Alt+M to stop TTS)
- [x] Module-level error isolation (broken tools don't crash the system)
- [x] Daemon thread architecture (backend, voice, Discord)

---

## 11. Phase Roadmap — The Proactive AI Plan

**Goal:** Transform Aura from a reactive chatbot into a genuinely proactive AI assistant that observes, decides, and acts without requiring user prompts.

**Philosophy:** Little by little. Each phase adds a layer of autonomy without breaking what already works.

### Phase 0 — Architecture: The Proactive Loop (Estimated: 1 hour)

A single long-lived background coroutine on the existing FastAPI event loop.

```python
class ProactiveEngine:
    def __init__(self):
        self._task: asyncio.Task | None = None
        self._last_user_interaction: float = time.time()
        self._cooldown_seconds: int = 30
        self._dnd: bool = False

    async def start(self):
        self._task = asyncio.create_task(self._loop())

    async def _loop(self):
        while True:
            await asyncio.sleep(5)           # tick every 5 seconds
            if self._dnd:
                continue
            if self._in_cooldown():
                continue
            if not self._user_present():
                continue
            await self._tick()               # Phase 2+ logic
```

**Files:** `core/proactive.py` (NEW) + `core/server.py` (MODIFY) + `core/config.py` (MODIFY)

### Phase 1 — Receptiveness Model (Estimated: 30 min)

Aura must know **when** to speak. Three guards checked every tick:

1. **Cooldown Timer** — Don't interrupt during conversation (default 30s)
2. **User Presence Detection** — `GetLastInputInfo` via ctypes (idle > 5 min = absent)
3. **Do Not Disturb** — Manual toggle, fullscreen app detection, timed DND

**Files:** `core/proactive.py` (MODIFY)

### Phase 2 — Hybrid Decision Engine (Estimated: 2.5 hours)

Rule-based triggers (fast, zero-cost) classify the situation. When ambiguous, LLM resolves.

**14 Built-in Rules:**

| Rule | Trigger | Suggests |
|---|---|---|
| `high_cpu` | CPU > 85% for 3 consecutive ticks | Alert |
| `high_ram` | RAM > 90% | Alert |
| `low_disk` | Any drive < 10% free | Alert |
| `time_of_day` | 9:00 AM weekday | Greeting + calendar summary |
| `time_of_day` | 5:00 PM weekday | "Wrap up?" |
| `battery_low` | Battery < 20%, discharging | Alert |
| `battery_full` | Battery = 100%, charging | "Fully charged" |
| `long_idle_unlocked` | Idle > 3 min, unlocked | "Still there?" |
| `process_spawned` | Known app launched | "Resume last playlist?" |
| `process_crashed` | App crashed | "Report bug?" |
| `new_discord` | New Discord message | "New message from X" |
| `empty_trash` | Recycle Bin > 1 GB | "Clean up?" |
| `network_down` | No internet > 60s | "Network offline" |
| `network_back` | Internet restored | "Network is back" |

**Priority >= 8** → Act immediately (no LLM gate). **Priority < 8** → Ask cheap LLM (Llama 8B) if worth mentioning.

Cost per LLM check: ~$0.000002. Even at 10 checks/hour = $0.00002/hour.

**Files:** `core/proactive.py` (MODIFY) + `core/router.py` (MODIFY)

### Phase 3 — Learning User Patterns (Estimated: 3 hours)

Rules define **what is possible**. Patterns define **what is relevant to this user**.

- Pattern store in ChromaDB: `{trigger_time, trigger_event, action, confidence, last_seen}`
- Pattern detection runs once per hour — queries ChromaDB, extracts repeated behaviors via LLM
- Minimum 3 repetitions before pattern created. Confidence < 0.5 never triggers.
- Example: "Every weekday at ~17:00, user launches Spotify" → at 16:55, Aura suggests it

**Files:** `core/proactive.py` (MODIFY) + `memory/chroma_store.py` (MODIFY)

### Phase 4 — Proactive Actions (Auto-Execute) (Estimated: 2 hours)

Beyond speaking, Aura can **do** things unprompted.

| Category | Description | Safety |
|---|---|---|
| Speak only | Says something, never executes | Safe always |
| Suggest + confirm | Asks "Should I...?" wait for yes/no | Recommended default |
| Auto-execute | Does it without asking | Requires per-action consent |

**Auto-execute candidates:** Lock PC when away > 2 min, clean temp when disk < 5%, battery < 15% notification, pattern-matched predictions.

**Files:** `core/proactive.py` (MODIFY) + `data/proactive_consent.json` (NEW) + `tools/system.py` (MODIFY)

### Phase 5 — Frontend Proactive Settings Widget (Estimated: 1 hour)

A new `ProactiveWidget` showing:
- DND toggle
- Last N proactive suggestions (log)
- Consent toggles per action category
- "Learned patterns" list with enable/disable

**Files:** `ProactiveWidget.tsx` (NEW) + UI store/api modifications

### Phase 6 — Deep Research Engine (Estimated: 6 hours)

Make Aura capable of performing deep, structured research on-demand and proactively.

- **On-demand:** `POST /research/start {query, max_pages}` → job ID → polling
- **Background:** Low-priority daily scan for long-term topics (confidence > 0.7)
- **Pipeline:** Query → retrieve (ChromaDB + web crawl) → extract → RAG → structured report with citations
- **Privacy:** Honor robots.txt, Crawl-delay, max_pages configurable

**Files:** `core/research.py` (NEW) + `tools/web.py` (MODIFY) + UI widgets

### Implementation Order & Timeline

| Phase | What | Effort |
|---|---|---|
| 0 | Background loop + cooldown + ProactiveEngine skeleton | ~2 files, 1 hour |
| 1 | User presence detection + DND | ~1 file, 30 min |
| 2a | Rule registry + 5 core rules | ~2 files, 2 hours |
| 2b | LLM classifier integration | ~50 lines, 30 min |
| 3 | Pattern store + detection | ~2 files, 3 hours |
| 4 | Auto-execute actions + consent store | ~2 files, 2 hours |
| 5 | Frontend proactive settings widget | ~1 file, 1 hour |
| 6 | Deep research engine | ~5 files, 6 hours |

**Total:** ~10 files, ~10-16 hours of focused work

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Rule fires too often | `max_suggestions_per_hour` hard cap + per-rule cooldown |
| LLM says YES too often | Track YES rate; if > 30%, auto-downgrade for next 10 checks |
| User finds it creepy | DND defaults to ON; all auto-execute requires explicit consent |
| Pattern detection noisy | Minimum 3 repetitions; confidence < 0.5 never triggers |
| Background task crashes | try/except wraps entire `_tick()`; automatic restart |
| Cooldown prevents urgent alerts | Priority >= 9 bypasses cooldown entirely |

---

## 12. Memory System Roadmap — Hermes Collab

**Goal:** Integrate Hermes Agent–style memory architecture into AURA V2.

### ✅ Phase 1 — Make the Memory Tool Work (COMPLETE)
- Hermes-style behavioral guidance in tool schema
- Memory Behavior block in AURA_PERSONA
- MEMORY_AUTOSAVE_INTERVAL (3 turns)
- Fresh snapshot cache in store.py
- Dual-tab frontend widget (ALL / CURATED)

### ✅ Phase 1.5 — Tag Leak Fixes & Model Tuning (COMPLETE)
- `_scrub()` strips leaked XML, preserves voice emotion tags
- CRITICAL RULE in system prompt
- Model switch: `llama-3.1-8b` → `mixtral-8x7b` → `llama-3.3-70b-versatile`

### ✅ Phase 2 — Session Search Engine (COMPLETE)
- `search` action in memory tool → ChromaDB semantic search
- All CRUD endpoints tested (LIST/ADD/UPDATE/DELETE)
- Search returns formatted snippets with similarity scores

### ⏳ Phase 3 — Skill Proposals (NOT STARTED)
- Aura classifies tasks for skill-worthiness
- Bottom-right slide-in toast with Approve/Reject
- Non-blocking, single yes/no proposal
- Pending queue for unread proposals
- Dedicated Skills widget

### ⏳ Phase 4 — Cleanup & Deprecation (NOT STARTED)
- Remove old nudge module variable
- Remove dead `forget` action stub
- Remove other dead code

### ⏳ Phase 5 — Plugin System (NOT STARTED)
- ABC provider pattern for memory backends
- Provider implementations (ChromaDB, file-based, etc.)
- Registration/discovery mechanism
- Config-based provider selection

---

## 13. Future Expansion Horizons

Beyond the already-planned phases, here are additional expansion vectors that significantly increase Aura's value proposition:

### Horizon 1: Multi-Platform Support
- **macOS/Linux port** — Abstract Win32 API calls behind platform adapters
- **Mobile companion app** — React Native frontend with push notifications
- **Headless mode** — Server-only deployment (no voice, no UI) for NAS/Raspberry Pi

### Horizon 2: Advanced AI Capabilities
- **Vision integration** — Screen capture + OCR + vision LLM for "what's on my screen?" queries
- **Local LLM support** — Integrate llama.cpp / Ollama for fully offline operation (zero API cost)
- **Multi-modal memory** — Store images, screenshots, audio clips in memory
- **Voice cloning** — Clone user's voice for personalized TTS (with consent)
- **Emotion detection** — Analyze tone of voice for emotional context awareness

### Horizon 3: Smart Home Integration
- **Home Assistant integration** — Control lights, thermostat, locks via voice
- **MQTT broker** — Direct IoT device communication
- **Wake-on-LAN** — Boot other machines on the network
- **Presence detection** — Use network scanners for room-level presence

### Horizon 4: Advanced Communications
- **Email integration** — Read, compose, send via IMAP/SMTP
- **Slack/Telegram/Matrix** — Expand comms beyond Discord
- **Calendar integration** — Google Calendar / Outlook sync for proactive reminders
- **Call handling** — VoIP integration (Twilio, SIP) for voice calls
- **Contact sync** — Auto-sync contacts from phone/cloud

### Horizon 5: Productivity & Workflow
- **Code assistance** — Clone repos, run tests, review PRs, git operations
- **File organization** — Auto-categorize downloads, clean desktop
- **Browser automation** — Playwright/Selenium for web tasks
- **Screenshot + annotation** — Capture, annotate, share
- **Meeting transcription** — Real-time meeting transcription + summarization (local Whisper)

### Horizon 6: Advanced Memory & Learning
- **Federated learning** — Optional model fine-tuning on user data (local only)
- **Cross-device memory sync** — Encrypted memory sync across devices
- **Episodic memory** — Remember sequences of events, not just facts
- **Preference learning** — Implicit learning from user behavior patterns
- **Knowledge graph** — Structured relationship mapping between memories

### Horizon 7: Monetization Features
- **Plugin marketplace** — Community-contributed tools and skills
- **Premium voices** — Licensed high-quality TTS voices as add-ons
- **Managed cloud sync** — Optional encrypted cloud backup of memory
- **Enterprise mode** — LDAP/SSO, audit logging, compliance features
- **White-label version** — Custom branding for businesses

---

## 14. Technical Specifications

### Tech Stack

| Layer | Technology | Version/Detail |
|---|---|---|
| **Language** | Python | 3.14 |
| **Web Framework** | FastAPI + uvicorn | ASGI, async |
| **Runtime** | asyncio + threading | Daemon threads for voice/Discord |
| **Database** | ChromaDB | 0.4.24, persistent, cosine similarity |
| **Embeddings** | Sentence Transformers | `all-MiniLM-L6-v2` (384-dim) |
| **STT** | faster-whisper | base model, CPU, int8 quantization |
| **TTS (Local)** | Supertonic | ONNX models, inline emotion tags |
| **TTS (Cloud)** | Edge TTS | 100+ voices |
| **TTS (Fallback)** | Kokoro | Local, lightweight |
| **Wake Word** | openwakeword | ONNX, `hey_jarvis` model |
| **Wake Word (Alt)** | Picovoice Porcupine | Custom wake word support |
| **Web Search** | Tavily API + DuckDuckGo | Dual-engine fallback |
| **LLM (Deep)** | Mistral AI | `mistral-small-latest` |
| **LLM (Fast)** | OpenRouter | `meta-llama/llama-3.1-8b-instruct` |
| **LLM (Tools)** | Groq | `llama-3.3-70b-versatile` (free tier) |
| **Discord** | discord.py | DM intents, async |
| **WhatsApp** | URI protocol + pyautogui | whatsapp://send |
| **Audio I/O** | sounddevice, soundfile | 16kHz, int16, mono |
| **System** | psutil, pycaw, comtypes | Windows management |
| **Input** | pynput, pyautogui, pyperclip | Hotkeys, keyboard, clipboard |

### Dependencies (23 packages)

```
chromadb==0.4.24
sentence-transformers
faster-whisper
openwakeword
sounddevice
soundfile
miniaudio
edge-tts
kokoro
numpy==1.26.4
fastapi
uvicorn
pydantic
discord.py
requests
httpx
feedparser
python-dotenv
psutil
pycaw
comtypes
pynput
pyautogui
pyperclip
```

### API Endpoints (20+)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/weather` | Cached weather data |
| POST | `/chat` | Stream Aura response |
| GET | `/memory` | List all ChromaDB memories |
| POST | `/memory` | Create memory |
| PUT | `/memory/{id}` | Update memory |
| DELETE | `/memory/{id}` | Delete memory |
| GET | `/curated-memory` | List curated memories |
| POST | `/curated-memory` | Create curated memory |
| PUT | `/curated-memory/{category}/{idx}` | Update curated memory |
| DELETE | `/curated-memory/{category}/{idx}` | Delete curated memory |
| GET | `/now-playing` | Current media info |
| POST | `/media/control` | Media transport control |
| GET | `/discord/friends` | Discord friends list |
| GET | `/discord/status` | Discord session status |
| POST | `/discord/activate` | Start Discord session |
| POST | `/discord/mode` | Switch single/auto mode |
| POST | `/discord/end` | End Discord session |
| POST | `/discord/reply` | Send reply |
| POST | `/discord/polish` | Polish message |
| GET | `/voice/options` | Available voices |
| POST | `/voice/select` | Switch voice |
| GET | `/system-stats` | CPU/RAM/disk/battery |
| GET | `/notes` | List notes |
| POST | `/notes` | Create note |
| PUT | `/notes/{id}` | Update note |
| DELETE | `/notes/{id}` | Delete note |
| POST | `/briefing` | Daily briefing |
| WS | `/ws` | Real-time WebSocket |

### Environment Variables Required

```
MISTRAL_API_KEY=              # Mistral AI (REQUIRED)
OPENROUTER_API_KEY=           # OpenRouter (REQUIRED)
GROQ_API_KEY=                 # Groq (REQUIRED)
DISCORD_BOT_TOKEN=            # Discord (optional — disables Discord if missing)
TAVILY_API_KEY=               # Tavily search (optional — falls back to DuckDuckGo)
TTS_PROVIDER=supertonic       # "supertonic", "edge", or "kokoro"
TTS_VOICE=F1                  # Voice for selected provider
```

---

## 15. Competitive Landscape

| Feature | AURA V2 | ChatGPT | Alexa | Google Asst. | Siri | Custom GPTs |
|---|---|---|---|---|---|---|
| **Local/Private** | ✅ Yes | ❌ Cloud | ❌ Cloud | ❌ Cloud | ❌ Cloud | ❌ Cloud |
| **PC Control** | ✅ Deep (19+ tools) | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Voice (Local)** | ✅ 3 engines + emotion | ❌ Cloud-only | ❌ Cloud | ❌ Cloud | ❌ Cloud | ❌ Cloud |
| **Persistent Memory** | ✅ ChromaDB + curated | ⚠️ Session only | ❌ Limited | ❌ Limited | ❌ Limited | ⚠️ Per-GPT |
| **Multi-Model** | ✅ 3 LLMs routed | ❌ Single model | ❌ Single | ❌ Single | ❌ Single | ❌ Single |
| **Discord Bot** | ✅ Full DM handler | ❌ API only | ❌ | ❌ | ❌ | ❌ |
| **WhatsApp** | ✅ Direct | ❌ API only | ❌ | ❌ | ❌ | ❌ |
| **Wake Word** | ✅ openwakeword + PTT | ❌ App-only | ✅ | ✅ | ✅ | ❌ |
| **Proactive** | ⏳ In development | ❌ Reactive only | ❌ Rule-based | ❌ Rule-based | ❌ Rule-based | ❌ Reactive |
| **Web Search** | ✅ Tavily + DDG | ✅ Bing | ✅ Bing | ✅ Google | ✅ Bing | ✅ Bing via plugin |
| **Plugin System** | ⏳ Planned | ✅ GPT Store | ✅ Skills | ✅ Actions | ❌ | ✅ |
| **No Per-Token Cost** | ✅ Fixed API subs | ❌ Paid tiers | ❌ | ❌ | ❌ | ❌ Paid |
| **Open Source** | ✅ Yes | ❌ Closed | ❌ Closed | ❌ Closed | ❌ Closed | ❌ Closed |
| **Self-Hosted** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Natural Voice** | ✅ Emotion tags | ⚠️ Good | ⚠️ Robotic | ⚠️ Robotic | ⚠️ Robotic | ⚠️ Good |
| **Deep Research** | ⏳ Phase 6 plan | ✅ Deep Research | ❌ | ❌ | ❌ | ❌ |

**AURA's Unique Advantages:**
1. Only solution that combines local privacy with deep OS control
2. Only voice assistant with emotion-expressive speech
3. Only multi-model architecture routing tasks to optimal LLM
4. Only persistent semantic memory system (not just session history)
5. Only Discord DM proxy with autonomous conversation capability
6. Only fully open-source, self-hosted AI companion with this feature set
7. Zero per-token cost — unlimited use for fixed subscription fees

---

## 16. Investment Ask

### Investment Request: $1,000 USD

### Allocation of Funds

| Category | Amount | Purpose |
|---|---|---|
| **Cloud API Credits** | $300 | Mistral AI + OpenRouter API credits for 6+ months of development/testing |
| **TTS Voice Licenses** | $200 | Premium high-quality TTS voices for production quality |
| **Domain & Hosting** | $100 | Domain registration + optional cloud relay server for out-of-network access |
| **Hardware Testing** | $200 | Microphone array for far-field voice testing, second machine for cross-platform |
| **UI Development Tools** | $100 | Design resources, icon packs, UI component licenses |
| **Contingency** | $100 | Unforeseen costs |

### Deliverables (Within 4 Weeks)

| Milestone | Timeline | Description |
|---|---|---|
| **Phase 0-1 Complete** | Week 1 | ProactiveEngine loop + presence detection + DND |
| **Phase 2 Complete** | Week 2 | Rule registry + 14 rules + LLM classifier |
| **Phase 3 Complete** | Week 3 | Pattern store + behavior learning |
| **Phase 4-5 Complete** | Week 4 | Auto-execute + consent system + frontend widget |
| **Polish & Deploy** | Week 4+ | Documentation, testing, deployment package |

### What You Get

As an early investor, you receive:
1. **Lifetime personal license** to AURA V2 (includes all future updates)
2. **Priority feature requests** — your suggestions go to the top of the roadmap
3. **White-label option** — deploy AURA with your own branding
4. **Early access** to all new features before public release
5. **Direct line** to the developer for support and custom requests
6. **Investment acknowledgment** in the project README and documentation

### Why $1,000?

This is a **focused seed investment** to bridge the gap between AURA's current state as a powerful reactive assistant and its full vision as a proactive AI companion. The money enables:

- **6+ months of continuous API access** for all three LLM providers
- **Production-quality voice** through premium TTS licensing
- **Testing infrastructure** to ensure reliability across different Windows configurations
- **Focused development time** to complete all 6 roadmap phases

The current codebase is already **4,000+ lines of production-grade Python** with **437+ memories in the vector database** and a fully working voice pipeline. The $1,000 accelerates the transformation from reactive to proactive.

---

## 17. Appendix: API & Architecture Reference

### Core Data Flow

```
User Speech → Wake Word / PTT → Recording (sounddevice, 16kHz, int16)
  → VAD (energy threshold 300, 1.2s silence timeout)
  → STT (faster-whisper base, CPU int8)
  → Intent Classification (briefing? discord? voice switch? normal?)
  → Agent Loop (system prompt + memory + tools + LLM)
  → TTS (Supertonic / Edge / Kokoro with emotion tags)
  → WebSocket push to UI
```

### Socket Bridge Protocol (TCP Port 9001)

| Message | Source | Meaning |
|---|---|---|
| `STATE:{state}` | Voice pipeline | listening / thinking / speaking / idle |
| `USER:{text}` | Voice pipeline | User's transcribed speech |
| `AURA:{text}` | Voice pipeline | Aura's spoken response |
| `DISCORD:{json}` | Discord bot | New Discord message |
| `DISCORD_SESSION:{json}` | Discord bot | Session state change |
| `VOICE_CHANGED:{name}` | Voice pipeline | TTS voice switched |
| `MEMORY_ACCESS:{json}` | ChromaDB | Memory retrieval event |
| `BRIEFING_DATA:{json}` | FastAPI | Briefing data update |

### WebSocket Messages (from Backend to UI)

| Message | Source | Meaning |
|---|---|---|
| `STATE:speaking` | Backend | TTS is speaking |
| `STATE:idle` | Backend | TTS is idle |
| Text stream | Backend | Streaming Aura response |
| `BRIEFING_DATA:{json}` | Backend | Briefing data |
| `VOICE_CHANGED:{name}` | Backend | Voice changed |

### Key Constants (`core/config.py`)

```python
# Models
MODEL_DEEP  = "mistral-small-latest"
MODEL_FAST  = "meta-llama/llama-3.1-8b-instruct"
MODEL_TOOLS = "llama-3.3-70b-versatile"

# Server
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8000
UI_SOCKET_PORT = 9001

# Memory
MEMORY_SIMILARITY_THRESHOLD = 0.35
MEMORY_MAX_RESULTS = 5
MEMORY_DEDUP_THRESHOLD = 0.95
MEMORY_CHAR_LIMIT = 2200
USER_CHAR_LIMIT = 1375
MEMORY_AUTOSAVE_INTERVAL = 3

# Voice Pipeline
SAMPLE_RATE = 16000
CHUNK_SIZE = 1280
SILENCE_SECS = 1.2
SPEECH_THRESH = 300
WAKE_MODEL = "hey_jarvis"
DETECT_THRESH = 0.5

# Agent
MAX_TOOL_ROUNDS = 3
```

---

*"Aura is not a chatbot. She is a presence on your machine — one that listens, remembers, understands, and is learning to act on her own initiative. Entirely local. Entirely yours."*

**Contact:** Kenaz — Lead Developer

**Repository:** `C:\AURA_V2` | **UI Repository:** `C:\AURA_V2_UI`

**Status:** Active Development | **Version:** AURA V2