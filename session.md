# SESSION_CONTEXT

<!--
CRITICAL RULE FOR OPENCODE:
- DO NOT summarize full git histories or chat logs.
- DO NOT extrapolate or guess logic that was not explicitly executed in terminal or code.
- IF A FEATURE WAS NOT TESTED, MARK IT AS "UNTESTED". DO NOT ASSUME IT WORKS.
- OVERWRITE THIS FILE COMPLETELY AT THE END OF EVERY SESSION. NEVER APPEND.
- Mobile app work: FROZEN in C:\AURA_V2\legacy\aura-mobile (detached 2026-08-17). See LEGACY_AGENTS.md.
- PC UI work (C:\AURA_V2_UI) is documented in this file alongside backend work.
-->

## 1. Primary Objective

- **Goal:** Fix the PC UI WebSocket connect/disconnect churn bug (backend log showed a WS client connecting then dropping ~every 1s). Plus a memory-tool robustness fix on the backend. Mobile app work this session: black-screen diagnosis → EAS dev-client rebuild (in cloud), and a new "independent brain" API-key section in the mobile Settings tab.

## 2. Verified State (Anti-Hallucination Anchor)

- **Git Repos:** `C:\AURA_V2` (backend) + `C:\AURA_V2_UI` (PC HUD) — branch main. Mobile detached to `legacy/aura-mobile` (local only, gitignored).
- **WS churn root cause (VERIFIED via log analysis + Playwright):**
  - The UI page opened TWO WebSocket connections to `ws://localhost:8000/ws`: one owned by `useWebSocket` (Zustand store), one inline in `AuraStateProvider`. The churn itself came from a feedback loop: every connect → `setWsConnected(true)` → provider re-render → inline `addNotification` got a NEW identity each render → `useWebSocket`'s `connect` callback (a dep of its `useEffect`) was recreated → effect cleanup CLOSED the socket → reconnect → repeat.
  - Fixes applied (see "What Was Built"): removed the inline WS, wrapped `addNotification` in `useCallback([])`, added a store→context orb-state sync effect.
  - **VERIFIED FIXED:** after the fix, a Playwright load of `http://localhost:3000` for 12s produced exactly 2 WS log lines in `server-run.log` (1 connect on load, 1 disconnect on browser close). Delta before/after fix: churn stopped.
- **Memory tool fix (VERIFIED via temp test script, since deleted):**
  - LLM (Groq llama-3.3-70b) called `memory` with `{'action':'add','category':'user','key':'college','value':'...'}` — i.e. invented `key`/`value` args that don't exist in the schema. `text` arrived empty → `handle_memory_tool` returned "You must provide 'text' to add a memory." → nothing saved.
  - After fix: `_parse_native_function` on `<function=memory {"action":"add","category":"user","key":"college","value":"AISAT Engineering College"}<function=memory>` yields args; the `_run_tool` fallback maps empty `text` → `"college: AISAT Engineering College"`. Normal `text` path passes through unchanged. Both paths PASS.
- **Python syntax:** `ast.parse` on `core/agent.py` + `tools/registry.py` → OK.
- **TypeScript:** NOT re-run this session after edits (UI edits were small; no tsc run since). Run `npx tsc --noEmit` in `C:\AURA_V2_UI` before calling this session's UI work done.
- **Backend status:** was killed at end of WS-churn work (ports 8000 + 9001 clear). Backend has NOT been restarted since the memory-tool/registry edits — those edits are UNTESTED against a live server. Restart with `python main.py`, then `python Test.py`.

## 3. What Was Built / Changed

### Backend (`C:\AURA_V2`)

- `core/agent.py` (`_run_tool`, `case "memory"`): if `text` is empty, compose it from `key`/`value` args the LLM may have invented (`f"{key}: {value}"`, or just `value`). Guards against schema-mismatch memory losses.
- `tools/registry.py` (`memory` tool): description now opens with "IMPORTANT: Always put the full fact to remember in the single 'text' field as one complete sentence. NEVER use 'key' or 'value' fields — they do not exist." Teaches the model the correct arg instead of only papering over it.
- `memory/chroma_store.py` (`_get_embedder`): loads the embedding model from the local folder `data/models/all-MiniLM-L6-v2` when present (sets `HF_HUB_OFFLINE=1`), falling back to the cached HF name otherwise. Prevents startup hanging on a HuggingFace re-download. Model files (~90MB) were downloaded into `data/models/all-MiniLM-L6-v2` because the HF cache had corrupt empty `blobs/`.
- Startup also blocked earlier by stale `data/aura.pid` (multi-process fight) — stale lock file was deleted; only ONE `python main.py` runs.

### PC UI (`C:\AURA_V2_UI`)

- `src/context/AuraStateContext.tsx`:
  - REMOVED the inline duplicate WebSocket effect (was ~lines 529-580). `useWebSocket` is now the single WS owner.
  - Wrapped `addNotification` in `useCallback([])` → stable identity → `useWebSocket`'s `connect` callback stays stable → no reconnect loop.
  - Added `useEffect` syncing `storeOrbState` (Zustand) → `currentState` (context), mapping `'thinking'` → `'processing'`.
- `src/hooks/use-websocket.ts`:
  - `addNotification` now sourced from `useAura()` context instead of the store (signature: `(message: string, type)` positional, not object form).
  - Added `PHONE_NOTIF:` handling (parses JSON, shows toast).
  - Added `console.log` on connect + every WS message (temporary debug; can be removed later).
  - NOTE: this file ALSO still carries the server's WS prefixes (STATE, VOICE_CHANGED, etc.) — it is the single source of truth for WS state now.

### Mobile — FROZEN in `C:\AURA_V2\legacy\aura-mobile` (see LEGACY_AGENTS.md)

- Black screen root cause (VERIFIED by dex-scan of installed APK): installed APK (versionCode=1) lacks the `ExpoLocation` native module; the JS bundle imports `expo-location` at module load (`src/api/aura.ts` → `src/services/location.ts`) → crash on launch. `expo-location` was added to app.json in commit `5c0922a` AFTER the last dev-client build.
- Fix chosen by user: rebuild dev client via EAS cloud build (`eas build --platform android --profile development`). Build was STARTED in cloud (~15-25 min); the local eas-cli PID was later killed during backend cleanup — re-check status with `eas build:list --platform android` if the APK doesn't show up.
- NEW this session: "independent brain" — user will supply their OWN LLM API key so the phone can reply without the PC. Settings-tab section added (see aura-mobile session.md / the settings changes for exact wiring).

## 4. Active WIP / Blocker

- Backend not running; memory-tool + registry edits UNTESTED against live server. Next: `python main.py` → wait for health check → `python Test.py`.
- `npx tsc --noEmit` in `C:\AURA_V2_UI` not run after UI edits.
- EAS dev-client rebuild in cloud — status unknown after eas-cli process was killed. Verify with `eas build:list --platform android`.
- Mobile "independent brain" API-key settings section built this session (UNTESTED on device — no dev build installed yet).

## 5. Pinned Constants & Decisions

- WS prefixes (UI hook): STATE, USER, AURA, DISCORD, DISCORD_SESSION, BRIEFING_DATA, MEMORY_ACCESS, BRIEFING_CHUNK, VOICE_CHANGED, DICTATION, PHONE_NOTIF.
- Mobile backend default: `http://192.168.29.242:8000` (aura.ts DEFAULT_URL); settings default `http://100.100.100.100:8000`; Bearer `testkey123` (MOBILE_API_KEY in .env.local).
- PC UI API: `http://localhost:8000`; WS `ws://localhost:8000/ws`; ONE WebSocket in the whole src tree (use-websocket.ts) — do NOT add another.
- Embedding model: `data/models/all-MiniLM-L6-v2` (384-dim), HF_HUB_OFFLINE=1 when local dir exists.
- EAS profile `development`: developmentClient true, distribution internal, buildType apk. EAS account: sqlver / sqlvers-organization.

## 6. Files to Read at Session Start

- `C:\AURA_V2\session.md` (this file) + `C:\AURA_V2_UI\session.md`
- `legacy/aura-mobile/session.md` + `legacy/aura-mobile/LEGACY_AGENTS.md` (frozen, for reference only)
- `core/agent.py` (`_run_tool` memory case ~410, `_parse_native_function` ~90)
- `core/server.py` (websocket_endpoint ~545, `_WSManager` ~35, mobile_auth_middleware ~208)
- `memory/chroma_store.py` (`_get_embedder`)
- `C:\AURA_V2_UI\src\hooks\use-websocket.ts` (single WS owner)
- `C:\AURA_V2_UI\src\context\AuraStateContext.tsx` (store→context sync, addNotification)
- `legacy/aura-mobile/src/stores/settingsStore.ts` + `legacy/aura-mobile/app/(tabs)/settings.tsx` (frozen reference)