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

### Plan
- **Classification trigger:** After a tool-calling round, the agent evaluates whether the action sequence is repeatable and parameterizable (e.g., "open chrome and type youtube.com" is a repeatable skill)
- **Detection heuristic:** `core/agent.py` checks if the same tool was called with similar parameters >2 times in a session, or if the user explicitly says "remember this for later"
- **Proposal flow:**
  1. Agent drafts a skill name + description + tool sequence
  2. Pushes via WebSocket (`SKILL_PROPOSAL:{}`) to the frontend
  3. Frontend shows a bottom-right slide-in toast with title + description + Approve / Reject buttons
  4. Approved skills save to `data/skills.json` as a new tool schema
- **Pending queue:** Store unread proposals in `data/skills_pending.json`, exposed via `GET /skills/pending`
- **Dedicated widget:** "Skills" tab in the UI (separate card, brain icon, shows active + pending proposals)

### Key files
- `core/agent.py` — detection logic, proposal emission
- `tools/registry.py` — dynamic skill tool injection
- `core/server.py` — pending queue endpoints
- `C:\AURA_V2_UI\src\components\widgets\SkillsWidget.tsx` — frontend

---

## ⏳ Phase 4 — Cleanup & Deprecation Removal

**Goal:** Remove old code made obsolete by earlier phases.

### Plan
- `core/agent.py:22` — Remove `_turns_since_memory` module variable (global, not thread-safe; proactive saves now handled by persona instruction in `AURA_PERSONA`)
- `core/agent.py` — Remove the nudge block that checks `_turns_since_memory` every iteration
- `memory/memory_tool.py:62-64` — Remove `"forget"` action handler stub (returns "not yet implemented"; not in schema enum so LLM never calls it anyway)
- `tools/registry.py` — Remove `"forget"` from action enum if present in schema descriptions
- `voice/wake.py` — This entire file is dead code (imports non-existent `WhisperSTT` class from `voice.stt`, not imported anywhere). Either delete or fix with a note pointing to `voice/pipeline.py`'s openwakeword implementation.

### Key files
- `core/agent.py`
- `memory/memory_tool.py`
- `tools/registry.py`
- `voice/wake.py`

---

## ⏳ Phase 5 — Plugin System

**Goal:** Full ABC provider pattern for MemoryManager instead of ad-hoc refactor.

### Plan
- **Define abstract base class** in `memory/base.py`:
  ```python
  from abc import ABC, abstractmethod

  class MemoryProvider(ABC):
      @abstractmethod
      def save(self, text: str, metadata: dict | None = None) -> str: ...
      @abstractmethod
      def search(self, query: str, limit: int = 5) -> list[dict]: ...
      @abstractmethod
      def get_all(self) -> list[dict]: ...
      @abstractmethod
      def delete(self, id: str) -> bool: ...
      @abstractmethod
      def update(self, id: str, text: str) -> bool: ...
  ```
- **Provider implementations:**
  - `ChromaMemoryProvider` — wraps `chroma_store.py`, persists to `data/chroma/`
  - `FileMemoryProvider` — wraps `store.py`, uses `data/memories/`
  - `SQLiteMemoryProvider` — future option for structured queries
- **Registration mechanism:** `memory/registry.py` — dict-based `{name: class}` mapping, loaded from config
- **Config-based selection:** Add `MEMORY_PROVIDER` env var to `core/config.py` (options: `"chroma"`, `"file"`, default: `"chroma"`)
- **Backward compatibility:** `memory/__init__.py` exports a `get_memory()` factory that reads the config and returns the correct provider instance
- **Migration path:** Existing `chroma_store.save()` calls → `get_memory().save()` — can be done incrementally, one caller at a time

### Key files
- `memory/base.py` — ABC definition
- `memory/registry.py` — provider registration
- `memory/chroma_provider.py` — wraps existing chroma_store
- `memory/file_provider.py` — wraps existing store
- `memory/__init__.py` — factory function
- `core/config.py` — `MEMORY_PROVIDER` env var

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
