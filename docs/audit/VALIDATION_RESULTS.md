# Audit validation results

12 September 2026. These are diagnostic observations of the existing implementation, not passing acceptance results for repaired code.

## Existing checks

- Python: `venv\Scripts\python.exe -B -m unittest discover -s tests -v` passed one test, `test_lock_screen_alias_dispatches_to_lock_pc`. The lock handler was mocked.
- Mobile: `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed in the current mobile project.

## Tool reliability probe

The audit ran `tool_reliability_probe.py` using AST-extracted source definitions and substituted handlers. No application startup, real device action, network model request or message send occurred.

Observed values:

```text
Malformed set_volume JSON:
  parsed arguments = {}
  mocked set_volume level = 50

Advertised browser_control:
  result = {"error":"Unhandled tool: browser_control"}
  job marked successful = true

Audio handler returning an error:
  result = {"error":"simulated unavailable audio endpoint"}
  job marked successful = true

web_search(query="example", mode="compare", items=["A","B"], aspect="cost"):
  forwarded positional arguments = ["example"]
  forwarded keyword arguments = {}

Streaming chunks:
  ["<function=", "mute_audio {\"muted\":true}", "<function=mute_audio>"]
Visible output:
  mute_audio {"muted":true}

launch_app("settings"):
  mocked launch = ms-settings:
  result = error referencing unassigned variable resolved

Desktop keyword routing:
  "turn it down" -> no tools
  "skip this song" -> no tools

Desktop forced YouTube guard:
  "Do not play anything on YouTube" -> true
  "How can I display anything in Python?" -> true
  "Can you explain this YouTube video?" -> true
```

## Current mobile keyword router

The actual TypeScript router was executed in isolation, without models or device executors:

```text
"Do not call 5551234567" -> MOBILE make_call, high confidence
"Explain this text" -> MOBILE send_sms, high confidence
"Open Chrome on my PC" -> MOBILE open_app, high confidence
"Turn the phone volume up" -> MOBILE make_call, high confidence
"Tell me about smartphone batteries" -> MOBILE make_call, high confidence
```

## Desktop TTS lifecycle

The actual BaseTTSEngine methods were extracted without importing the app. A fake synthesizer was paused using an event and a fake audio stream was supplied.

```text
wait_return_seconds: 0.0
synthesis_still_in_flight: true
audio_queued_after_stop: 1
```

The result demonstrates premature completion and stale synthesis enqueue after stop. It does not measure real synthesis or playback speed. The TTS and mobile reproductions were run in isolation during the audit; only the tool reliability probe is saved as a standalone script here.

## Limits

No real command latency benchmark was run. The restricted hardware query was denied, so local-model sizing is undecided. Existing sparse logs did not show the suspected cross-event-loop transport error. Tests with actual microphones, phones, browser sessions and controlled action targets remain part of the implementation plan.
