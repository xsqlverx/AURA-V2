# Aura V2 — Proactive AI Implementation Plan

**Goal:** Transform Aura from a reactive chatbot into a genuinely proactive AI assistant that observes, decides, and acts without requiring user prompts.

**Philosophy:** Little by little. Each phase adds a layer of autonomy without breaking what already works.

---

## Phase 0 — Architecture: The Proactive Loop

A single long-lived background coroutine on the existing FastAPI event loop.

```python
# core/proactive.py — NEW FILE

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
            # Phase 2+ logic goes here
            await self._tick()

    def _in_cooldown(self) -> bool:
        return (time.time() - self._last_user_interaction) < self._cooldown_seconds

    def _user_present(self) -> bool:
        # Phase 1: simple idle detection via GetLastInputInfo / psutil
        ...

    def mark_interaction(self):
        self._last_user_interaction = time.time()

    async def _tick(self):
        # Override in subclasses / extend with phases
        ...
```

**Key design decisions:**

- Single `asyncio.create_task` on the server event loop — zero threads, zero extra processes.
- `mark_interaction()` is called by the existing `/chat` and `/ws` routes so the cooldown knows when the user was last active.
- The loop is purely CPU-idle during `asyncio.sleep(5)`.

**Modified files:**

- `core/server.py` — start `ProactiveEngine` in lifespan, call `mark_interaction()` in chat/ws handlers.
- `core/proactive.py` — **NEW FILE**, the engine itself.

---

## Phase 1 — Receptiveness Model

Aura must know _when_ to speak. These three guards are checked every tick before anything else.

### 1.1 Cooldown timer

Don't interrupt the user while they're in a conversation.

| Setting                           | Default |
| --------------------------------- | ------- |
| `PROACTIVE_COOLDOWN_SECONDS`      | 30      |
| `PROACTIVE_COOLDOWN_AFTER_TYPING` | 15      |

Every user message, Aura message, WS connection, or button press resets the timer.

### 1.2 User presence detection

| Method                                         | Cost         | Reliability                                |
| ---------------------------------------------- | ------------ | ------------------------------------------ |
| `GetLastInputInfo` (win32 API, ctypes)         | 0ms, no deps | Best — detects any keyboard/mouse activity |
| `psutil.sensors_battery()` + threshold         | 0ms          | Weak — only tells if laptop is awake       |
| Screen lock detection (lock workstation event) | 0ms          | Binary — locked = absent                   |

**Implementation:** Use `GetLastInputInfo` via `ctypes` (no new dependencies). If `idle > PRESENCE_TIMEOUT` (default 5 min), consider user absent. No proactive actions while absent.

### 1.3 Do Not Disturb

| Source        | Mechanism                                                   |
| ------------- | ----------------------------------------------------------- |
| Manual toggle | TopBar DND button → WS message → backend marks flag         |
| Automatic     | Focused fullscreen app detected (game, video, presentation) |
| Timer         | "DND for 2 hours" via chat command                          |

**State:** `ProactiveEngine.dnd` is either `False`, `True`, or `{"until": timestamp}`.

### 1.4 Combined logic per tick

```python
async def _tick(self):
    if self._dnd:
        return
    if self._in_cooldown():
        return
    if not self._user_present():
        return
    await self._run_rules()       # Phase 2
```

---

## Phase 2 — Hybrid Decision Engine

Rule-based triggers (fast, zero-cost) classify the situation. When rules are ambiguous, an LLM call resolves.

### 2.1 Rule registry

Each rule is a function that returns `None` (no trigger) or a `Suggestion` object.

```python
@dataclass
class Suggestion:
    category: str          # "alert", "reminder", "observation", "suggestion"
    priority: int          # 1-10
    message: str           # What to say
    action: dict | None    # Optional action to execute (Phase 4)
    source: str            # Rule name for logging
```

**Built-in rules (extensible):**

| Rule                 | Trigger                           | Suggests                                |
| -------------------- | --------------------------------- | --------------------------------------- |
| `high_cpu`           | CPU > 85% for 3 consecutive ticks | Alert: "High CPU detected"              |
| `high_ram`           | RAM > 90%                         | Alert: "RAM almost full"                |
| `low_disk`           | Any drive < 10% free              | Alert: "Drive C: running out of space"  |
| `time_of_day`        | 9:00 AM on weekday                | Greeting + calendar summary             |
| `time_of_day`        | 5:00 PM on weekday                | "Wrap up? 5 PM"                         |
| `battery_low`        | Battery < 20%, discharging        | Alert: "Battery low"                    |
| `battery_full`       | Battery = 100%, charging          | "Battery fully charged"                 |
| `long_idle_unlocked` | Idle > 3 min, PC unlocked         | "Still there?" (reminder)               |
| `process_spawned`    | Known app just launched           | "Spotify opened. Resume last playlist?" |
| `process_crashed`    | App crashed (event log)           | "Chrome crashed. Report bug?"           |
| `new_discord`        | New Discord message received      | "New message from X" (only if relevant) |
| `empty_trash`        | Recycle Bin > 1 GB                | "Clean up recycle bin?"                 |
| `network_down`       | No internet for > 60s             | "Network seems offline"                 |
| `network_back`       | Internet restored                 | "Network is back"                       |

### 2.2 Rule execution per tick

```python
async def _run_rules(self):
    suggestions: list[Suggestion] = []
    for rule in self._rules:
        try:
            result = await rule.check()  # sync or async
            if result is not None:
                suggestions.append(result)
        except Exception:
            continue  # One broken rule never blocks others

    if not suggestions:
        return

    # Highest priority wins
    suggestions.sort(key=lambda s: s.priority, reverse=True)
    best = suggestions[0]

    # If priority >= 8, act immediately (LLM skip)
    # If priority < 8, ask a cheap LLM if this is worth mentioning
    if best.priority >= 8:
        await self._speak_or_act(best)
    else:
        await self._classify_with_llm(best)
```

### 2.3 LLM classifier for low-priority triggers

Not all rules warrant a voice. The cheap model (Llama 3.1 8B via OpenRouter) decides:

**Prompt (~80 tokens):**

```
You are Aura's internal filter. The system detected: "{message}".
Context: User has been idle for {idle_seconds}s. Current time is {time}.
Should you mention this? Reply ONLY: YES or NO.
```

If YES → `_speak_or_act()`. If NO → silently discard.
Cost per call: ~100 tokens × ~$0.02/M = **$0.000002 per check**. Even at 10 checks/hour = **$0.00002/hour**.

### 2.4 Speaking

```python
async def _speak_or_act(self, suggestion: Suggestion):
    # 1. Send to WebSocket clients so the HUD shows it
    await ws_manager.broadcast(f"STATE:speaking")
    await ws_manager.broadcast(f"AURA:{suggestion.message}")
    await ws_manager.broadcast(f"STATE:idle")

    # 2. If an action is attached, execute (Phase 4)
    if suggestion.action:
        await self._execute_action(suggestion.action)

    # 3. Reset interaction timer (so we don't speak again immediately)
    self.mark_interaction()
```

---

## Phase 3 — Learning User Patterns

Rules define _what is possible_. Patterns define _what is relevant to this user_.

### 3.1 Pattern store (in-memory + persisted to ChromaDB)

```python
@dataclass
class Pattern:
    trigger_time: str          # "17:00" or "weekday"
    trigger_event: str | None  # "spotify.exe launched"
    action: str                # "user plays lofi playlist"
    confidence: float          # 0.0 → 1.0, incremented each repeat
    last_seen: float
```

**How patterns are learned:**

1. Proactive loop observes: "Every weekday at ~17:00, user launches Spotify and plays lofi"
2. After 3 repetitions, a `Pattern` is created with `confidence: 0.6`
3. At 16:55 the next weekday, Aura suggests: "It's almost 5 PM. Want me to open Spotify?"

### 3.2 Pattern detection trigger

A dedicated low-priority rule `detect_pattern` runs once per hour. It queries ChromaDB for recent `User:` memories, extracts repeated behaviors via an LLM prompt, and creates/updates `Pattern` objects.

**LLM prompt (~150 tokens):**

```
Analyze these recent user interactions and identify repeated patterns:
{last_50_memories}
Return JSON array: [{trigger, action, frequency}] or [] if none.
```

---

## Phase 4 — Proactive Actions (Auto-Execute)

Beyond speaking, Aura can _do_ things unprompted. Each action requires explicit opt-in per category.

### 4.1 Action categories verbosity level and safety

| Category                 | Description                         | Safety                           |
| ------------------------ | ----------------------------------- | -------------------------------- |
| 💬 **Speak only**        | Says something, never executes      | Safe always                      |
| 🔔 **Suggest + confirm** | Asks "Should I...?" wait for yes/no | Safe; recommend default          |
| ⚡ **Auto-execute**      | Does it without asking              | Requires user consent per-action |

### 4.2 Auto-execute candidates (user must enable each)

| Trigger                                        | Action                                  | Risk                    |
| ---------------------------------------------- | --------------------------------------- | ----------------------- |
| User leaves PC unlocked > 2 min                | `lock_pc()`                             | Low — beneficial        |
| Disk < 5% free                                 | Empty recycle bin + clean temp          | Low                     |
| Battery < 15%, discharging                     | Save work notification                  | Low                     |
| Known time pattern matched                     | Execute predicted action                | Medium — could be wrong |
| Suspicious process (unknown exe, high network) | Alert + log to file                     | Low                     |
| Calendar event in 5 min                        | `ws_manager.broadcast("Reminder: ...")` | Low                     |

### 4.3 User consent store

A simple JSON file `data/proactive_consent.json`:

```json
{
  "dnd": false,
  "auto_lock": true,
  "auto_clean": false,
  "auto_suggest": true,
  "auto_execute_patterns": false,
  "allow_speak_alerts": true,
  "allow_speak_observations": true,
  "max_suggestions_per_hour": 3
}
```

Managed via a new widget or a `POST /proactive/config` endpoint.

---

## Phase 5 — Frontend: Proactive Settings Widget (Optional)

A new widget `ProactiveWidget` that shows:

- DND toggle
- Last N proactive suggestions (log)
- Consent toggles for each action category
- "Learned patterns" list with enable/disable per pattern

---

## Phase 6 — Deep Research Engine

Make Aura capable of performing deep, structured research on a topic both on-demand (user asks "Research X") and proactively (the loop detects a contextual need). This phase adds a background research job system, safe web retrieval + RAG pipelines, summarization, citation, and a simple UI to inspect progress and results.

Key goals:

- Fast on-demand researcher via a single API call or widget.
- Long-running background jobs that can fetch, crawl, index, and produce a grounded report with citations.
- Privacy-first behavior: respect robots.txt, avoid scraping private accounts, and surface sources to the user.

Triggers:

- User request: `/research?query=...` or `ResearchWidget` submission.
- Proactive trigger: a high-confidence pattern suggests the user would benefit from a topic brief (e.g., "You're preparing for a meeting on X").

Architecture & flow:

1. Accept query + optional constraints (sources, max depth, allowed domains, max pages).
2. Start a `ResearchJob` (async task) and return job id.
3. Retrieval phase: query internal memories (Chroma), local notes, and then web search (site-limited fetch + lightweight crawl respecting robots).
4. Passage extraction and cleaning (dedupe, canonicalize dates/quotes).
5. RAG / LLM phase: generate structured report with sections, short summary, extended notes, and an ordered list of explicit citations (URLs + snippet offsets).
6. Persist results in `data/research_jobs.json` and optionally into `memory/chroma_store` as `Research:` memories (if user consents).

Safety, privacy & rate-limits:

- Honor `robots.txt` and site `Crawl-delay` headers.
- Default `max_pages` and time budget (e.g. 60s / 50 pages) and configurable in `data/proactive_consent.json`.
- Always show sources in the UI and include an option to "Open source" rather than auto-fetching private content.

Components:

- `core/research.py` — **NEW**: `ResearchManager`, `ResearchJob`, fetch/crawl helpers, RAG orchestration, and job status API.
- `tools/web.py` — **MODIFY**: add safe `fetch_page()`, `parse_links()`, `robots_allowed()` helpers.
- `memory/chroma_store.py` — **MODIFY**: optional `save_research_result()` to index results for future retrieval.
- `core/router.py` — **MODIFY**: add `/research/start`, `/research/status/{id}`, `/research/result/{id}` endpoints.
- `src/components/widgets/ResearchWidget.tsx` — **NEW**: submit queries, view progress, open results & citations.
- `data/research_jobs.json` — **NEW**: persistent job store for restart / inspection.

Example API (sketch):

```
POST /research/start
{ "query": "impacts of intermittent fasting 2026", "max_pages": 20 }

GET /research/status/{job_id}
GET /research/result/{job_id}
```

When to run in proactive loop:

- Low-priority: run `suggest_research_if_relevant()` once per day for long-term topics (requires pattern confidence > 0.7 and consent).
- High-priority: triggered by calendar/context (pre-meeting brief) or an urgent user question detected in chat logs.

Timeline & effort

- Core manager + endpoints + simple fetchers: ~3 files, 4 hours.
- UI widget + persistence: ~2 files, 2 hours.

Risks & mitigations

- Noisy scraping — limit depth, prefer search APIs and canonical sources.
- Copyright concerns — summarize and link; avoid reproducing long copyrighted passages verbatim.
- Cost — use cheap classifier to gate deep LLM summarization; cache results.

## Implementation Order & Timeline

| Phase | What                                                         | Dependencies                | Effort            |
| ----- | ------------------------------------------------------------ | --------------------------- | ----------------- |
| 0     | Background loop + cooldown + `ProactiveEngine` skeleton      | None                        | ~2 files, 1 hour  |
| 1     | User presence detection + DND                                | Phase 0                     | ~1 file, 30 min   |
| 2a    | Rule registry + 5 core rules (cpu, ram, time, battery, idle) | Phase 1                     | ~2 files, 2 hours |
| 2b    | LLM classifier integration                                   | Phase 2a                    | ~50 lines, 30 min |
| 3     | Pattern store + detection                                    | Phase 2b, ChromaDB (exists) | ~2 files, 3 hours |
| 4     | Auto-execute actions + consent store                         | Phase 2b                    | ~2 files, 2 hours |
| 5     | Frontend proactive settings widget                           | Phase 4                     | ~1 file, 1 hour   |
| 6     | Deep research engine (background & on-demand)                | Phase 2b, Phase 3 (memory)  | ~5 files, 6 hours |

**Total:** ~10 files, ~10 hours of focused work.

---

## Risks

| Risk                                | Mitigation                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Rule fires too often, spamming user | `max_suggestions_per_hour` hard cap + cooldown per rule (min 5 min between same rule)                        |
| LLM classifier says YES too often   | Track YES rate; if > 30%, auto-downgrade to NO for next 10 checks of that rule                               |
| User finds it creepy                | DND mode defaults to ON until user opts in. All auto-execute requires explicit consent per category.         |
| Pattern detection is noisy          | Minimum 3 repetitions before pattern is created. Confidence < 0.5 never triggers.                            |
| Background task crashes silently    | `asyncio.create_task` caught exception → log + restart. Proactive loop wraps entire `_tick()` in try/except. |
| Cooldown prevents urgent alerts     | Rules with `priority >= 9` bypass the cooldown check entirely. High CPU/battery alerts always get through.   |

---

## Appendix: File Manifest

| File                                         | Phase | Action                                                                                                 |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `core/proactive.py`                          | 0     | **NEW** — ProactiveEngine, loop, cooldown, presence, DND, rule runner, LLM classifier, action executor |
| `core/server.py`                             | 0     | **MODIFY** — instantiate ProactiveEngine in lifespan, call `mark_interaction()` in ws/chat routes      |
| `core/config.py`                             | 0     | **MODIFY** — add `PROACTIVE_COOLDOWN_SECONDS`, `PROACTIVE_PRESENCE_TIMEOUT`, `PROACTIVE_MAX_PER_HOUR`  |
| `core/router.py`                             | 2     | **MODIFY** — add `get_proactive_client()` (reuses existing cheap model)                                |
| `memory/chroma_store.py`                     | 3     | **MODIFY** — add `add_pattern()` / `get_patterns()` (or use existing `save`/`query`)                   |
| `data/proactive_consent.json`                | 4     | **NEW** — user consent store (created at startup if missing)                                           |
| `tools/system.py`                            | 4     | **MODIFY** — add `lock_if_away()`, `clean_temp_files()` (thin wrappers)                                |
| `src/stores/aura-store.ts`                   | 5     | **MODIFY** — add proactive state (dnd, last suggestions, consent)                                      |
| `src/lib/api.ts`                             | 5     | **MODIFY** — add `fetchProactiveConfig()`, `updateProactiveConfig()`                                   |
| `src/components/widgets/ProactiveWidget.tsx` | 5     | **NEW** — DND toggle, suggestion log, consent toggles                                                  |
| `src/components/WidgetManager.tsx`           | 5     | **MODIFY** — register new widget                                                                       |
| `src/components/TopBar.tsx`                  | 5     | **MODIFY** — add DND indicator/button                                                                  |
| `core/research.py`                           | 6     | **NEW** — `ResearchManager`, job lifecycle, RAG orchestration, citation & persistence                  |
| `tools/web.py`                               | 6     | **MODIFY** — add safe `fetch_page()`, `robots_allowed()`, `parse_links()` helpers                      |
| `src/components/widgets/ResearchWidget.tsx`  | 6     | **NEW** — research submission UI, progress, results, open-citation links                               |
| `data/research_jobs.json`                    | 6     | **NEW** — persistent store for long-running research jobs                                              |
