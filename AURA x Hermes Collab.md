# AURA x Hermes Collab — Memory System Roadmap

## Overview
Integrating Hermes Agent–style memory architecture into AURA v2: behavioral tool guidance, proactive memory saves, session search, skill proposals, plugin system.

---

## ✅ Phase 1 — Make the Memory Tool Actually Work

**Goal:** The LLM should reliably call the `memory` tool instead of just acknowledging verbally.

### Done
- Rewrote `memory_tool.py` handler with Hermes-style behavioral guidance and logging
- Rewrote `tools/registry.py` schema with rich WHEN / WHEN NOT / PRIORITY descriptions
- Added permanent **Memory Behavior** block to `AURA_PERSONA` in `core/agent.py` instructing proactive saves
- Renamed `MEMORY_NUDGE_INTERVAL` → `MEMORY_AUTOSAVE_INTERVAL` (10→3 turns)
- Added "remember", "memory", "forget", "recall" to `_TOOL_KEYWORDS` in `core/router.py`
- Fixed stale snapshot cache in `memory/store.py` (`_save_category` now calls `_refresh_snapshot`)
- Fixed widget stale snapshot by adding background refresh every 30s in `MemoryWidget.tsx`
- Separated ALL (ChromaDB raw) and CURATED (file-based) tabs in frontend widget

### Remaining
- _(None — phase complete)_

---

## ✅ Phase 2 — Session Search Engine

**Goal:** Let the agent query past conversations via semantic search during a chat.

### Done
- Added `search` action to `memory_tool.py` calling `chroma_store.get_relevant(text)`
- Added `"search"` to action enum and schema description in `tools/registry.py`
- Verified end-to-end: ChromaDB queries return formatted snippets with similarity scores
- All CRUD endpoints (`/curated-memory`) tested and working (LIST/ADD/UPDATE/DELETE)

### Remaining
- _(None — phase complete)_

---

## 🔧 Phase 1.5 — Tag Leak Fixes & Model Tuning

**Goal:** Stop tool call markup from leaking into voice output; get the model to actually use the function calling API.

### Done
- Expanded `_scrub()` in `core/agent.py` to strip `<memory ...>`, `<function=name>`, `</memory>`, `</function>` tags (preserves voice tags like `<laugh>`)
- Added `CRITICAL RULE` to system prompt: never output tool calls as text/XML
- Switched tools model from `llama-3.1-8b-instant` → `mixtral-8x7b-32768` → `llama-3.3-70b-versatile` (reliable function calling)

### Remaining
- _(None — phase complete, but still verify LLM makes actual function calls on "remember")_

---

## ⏳ Phase 3 — Skill Proposals

**Goal:** Aura identifies automatable tasks and proposes them as "skills" to the user.

### Not Started
- Skill proposal system: Aura classifies tasks for skill-worthiness
- Bottom-right slide-in toast with title + description + Approve / Reject buttons
- Aura decides when to ask (non-blocking, single yes/no proposal prompt)
- Pending queue for unread proposals
- Dedicated "Skills" widget (brain icon, 2 tabs) — later

---

## ⏳ Phase 4 — Cleanup & Deprecation Removal

**Goal:** Remove old code made obsolete by earlier phases.

### Not Started
- Remove `_turns_since_memory` module variable and nudge block from `core/agent.py` (proactive saves now handled by persona instruction)
- Remove `forget` action stub from `memory_tool.py` (dead code, not in schema enum)
- Remove any other dead code identified during audit

---

## ⏳ Phase 5 — Plugin System

**Goal:** Full ABC provider pattern for MemoryManager instead of ad-hoc refactor.

### Not Started
- Define abstract base class / protocol for memory backends
- Provider implementations (ChromaDB, file-based, etc.)
- Registration / discovery mechanism
- Config-based provider selection

---

## Current Architecture

```
┌─ Input ──────────────────────────────┐
│  Voice / Text / Discord              │
└────────────┬─────────────────────────┘
             ▼
┌─ Router (needs_tools) ───────────────┐
│  Keyword-based: conversation vs tools │
└────────────┬─────────────────────────┘
             ▼ (tool path)
┌─ Agent (tools: Groq llama-3.3-70b) ─┐
│  System prompt ← curated memory     │
│  Tools: memory, web_search, etc.    │
│  Nudge: every 3 turns (Phase 4)     │
└──┬──────────┬───────────────────────┘
   │          │
   ▼          ▼
┌─ Memory ─────┐  ┌─ ChromaDB ────────┐
│ Curated      │  │ Raw conversation  │
│ User.md      │  │ log (440+ msgs)   │
│ Memory.md    │  │ semantic search   │
│ CRUD API     │  │ "search" action   │
└──────────────┘  └───────────────────┘
```

## Files Reference

| File | Purpose |
|------|---------|
| `core/agent.py` | Agent loop, system prompt, tool dispatch, scrubber |
| `core/config.py` | All env vars and constants |
| `core/router.py` | LLM routing, keyword classifier |
| `tools/registry.py` | Tool schemas sent to the LLM |
| `memory/memory_tool.py` | Handler for the LLM-callable memory tool |
| `memory/store.py` | File-based curated memory (User.md / Memory.md) |
| `memory/chroma_store.py` | ChromaDB vector store for raw conversation log |
| `memory/context.py` | Live context injection (weather, time) |
| `C:\AURA_V2_UI\src\lib\api.ts` | Frontend API (raw + curated CRUD) |
| `C:\AURA_V2_UI\src\components\widgets\MemoryWidget.tsx` | Dual-tab memory widget (ALL / CURATED) |
