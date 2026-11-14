# Aura's fast path

Some requests are simple enough that Aura can match them to a tool directly. The fast path is designed to handle familiar, single-action commands without waiting for an AI model to choose the tool.

```text
“open YouTube”
      │
      ▼
 normalize + match a pattern
      │
      ▼
 open_website → https://www.youtube.com
```

This avoids model inference for the match; it does not guarantee a particular response time or that the requested action succeeds.

## How it works

1. The agent checks the message with [`try_fastpath`](../core/fastpath.py) before the normal model-routing flow.
2. The matcher normalizes the text, strips common conversational prefixes, and tries patterns in order. A successful match returns a tool name and arguments.
3. The [agent](../core/agent.py) attempts the corresponding action and handles its result. Timers have a dedicated handling path.
4. If there is no match, or fast-path handling raises an error, execution continues through the normal intent classification and conversation or tool flow.

The matcher rejects certain multi-action requests, such as “open Chrome and search for dogs”, so they can follow the normal route instead. Other safeguards avoid matching some searches for memory or notes as web searches. Matching depends on the actual wording and pattern order.

## Examples to explore

| Request | Intended match |
|:--|:--|
| `open youtube` | Open a known website |
| `set volume to 40%` | Set the volume |
| `pause music` | Toggle media playback |
| `set a timer for 5 minutes` | Start a timer |
| `open chrome and search for dogs` | Multi-action request; skip the fast path |

These illustrate the current patterns, not a guarantee about every phrasing or system. Desktop actions depend on the host environment and their individual implementations.

## Explore or extend it

- [`core/fastpath.py`](../core/fastpath.py) defines normalization, pattern matching, argument extraction, and checks.
- [`core/agent.py`](../core/agent.py) handles matched actions and the fallback flow.
- [`core/router.py`](../core/router.py) handles intent classification and model routing when the fast path does not handle a request.
- [`tests/test_handsfree_phase1.py`](../tests/test_handsfree_phase1.py) includes fast-path examples and multi-action checks.

To add a pattern, consider its position in `FAST_PATTERNS`, define the tool and argument extraction, validate its inputs, and add focused tests for matches and near misses. The first matching valid pattern wins, so test for overlap with existing commands.

[← Back to Aura](../README.md)
