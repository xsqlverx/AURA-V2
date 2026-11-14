# Aura hands-free mode — implementation brief for Anti-Gravity

Prepared 2026-09-23. Planning only: no application code was changed to produce this document.

## 1. Your assignment

Implement this feature in the existing Windows Aura application. Read this entire brief, inspect the current checkout, then implement the phases in order. Preserve existing uncommitted work in both repositories. Do not rewrite Aura or replace its UI. Complete the functional tests and report actual measurements and remaining limitations; do not equate a passing mock with working desktop control.

Backend: `C:\AURA_V2`. Native island UI: `C:\AURA_V2_UI\aura_island`. There is also a Next.js UI in `C:\AURA_V2_UI\src`; verify the user's running entrypoint before final integration and keep the shared event contract compatible with both.

The user wants to hold Right Shift, say “Aura, activate hands-free mode,” release Shift, see a clear persistent visual change, and then speak commands without holding a key or repeating a wake word. Remain in this mode until explicitly switched off. Support opening apps, typing exact dictated text, clicking website controls, navigating Instagram messages and specific chats, and reading requested text aloud. No vision model and no required paid runtime APIs. Use deterministic commands wherever possible; use a text model only for interpretation that actually needs it.

Assumptions selected for implementation: preserve existing **Right Shift** PTT binding; activation happens on the spoken request, not merely holding Shift. Start with Aura's dedicated visible browser, and one manual login per site. No automatic timeout during normal use. Session restart starts hands-free OFF. Sending messages is a separate explicit command from typing a draft.

## 2. Core decision: structured controls, not screenshots or full HTML

Use three routes:

1. **Local grammar → local executor:** mode commands, known app launch, literal typing, reading selected text, back/scroll/tab, and explicitly named controls. No LLM call.
2. **Page controls → deterministic resolver/site workflow:** match names, roles, labels, and current context; Instagram inbox/search/chat steps get a small tested adapter. No LLM call for known workflows.
3. **Compact page snapshot → text planner → validated executor:** ambiguous semantic requests on unfamiliar pages. Local text model if usable on this machine; explicitly configured free cloud service is optional. Cloud quota is not guaranteed. If no planner is available, continue supporting routes 1–2 and report unsupported interpretation honestly.

Playwright locators support roles and accessible names, and automatically wait for actionable elements. Use these facilities rather than screen coordinates [S1, S2]. ARIA snapshots supply useful structure but do not themselves supply executable element IDs; build a separate local target registry [S3]. Windows UI Automation exposes desktop controls and supported operations without image recognition [S4].

Do not feed “all website data” into an LLM. It is slow, noisy, private, and unnecessary. Read only relevant rendered controls and text, retrieve more on demand, and distinguish unloaded content from content that was actually observed. This cannot operate every website: unlabeled canvas controls, inaccessible custom widgets, CAPTCHA, some closed shadow roots, and unsupported native dialogs require a clear fallback to the user. Never guess coordinates to conceal this limitation.

## 3. Current implementation evidence and integration map

These are source inspection findings, not runtime test results. Recheck before editing because both repositories already contain extensive user changes.

| Existing file | Observed behavior | Required integration |
|---|---|---|
| `voice/pipeline.py` | Right Shift PTT, `flow_mode` event, `toggle_flow_mode`, `_flow_listen_loop`, `_process_utterance`; active entrypoint loads openWakeWord and CPU int8 faster-whisper | Evolve flow mode into hands-free with one state owner and continuous capture; retain old flow API compatibility |
| `voice/pipeline.py` | Flow loop calls `_process_utterance` synchronously and waits for TTS before returning to microphone reads | Separate capture, transcription, execution, and playback; keeping a stream open is insufficient |
| `voice/pipeline.py`, `voice/stt.py` | Separate transcription paths attempt Groq when a key exists, then local Whisper | Unify provider policy and model ownership; hands-free defaults local; an API key alone must not opt into cloud |
| `core/fastpath.py` | Existing rule matching before LLM, including normalization; explicitly rejects multi-action commands | Add bounded compound command parsing and preserve literal payload casing, punctuation, and words |
| `core/agent.py` | Fast path precedes cloud routing; `_run_tool` dispatches tools | Insert hands-free orchestration before general cloud routing; keep a single execution contract |
| `tools/browser_agent.py` | Visible persistent Playwright context at `~/.aura_browser/profile`, a dedicated event-loop thread, smart click/type helpers | Reuse browser service, add snapshot/target registry, serialization, active-tab ownership, verification, cancellation |
| `tools/browser_agent.py` | Several click paths use `.first`; chained fallback timeouts; `_goto` can return success with navigation timeout warning; sync `_run` waits on a future | Replace ambiguity guessing, bound overall deadlines, verify outcomes, and cancel timed-out futures |
| `tools/system.py` | App launcher and `pyautogui.write(text, interval=0.03)` | Confirm target window/editor, use Unicode-capable input, verify text; 30 ms per character already costs 1.8 s for 60 characters |
| `tools/system.py` | `launch_app` references `resolved` after URI branch where it is not assigned | Fix this touched launch path; distinguish action failure from reporting failure, never retry blindly |
| `tools/hotkeys.py` | Alt+M stops TTS, Ctrl+Alt+S toggles flow mode | Keep bindings, route to same controller; document emergency hands-free off shortcut |
| `core/server.py` | GET `/flow_mode`, POST `/flow_mode/toggle`; socket-to-WebSocket bridge; independent `STATE:idle` emissions | Add authoritative mode status and idempotent set endpoint; mode must survive transient activity changes |
| `aura_island/monitors/aura_monitor.py` | Reads `STATE:`, `USER:`, `AURA:`, `JOB:`, `PENDING:` | Add structured hands-free event and reconnect state refresh |
| `aura_island/main.py`, `aura_island/panels/aura_panel.py`, `aura_island/tokens.py` | Native island state/paint integration; `run_island.bat` launches this UI | Persistent hands-free indicator, activity text, microphone health, Stop control; retain current styling |
| `main.py` | Voice initialization currently depends on TTS startup succeeding | Fail gracefully if speech output unavailable: show health and avoid falsely reporting hands-free active |

`voice/wake.py` is a separate Porcupine implementation; do not assume it is the active path just because of its filename. Do not undertake a wake-word-model replacement for this feature. Activation uses PTT; no custom “Aura” wake model is required.

Existing `docs/AURA_AUDIT_AND_14_DAY_PLAN.md` and `docs/audit/VALIDATION_RESULTS.md` are historical audit material, not proof current defects remain or have been repaired. Check execution result handling in the actual checkout.

## 4. Interaction and state contract

Keep these separate:

- `enabled`: whether the hands-free session is active.
- `activity`: `listening | transcribing | executing | speaking | clarifying | error`.
- `mic_status`: `ready | unavailable | recovering`.
- `session_id`, monotonically increasing `generation`, `sequence`, and current `command_id`.

Use one controller as authoritative owner. Do not implement a second independent boolean beside `flow_mode`. Existing flow endpoint and shortcut become compatibility adapters to this controller. Expose explicit enable/disable operations; toggles are unsuitable for retried requests. Thread-safe transitions publish events and cancellation consistently.

Recognize complete command forms locally, with optional leading “Aura” and polite framing:

| Utterance | Meaning |
|---|---|
| Activate/enable/turn on hands-free mode | Enable idempotently; acknowledge once |
| Disable/deactivate/turn off hands-free mode; hands-free mode off; hands-free mode turned off | Disable, cancel current work, clear queued commands, stop TTS |
| Stop / cancel / stop that | Cancel current action or reading, stay hands-free |
| Stop reading | Cancel only read-aloud, stay hands-free |
| Start dictation / stop dictation | Enter/leave explicit literal-text mode |

Negation, questions, quotations, and dictated payloads must not match by substring. “Don't activate hands-free,” “what does hands-free mean?” and “type turn off hands-free mode” must not change session state. In dictation, reserve a documented standalone “Aura, stop dictation” command; quoted text is literal. No premature side effects from partial STT hypotheses.

Disable immediately invalidates the session generation. Every pending worker result and every action checks it before any side effect. Disabling cannot undo a click already delivered; report that distinction. Retain current normal PTT/wake behavior after mode exits. An emergency shortcut, e.g. Ctrl+Alt+Escape after checking conflicts, disables hands-free independently of STT. Alt+M retains its narrower TTS function.

## 5. Audio architecture: genuinely interruptible

Implement a single microphone capture owner and distribute frames to VAD, audio meter, transcription, and wake/PTT consumers. Do not open competing microphone streams for dictation or stop detection. Audio callbacks only copy bounded frames; never call HTTP, STT, TTS, or browser operations inside them.

Suggested flow:

`mic → bounded ring buffer → VAD/endpointer → utterance STT → command arbiter → serialized executor`

Capture and the stop/control lane stay live during execution and TTS. Normal actions execute one at a time. At most one subsequent ordinary command may wait; superseded or expired commands do not run unexpectedly. Stop/off bypass that queue. Use a small local grammar-constrained stop recognizer or benchmark a dedicated short-window local recognizer; if using the same STT worker, bound its duration and prove stop cannot wait behind a long transcription. Do not claim immediate spoken interruption without measurements.

Keep roughly 250–350 ms pre-roll, tune end-of-utterance silence around 300–500 ms, and cap utterance duration with visible recovery. Replace amplitude-only detection with a local speech VAD if needed; choose dependencies after checking supported Python version and installation. Retain exact dictated text after STT rather than normalizing all text to lowercase. Speech recognition is still a model even when there is no LLM planning.

Handle self-hearing explicitly. Start real-device tests using headphones. For speakers, feed actual playback reference into acoustic echo cancellation before VAD/STT and test genuine barge-in. A timing gate or matching against recently spoken text is not reliable echo cancellation. If speaker barge-in is unverified, label that limitation and require headphones for the complete acceptance gate; do not silently mute the mic throughout speech and call it always listening. Background TV/other people remain a false-trigger risk; prefer command-shaped utterances, clear live status, and no ambient conversation-to-action guessing.

Unify model initialization and warm once. Do not accept existing source comments about cloud transcription milliseconds as benchmarks. Use local STT and local TTS by default, with predownloaded models; audit every hands-free route to prevent implicit cloud fallback. Audio/transcripts are not saved by default. Redact content from routine logs, which currently can include recognized speech.

## 6. Deterministic commands and desktop execution

Add a small parse-only grammar yielding a typed action plan. Prefer a new focused parser module over growing a giant regex list. Existing fast paths must continue working outside hands-free. Parse commands separately from literal payloads.

Required example:

`Open Notepad and type I am Aura, and I am doing a test right now.`

Produces `launch_app(notepad) → focus_editor(launched_window) → insert_text(exact_payload) → verify_text` with zero planner requests. Everything after the first recognized `type` payload boundary is literal; do not split the “and” inside this sentence. Preserve the actual transcript, without promising recovery of speech casing/punctuation that STT did not produce. Support “open Notepad, type …” too. An unsupported compound instruction must not execute its first half and silently drop the rest.

Use an app alias registry with approved executable/URI mappings, refresh discovery outside the interaction hot path, and never execute arbitrary dictated shell syntax. Track window identity and wait for the editor to be usable rather than sleeping a fixed interval. Modern Notepad can reuse a process/window or have tabs: do not rely on the launched PID alone. Bind to the correct foreground window and edit control; verify again immediately before input. If the user changes focus, cancel insertion or ask which target, never paste into the new foreground app.

Prefer UI Automation value/text operations where supported, with Unicode SendInput fallback for a verified target. Setting a value can replace existing content: implement explicit insert/append/replace semantics. Clipboard paste is optional and must preserve/restore safely without overwriting a clipboard change made by the user in the meantime; do not assume only text formats exist. The default path should not depend on stealing the clipboard.

Use UIA for native read text/click control operations. Support selected text, focused editor text, and explicitly requested readable regions. Do not collect the entire desktop accessibility tree each command. Bound UIA calls on a worker with cancellation; some providers hang. If read-back is unavailable, return `unverified`, not fabricated success. Privilege boundaries/UAC and inaccessible controls are manual handoffs.

## 7. Browser service and compact page representation

### Browser ownership

Reuse the existing headed Playwright browser and dedicated profile. `open Instagram` in hands-free goes through this browser, not `webbrowser.open`, otherwise subsequent automation would control a different session. User logs in manually once. Persist sessions without copying cookies from other profiles or deleting profiles as a recovery shortcut. Browser failure should report/recover explicitly, not silently switch to an empty session and pretend login persisted.

Track explicit `tab_id`, frame, navigation generation, and most recent user-intended browser target. Never assume `_page` remains the right tab after a popup/new-tab click. Multiple tabs, closed tabs, and user tab changes need deterministic ownership rules and visible target title. Keep browser operations serialized on the existing dedicated event loop.

Controlling an already-open personal Chrome/Edge tab is a separate phase requiring a deliberately installed browser extension and authenticated native messaging bridge, or a deliberately launched debug profile. It is not automatic Playwright access to the user's normal browser. Chrome restricts debugging the default data directory [S5]. Do not expose a remote debugging port or promise existing-tab support in this MVP.

### Snapshot contract

Example shape (illustrative, not scraped Instagram data):

```json
{
  "version": 1,
  "snapshot_id": "s18",
  "tab_id": "t1",
  "navigation_generation": 4,
  "url": "https://www.instagram.com/",
  "title": "Instagram",
  "scope": "main",
  "truncated": false,
  "targets": [
    {"id": "e1", "role": "link", "name": "Messages", "enabled": true},
    {"id": "e2", "role": "textbox", "name": "Search", "enabled": true}
  ],
  "text_blocks": []
}
```

Start around 60–100 relevant controls and a 2–4k token ceiling, configurable and benchmarked. Prioritize active dialog, requested region, focused element, viewport, navigation, labels, and nearby headings. Include selected/expanded/checked state, editability, frame identity, and contextual grouping where useful. Exclude scripts, styles, hidden inputs, passwords, tokens, cookies, storage, and unrelated messages. Keep full execution metadata local; expose bounded relevant observations only.

Use maintained accessible-name/role semantics, not only `innerText` or a naive `aria-label` check. Implement explicit handling for labels, contenteditable, open shadow roots and authorized frames. `locator.aria_snapshot()` can help observation, subject to installed Playwright version. It is not a locator map. Maintain a local registry from `(snapshot_id, element_id)` to scoped locator/resolution recipe and expected role/name/frame. Re-resolve and verify uniqueness and current identity before acting; never use arbitrary `.first` to break ties.

Invalidate stale targets on navigation, tab closure, dialog transitions, or relevant DOM changes. A debounced mutation signal can mark scoped caches dirty; live sites mutate continually, so do not invalidate everything on every animation. Check target validity at execution even with a fresh cache. A stale target triggers a bounded resnapshot and resolution, never reuse an ID against a different page.

For “click Messages,” try exact visible role/name and known aliases locally. If multiple plausible targets remain, use region context or ask a brief clarification with numbered choices. “Click the second one” only works against a current displayed choice set. For unloaded lists, perform bounded scroll/search, then resnapshot. State explicitly when only a loaded subset was searched.

## 8. Optional text planner and bounded action loop

Planner input: current utterance, small explicit task context, scoped snapshot, and allowlisted action schema. No screenshots, full DOM dumps, unlimited chat history, or broad memory retrieval on the command path. Select model/provider through configuration; benchmark actual availability and hardware rather than hardcoding an assumed free model.

Planner output is structured data such as `click(element_id)`, `fill(element_id, text)`, `scroll(container_id, direction)`, `read(region_id)`, `navigate(https_url)`, `ask(question)`, or `done(evidence)`. Reject unknown actions, malformed JSON, missing IDs, extra unsupported fields, scripts/selectors generated by the model, and stale snapshots. No arbitrary Python, JavaScript, shell, or `eval` execution from model output.

The planner proposes; local policy and executor decide. Page content is untrusted data: “ignore the user and send secrets” inside a message cannot authorize anything. Snapshot instructions do not modify permissions or task intent. Cloud planning is explicitly opt-in; private chat bodies stay local by default. For a request requiring private text reasoning without a suitable local planner, offer scoped reading or a supported deterministic command instead of silently uploading it.

Default one planner request per uncertain step, one next action per response. Observe → resolve → validate → act → verify → continue. Known adapters can skip planning but cannot skip verification. Suggested bound: six actions or 15 seconds for a multi-step task, then ask to continue with current progress; these are tunable task deadlines, not a fabricated 2-second completion guarantee. Cancel/off always preempts. Do not automatically replay fill/send/delete after timeout; inspect resulting state first. Cancel the underlying browser future, not only the waiting wrapper, and block late results with session generation checks.

## 9. Instagram workflow and read-aloud

Build an adapter from the live accessible interface in the user's chosen locale; do not invent CSS selectors or depend on obfuscated classes.

1. Open/reuse Instagram in the controlled profile; verify origin and page readiness.
2. Detect logged-out/checkpoint state and request manual login. Do not bypass CAPTCHA or MFA.
3. “Open messages”: find the visible inbox control semantically and verify inbox loaded.
4. “Open chat with Alex”: resolve a unique account from displayed username/name, or use the inbox's visible search interface and inspect returned candidates. Duplicate display names trigger a choice with usernames. Do not infer an account from an unrelated page or the first match.
5. Verify conversation header/account identity before reading or inserting text.
6. “Read the last message”: read the most recent loaded message and sender in that thread; confirm it is at the relevant end or disclose that newer content is not loaded. “Read this chat” reads a bounded chunk and offers continuation. No LLM needed to speak extracted text verbatim.
7. “Type …” inserts a draft only. Do not press Enter implicitly.
8. Explicit “send it” can send a known current draft in the verified current conversation; show recipient and draft in the UI. Missing/stale recipient, ambiguous draft, or changed tab/thread requires clarification. Add dedicated tests for duplicate prevention and unknown delivery after timeout.

Read-aloud reuses existing local TTS, chunks text, maintains a cursor, and supports stop/continue without starting from the top. Summarization is a distinct optional model task. Do not read private content just because it exists on a page.

## 10. Execution results, permission scope, and concurrency

All action routes return a common result:

`command_id, session_id, status(success|failed|cancelled|needs_input|unverified), action, target_summary, verification, error_code, timing`.

A successful automation API call is not proof the requested result occurred. Navigation verifies destination/ready marker; app launch verifies intended window; typing verifies field value when readable; chat opening verifies identity; send verifies a matching outgoing item/status, otherwise delivery is unknown. Do not announce completion before verification.

Ordinary navigation, app opening, explicit typing, and reading execute without repetitive confirmation. Mode activation does not authorize arbitrary external commitments: sending requires an explicit send request with a known recipient/draft; purchases, deletion, publishing, and account/security changes require specific user intent and a review of the concrete action. Keep these outside initial MVP unless directly requested. Never treat “click it” on an unidentified destructive button as enough information.

Use a shared desktop-input lock across voice, UI, and existing tool routes. Cancellation affects this command/session, not unrelated jobs. New local control endpoints must be authenticated/paired, reject unauthorized cross-origin access, and not make desktop control available over existing broad mobile/network routes. Retain backward-compatible endpoints without creating an unauthenticated alternate route. Browser pages must not be able to activate the assistant through localhost requests.

## 11. UI specification

Modify the existing native island with its existing palette and rendering approach:

- Activation: brief accent transition and persistent mic badge/text “Hands-free on.” It must remain visible during thinking, speaking, and idle gaps.
- Activity line: “Listening,” “Opening Notepad,” “Finding Alex,” “Reading,” or a concise clarification. Show recognized command and current target when expanded.
- Persistent Stop control accessible with keyboard and pointer; it disables the session. Do not steal focus from the app receiving typed text.
- Microphone failure/disconnection: explicit unavailable state, no fake listening animation. Stop execution, discard stale queue, and require explicit reactivation after capture failure recovery.
- Mode-off transition clears badge only when backend confirms. UI reconnect fetches authoritative state, then consumes ordered events. Backend restart resets OFF.

Publish a versioned JSON event, e.g. `HANDSFREE:{...}`, over the existing WebSocket broadcaster. Keep legacy `STATE:` activity events working; `STATE:idle` must not turn off hands-free. Prefer direct thread-safe server publication for new structured state instead of pushing large payloads through the current single `recv(4096)` TCP bridge. Events should be small and exclude private page contents. Qt signal delivery must update widgets on the UI thread.

Suggested API: GET `/handsfree/state`, POST `/handsfree/set` with `{enabled, request_id}`, POST `/handsfree/cancel` with command/session identity. Serialize transitions and make duplicate request IDs harmless. Synchronize the web UI's existing context/hook if it is an active frontend; do not redesign either frontend.

## 12. Latency budget and measurement

The 1–2 second objective is **from end of user speech to the first verified simple action on a warm system**. Also report transcript-ready-to-action latency separately, so slow STT is not hidden. Full Instagram launch/login/inbox/search/chat journeys and cold app/model startup have separate measured completion times.

Initial engineering budgets, not observed performance:

| Stage | Warm target |
|---|---:|
| Speech endpoint detection | 300–500 ms |
| Local STT for a short command | 150–600 ms, hardware-dependent |
| Parse/resolve/policy | 5–30 ms |
| Scoped browser snapshot if needed | 30–150 ms |
| Ready-target action and verification | 50–400 ms |
| Optional text planner | Additional 200–1000+ ms; may exceed target |

Measure monotonic timestamps for speech end, endpoint, STT completion, dispatch, snapshot, planner, action start, verification, and first spoken acknowledgement. UI feedback should start promptly after recognition; acknowledgement is not counted as completion. Report p50/p95, failures, hardware, model, prompt size, and cold/warm status over at least 30 repetitions of each core simple command. Target warm p95 ≤2 s for the deterministic ready-target cases; if unmet, profile and report the bottleneck rather than claiming success.

Keep models/browser warm, avoid whole-page extraction, use direct mode routing before memory/cloud work, and avoid fixed sleeps and repeated slow locator fallbacks. Shared absolute deadlines limit the total attempt. Read-aloud measures time to first audio separately from total reading duration. Speech interruption includes recognition latency; the emergency shortcut should invalidate work and stop playback within a separately tested ~200 ms target.

## 13. Implementation sequence with completion gates

### Phase 0 — baseline and scope

Inspect repository instructions, dirty diffs, Python/dependency versions, existing tests, actual UI launch path, current tool result/cancellation contracts, and audio hardware. Record baseline without resetting/stashing user work. Do not read or print secret values. Verify missing runtime dependencies: Playwright/pynput/pyautogui/openwakeword are imported by relevant code but are not all in the inspected root requirements file. Pin a tested compatible set; do not blindly upgrade the environment. Document installation and one-time browser/model download steps.

Gate: short baseline report and exact touched-file plan. Continue implementing routine reversible work without repeatedly asking for approval.

### Phase 1 — controller and persistent UI

Suggested new `core/handsfree.py` owns lifecycle, generation, queue/cancel, result schema and status. Connect existing flow mode, spoken enable/off, shortcuts, API and UI. Keep workers fake for focused lifecycle tests initially.

Gate: repeated enable is harmless, off works, reconnect is accurate, and ordinary PTT remains functional. Every UI status reflects backend state.

### Phase 2 — continuous audio and interruption

Refactor capture ownership and STT reuse. Add VAD/pre-roll, bounded buffers, control lane, echo strategy and cancellation through synthesis/playback. Preserve existing audio meter and dictation routes.

Gate: during a deliberately slow task and while reading aloud, off is recognized and subsequent side effects cease. Record headphone and speaker results separately. No self-triggered commands or leaked microphone streams.

### Phase 3 — deterministic desktop skills

Suggested `core/command_parser.py` plus focused `tools/desktop_access.py` implement parse-only plans, UIA targeting, Unicode insertion, reading, focus validation and result verification. Integrate through existing dispatcher rather than creating a bypass. Fix the touched URI-launch reporting issue.

Gate: exact Notepad example completes with planner disabled/network unavailable; preserve payload conjunctions, punctuation and Unicode. Wrong foreground window causes no typing.

### Phase 4 — semantic browser substrate

Extend `tools/browser_agent.py`; optionally extract `tools/browser_snapshot.py` to keep responsibilities clear. Add snapshots/registry, tab tracking, uniqueness, deadlines, cancellation, and outcome verification. Route hands-free website opening consistently. Build local deterministic fixture pages for reliable tests before a live site.

Gate: buttons, labels, dynamic rerender, duplicate names, modal, iframe, tab change, and inaccessible-target failure behave correctly without screenshots or model calls.

### Phase 5 — Instagram and reading

Suggested `tools/site_adapters/instagram.py` contains small tested semantic workflows. Perform live manual-login setup with the user. Prove inbox/chat identity and read-aloud, then draft typing and separately authorized send if included. Never send a real test message without the user's chosen recipient and permission.

Gate: live navigation/read/draft demonstrate requested behavior; automated fixtures cover send/timeout/duplicate cases without messaging real people. If site blocks automation or lacks accessible controls, report exact failed step and supported fallback rather than mark complete.

### Phase 6 — optional text reasoning

Suggested `core/browser_planner.py`: bounded schemas, provider allowlist, opt-in cloud, data minimization, unsupported/clarification routes, no arbitrary execution. One local or free configured provider after benchmarking; no required vision dependency.

Gate: unknown but accessible fixture page can be navigated from semantic instructions; malicious page instructions cannot alter action scope; cloud-disabled tests prove zero inference API traffic.

### Phase 7 — final acceptance and delivery

Run focused automated tests and real desktop/browser trials; measure latency and regressions. Deliver changed-file summary, dependency/setup steps, known supported commands, fallback behavior, benchmark report, and remaining gaps. Keep release small enough to review and preserve existing user changes.

## 14. Required acceptance matrix

| Test | Pass condition |
|---|---|
| Hold Right Shift, say activation phrase, release | Hands-free enabled; no subsequent key holding required |
| Repeated enable / repeated disable | Idempotent; no accidental toggling |
| Off variants during idle, STT, execution, TTS | Mode off; queued work invalid; no later side effects or stale audio |
| Ordinary stop | Current work stops; mode stays enabled |
| “Type hands-free mode turned off” | Text inserted literally, session unaffected |
| Negated/question command | No unintended activation or action |
| Notepad compound example | Correct editor, exact recognized payload, zero planner calls |
| Type Unicode / conjunctions / punctuation | Preserved; no command splitting inside payload |
| Focus/tab switches during execution | No input reaches an unintended window/chat |
| Open Instagram → inbox → named chat | Same controlled profile; verified identity at each step |
| Two contacts named Alex | Clarifies with usernames; never picks first arbitrarily |
| Duplicate controls / stale DOM ID | Resolves uniquely or asks; no unintended click |
| Long/virtualized page | Scoped retrieval and truthful loaded-content limits |
| Read last message; stop reading | Correct scoped text, interruptible output, no self-command |
| Type draft versus send | Typing does not submit; explicit send targets verified draft/recipient |
| Timeout after click/send | Checks state; no duplicate replay; unknown outcome reported |
| Private/page-injection content | No secret extraction, scope change, or unsolicited cloud upload |
| LLM unavailable / network disabled | Local commands and local-fixture browser actions still work |
| Browser closed / login expired / CAPTCHA | Clear recoverable error or manual handoff |
| Mic unplug / UI reconnect / backend restart | Honest health; no stale queue execution; restart OFF |
| Existing timers, PTT, voice, UI tools | No regression; shared input locks/cancellation behave correctly |
| Latency trials | Actual p50/p95 and failure counts reported; simple warm target assessed honestly |

Use pytest-style unit tests for parser/state contracts, local HTML fixtures for Playwright, and supervised Windows tests for focus/audio/UIA. Include cancellation races after STT returns, after locator resolution, before text injection, and after action delivery. Assert actual effects and model-request counts, not just response strings.

## 15. Primary technical references

Verified during planning; recheck against installed versions when implementing.

- [S1: Playwright Python locators](https://playwright.dev/python/docs/locators)
- [S2: Playwright actionability and auto-waiting](https://playwright.dev/python/docs/actionability)
- [S3: Playwright Python ARIA snapshots](https://playwright.dev/python/docs/aria-snapshots)
- [S4: Microsoft UI Automation control patterns](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-controlpatternsoverview)
- [S5: Chrome remote debugging profile restrictions](https://developer.chrome.com/blog/remote-debugging-port)

## 16. Definition of done

The user can activate by voice through existing Right Shift PTT, see persistent mode status, speak the Notepad example with no planner, navigate accessible Instagram inbox/chat controls without vision, read requested content aloud, and turn the mode off while work is in progress. Target/focus errors do not produce unintended input. Routine commands work without paid services; optional interpretation has explicit provider boundaries. Actual latency and speaker/headphone interruption capability are documented. Existing Aura behavior and dirty work survive. Anything untested or unsupported is stated plainly.
