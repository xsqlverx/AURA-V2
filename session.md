# SESSION_CONTEXT

<!--
CRITICAL RULE FOR OPENCODE:
- DO NOT summarize full git histories or chat logs.
- DO NOT extrapolate or guess logic that was not explicitly executed in terminal or code.
- IF A FEATURE WAS NOT TESTED, MARK IT AS "UNTESTED". DO NOT ASSUME IT WORKS.
- OVERWRITE THIS FILE COMPLETELY AT THE END OF EVERY SESSION. NEVER APPEND.
-->

## 1. Primary Objective

- **Goal:** Fix macro playback ("Failed to fetch" on Play) AND make island launch work from the HUD (island fix from previous session, still needs server restart to verify end-to-end).

## 2. Verified State (Anti-Hallucination Anchor)

- **Git Repo:** `C:\AURA_V2` — branch main (no commits this session)
- **Files Modified:**
  - `scripts/macro_recorder.py` — `_parse_key()` now decodes `\xNN` control-char escapes: `'\x01'` → `chr(0x01)`. Previously Ctrl+A (recorded by pynput as `'\x01'`) became a literal 4-char string `\x01` → pynput `press()` raised ValueError → 500 mid-replay.
  - `core/server.py` — `POST /api/macros/{id}/play` is now ASYNC: sets `_playing_macro` guard (`_macro_play_lock`), spawns daemon thread (`_play_macro_thread`), returns `{success, playing}` immediately. Thread catches exceptions (logs via `logger.exception`) and clears the guard. Prevents 65s HTTP block (macro replay duration) and double-play.
- **Diagnosis evidence (verified by execution):**
  - `curl POST /api/macros/Insta login/play` → "Internal Server Error" at exactly 31.2s. Macro events at t≈30960: `{'key': "'\\x01'", 'action': 'press'}` = Ctrl+A (after `Key.ctrl_l` at 30780). Crash point = pynput ValueError on multi-char key string.
  - Macro "Insta login": 274 events, total replay duration 65.3s, max gap 5s → old endpoint blocked HTTP for the whole replay → browser aborts silent connection → "Failed to fetch" (api.ts:455).
- **Verified after fix:**
  - `_parse_key` unit checks: `'\x01'`→`'\x01'` (real control char), `'w'`→`'w'`, `Key.space`→`<Key.space>`, `Key.f19`→None. PASS
  - `import core.server` OK.
  - Endpoint end-to-end UNTESTED — server not restarted. Old process still serving.

## 3. Active WIP / Exact Blocker

- **No blockers.** Next: restart backend (`python main.py`), then:
  1. `curl POST /api/macros/Insta login/play` → should return `{success, playing}` instantly; macro replays in background without 500 (65s).
  2. Test `POST /api/island/start` → pill overlay appears (module-mode fix).
- **Carried over (UNTESTED):** macro recording overlays (stop button visibility from browser), memory CRUD fake UUIDs, `browser_control` registered-but-undispatched tool.

## 4. Pinned Constants & Decisions

- Play is fire-and-forget: response immediate, replay in daemon thread, single-flight via `_playing_macro`
- Island: module mode `-m aura_island.main`, cwd = UI root, PID file `data/island.pid`, psutil liveness, prebuilt-exe priority
- No comments in code

## 5. Files to Read at Session Start

- `session.md` (this file)
- `core/server.py` (macro section ~line 955, island section ~line 1030)
- `scripts/macro_recorder.py` (`_parse_key`, `play`)
- `C:\AURA_V2_UI\src\lib\api.ts` (playMacro — now resolves fast; no frontend change needed)
