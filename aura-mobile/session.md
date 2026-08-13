# SESSION_CONTEXT

<!--
CRITICAL RULE FOR OPENCODE:
- DO NOT summarize full git histories or chat logs.
- DO NOT extrapolate or guess logic that was not explicitly executed in terminal or code.
- IF A FEATURE WAS NOT TESTED, MARK IT AS "UNTESTED". DO NOT ASSUME IT WORKS.
- OVERWRITE THIS FILE COMPLETELY AT THE END OF EVERY SESSION. NEVER APPEND.
-->

## 1. Primary Objective

- **Goal:** Cross-repo feature "Mobile Brain Sync": (1) offline-first memory mirror between the desktop backend and the mobile app, (2) desktop→phone action handoff where the PC LLM delegates phone-only actions (SMS, open app, share) to the Android app via a stream marker, (3) a Phone Sync widget in the PC HUD.

## 2. Verified State (Anti-Hallucination Anchor)

- **Git Branch:** main (both C:\AURA_V2 and C:\AURA_V2\aura-mobile)
- **TypeScript (mobile):** `npx tsc --noEmit` exits 0 — zero errors
- **TypeScript (PC UI, C:\AURA_V2_UI):** `npx tsc --noEmit` exits 0 — zero errors
- **Python (backend):** `from core import server, agent` exits 0
- **Tested (via scripts in C:\AURA_V2\scripts\):**
  - `test_handoff_tool.py` — `agent._run_tool('android_handoff', {...})` returns `{"handoff": true, "platform": "android", "action": ..., "phone_number": ..., "message": ..., "app_package": ..., "text": ...}` — PASS
  - `test_sync_endpoints.py` — httpx.ASGITransport (lifespan skipped):
    - `GET /memory/mobile-sync` → 200, `{revision, curated[], memories[]}`
    - `POST /memory/mobile-sync` → 200 `{success, added_curated, added_chroma}`, dedupes exact text, revision changes after push — PASS
  - NOTE: routes were verified in-process; the long-running server (pid on :8000, started before these edits) does NOT have the new routes until restarted.

## 3. What Was Built

### Backend (`C:\AURA_V2`)

- `core/server.py`:
  - `MobileSyncPush` Pydantic model (`curated: list[dict]`, `memories: list[dict]`)
  - `GET /memory/mobile-sync` — pulls curated (USER.md/MEMORY.md via get_store) + 50 most-recent ChromaDB entries sorted by metadata timestamp, plus a 24-char SHA-256 `revision` over curated text + entry ids
  - `POST /memory/mobile-sync` — phoneside push: curated dedupes by exact text against existing store entries; Chroma entries go through `chroma_store.save()` (embedding-similarity dedup)
  - Routes behind existing `mobile_auth_middleware` (Bearer MOBILE_API_KEY; localhost bypass)
- `tools/registry.py`: added `android_handoff` schema (`action` enum: send_sms / open_app / share_sheet, plus phone_number, message, app_package, text)
- `core/agent.py`:
  - Dispatch `case "android_handoff":` in `_run_tool()` → returns a handoff dict
  - Tool loop in `_run()`: when the tool name is `android_handoff`, yields `<handoff_android>{json}</handoff_android>` into the stream (phone intercepts + strips it)
  - `AURA_PERSONA_TOOLS`: added "Android (Phone) Actions" section telling the LLM to delegate SMS/open-app/share via `android_handoff` instead of faking them on PC

### Mobile (`C:\AURA_V2\aura-mobile`)

- `src/services/handoff.ts` (NEW):
  - `extractHandoffs(text)` — regex `<handoff_android>(.*?)</handoff_android>`, strips completed markers + any unclosed trailing marker from display text, returns parsed actions
  - `executeHandoff(action)` — send_sms via `Linking.openURL('sms:...?body=...')`, open_app via `expo-intent-launcher` `openApplication`, share_sheet via React Native `Share.share`
- `src/components/conversation/useConversation.ts`: streaming callback buffers chunks, strips markers, collects handoffs, then executes them after the stream ends
- `src/services/memorySync.ts` (NEW): expo-file-system JSON store at `document://mobile_brain_sync.json`; `syncFromDesktop()` pulls GET + pushes queued entries, `queueCurated()` / `queueMemory()` for offline-first writes, `getMobileBrainState()`
- `src/api/aura.ts`: added `pullMobileMemorySync()`, `pushMobileMemorySync()`
- `app/(tabs)/memory.tsx`: cloud-sync button in header that calls `syncFromDesktop()` + status line
- `src/components/glances/glances/DesktopGlance.tsx`: added "Brain Sync" card (tap to sync, shows revision + synced state)

### PC UI (`C:\AURA_V2_UI`)

- `src/lib/api.ts`: added `fetchMobileSync()` + `MobileSyncData` type
- `src/components/PhoneWidget.tsx` (NEW): polls `/memory/mobile-sync` every 30s, WidgetCard shows curated/recent counts, revision, fetched time; manual refresh button; empty state
- `src/components/Views/GlancesView.tsx`: imported + added `<PhoneWidget />` to the widget grid

## 4. Active WIP / Blocker

- **State:** All features built and statically verified; backend routes verified in-process. NOT yet run end-to-end through a live server + real device.
- **Next steps (untested until done):**
  1. Restart the backend (`python main.py`) so :8000 serves the new routes, then `python Test.py`
  2. Real handoff E2E: in chat, trigger a message the LLM routes to `android_handoff`, confirm `<handoff_android>` appears in the stream and the phone executes it (needs dev build with expo-speech-recognition / intent-launcher)
  3. Verify PhoneWidget + memory sync button against the live server

## 5. Pinned Constants

- Mobile API default: `http://192.168.29.242:8000` (aura.ts DEFAULT_URL), Bearer `testkey123`
- PC UI API: `http://localhost:8000`, WS `ws://localhost:8000/ws`
- Sync store file: `Paths.document` + `mobile_brain_sync.json`
- Sync revision: 24-char SHA-256 over curated texts + recent entry ids
- Sync pull limit: 50 most-recent ChromaDB entries (metadata timestamp desc)
- Handoff marker: `<handoff_android>{json}</handoff_android>` (flat, no envelope)
- WS prefixes (existing): STATE, USER, AURA, DISCORD, DISCORD_SESSION, BRIEFING_DATA, MEMORY_ACCESS, BRIEFING_CHUNK, VOICE_CHANGED, DICTATION, PHONE_NOTIF
- Existing WS prefixes for desktop presence: (see DesktopPresenceSync) — DesktopGlance reuses `useDesktopPresence`
- Backend test scripts live in `C:\AURA_V2\scripts\test_handoff_tool.py` + `test_sync_endpoints.py`
