# Fast-Path vs LLM Path — Visual Quick Reference

## 🚀 FAST-PATH (Instant, ~50-100ms)

```
User: "Can you open youtube"
  ↓
[AGENT] Checking fast-path for: "can you open youtube"
[FASTPATH] Stripped casual prefix: "can you open youtube" → "open youtube"
[FASTPATH] ✓ MATCH → tool=open_website
[AGENT] ✓ FASTPATH MATCHED! Executing instantly
[AGENT] ✓ Fastpath execution SUCCESS

Aura: ✓ Opening website
```

✅ **When You See This:**

- `[FASTPATH] ✓ MATCH`
- `[AGENT] ✓ FASTPATH MATCHED!`
- `[AGENT] ✓ Fastpath execution SUCCESS`

**Time:** ~50-100ms

---

## 🐌 LLM PATH (Slower, 2-3 seconds)

```
User: "What's the best browser"
  ↓
[AGENT] Checking fast-path for: "what's the best browser"
[FASTPATH] NO MATCH
[AGENT] ✗ No fastpath match → routing to LLM
[LLM] stage=classify model=keyword → TRUE
[LLM] stage=tools model=openai/gpt-oss-120b (waiting...)
[LLM] (waiting...)
[AGENT] Entering TOOL PATH (LLM will make tool calls)

Aura: Chrome is great because...
```

❌ **When You See This:**

- `[FASTPATH] NO MATCH`
- `[AGENT] ✗ No fastpath match → routing to LLM`
- `[LLM] stage=tools` (actual API calls happening)

**Time:** 2-3 seconds

---

## 📊 Comparison Table

| Aspect        | Fast-Path                    | LLM Path                      |
| ------------- | ---------------------------- | ----------------------------- |
| **Message**   | "open youtube"               | "what's best?"                |
| **Speed**     | ~50ms ⚡                     | 2-3s 🐌                       |
| **LLM Used?** | ❌ No                        | ✅ Yes                        |
| **Logs**      | `[FASTPATH] ✓ MATCH`         | `[FASTPATH] NO MATCH`         |
| **Examples**  | Simple, unambiguous commands | Questions, reasoning, complex |

---

## 🎯 Commands That Use Fast-Path (Instant)

```
open youtube          → [FASTPATH] ✓ MATCH
can you open chrome   → [FASTPATH] ✓ MATCH
please set volume 50  → [FASTPATH] ✓ MATCH
play despacito        → [FASTPATH] ✓ MATCH
lock                  → [FASTPATH] ✓ MATCH
mute                  → [FASTPATH] ✓ MATCH
```

---

## ❌ Commands That DON'T Use Fast-Path (LLM)

```
what's best app?           → [FASTPATH] NO MATCH (reasoning needed)
help me organize files     → [FASTPATH] NO MATCH (complex task)
can you help?              → [FASTPATH] NO MATCH (vague request)
open chrome and search     → [FASTPATH] SKIP (multi-action)
what should I listen to?   → [FASTPATH] NO MATCH (preference)
```

---

## 📡 Signal Flow Diagram

### Fast-Path Flow (Instant)

```
Command → Classify Intent → Fast-Path Check → MATCH ✓ → Execute Tool → Done
                                                         (~50ms)
```

### LLM Flow (Slower)

```
Command → Classify Intent → Fast-Path Check → NO MATCH ✗ → Send to LLM
                                              (2-3s)
                                                    ↓
                                            LLM Makes Tool Call
                                                    ↓
                                            Execute Tool
                                                    ↓
                                            Done (2-3s total)
```

---

## 🔍 How to Check Which Path Your Command Takes

### Watch the Logs

```bash
# Quick way - just check these patterns:
"[FASTPATH] ✓ MATCH"           → FAST-PATH (instant)
"[FASTPATH] NO MATCH"          → LLM PATH (2-3s)
"[AGENT] ✓ FASTPATH MATCHED!"  → Confirmed FAST-PATH
"[AGENT] → routing to LLM"     → Confirmed LLM PATH
```

### Real Example Output

**FAST-PATH (Good!)**

```
[AGENT] Checking fast-path for: "orang can you open youtube"
[FASTPATH] Stripped casual prefix: "orang can you open youtube" → "open youtube"
[FASTPATH] ✓ MATCH → tool=open_website
[AGENT] ✓ FASTPATH MATCHED!
Response Time: 50ms ⚡
```

**LLM PATH (Expected for complex)**

```
[AGENT] Checking fast-path for: "what's the best browser"
[FASTPATH] NO MATCH: "what's the best browser"
[AGENT] ✗ No fastpath match → routing to LLM
[LLM] stage=classify...
[LLM] stage=tools...
Response Time: 2-3 seconds 🐌
```

---

## ⚙️ What Changed in Your System

### Your Exact Case

**Before:**

```
You: "Orang can you open youtube"
→ Pattern didn't match (starts with "Orang", not "open")
→ Sent to LLM
→ Waited 2-3 seconds ❌
```

**After:**

```
You: "Orang can you open youtube"
→ Casual prefix "Orang can you" stripped
→ Pattern now matches "open youtube"
→ Executed instantly ✅
→ Response in ~50ms
```

### Key Improvement: Casual Prefix Stripping

**Old Pattern:** `^open youtube` (must start with "open")  
**New Pattern:** Strips `can you`, `orang`, `please`, `hey`, etc. first

```
Input:                          Stripped To:
"orang can you open youtube"  → "open youtube"        ✓ MATCHES
"can you open youtube"        → "open youtube"        ✓ MATCHES
"please open youtube"         → "open youtube"        ✓ MATCHES
"hey can you open youtube"    → "open youtube"        ✓ MATCHES
```

---

## 🎓 Remember

| Icon                     | Meaning                                    |
| ------------------------ | ------------------------------------------ |
| ✅ `[FASTPATH] ✓ MATCH`  | Your command matched, executing instantly! |
| ❌ `[FASTPATH] NO MATCH` | Complex request, using LLM for reasoning   |
| ⚡ ~50ms                 | Fast-path speed                            |
| 🐌 2-3s                  | LLM speed                                  |

**Goal:** As many commands as possible should show `✓ MATCH` for instant execution!

---

## Troubleshooting

**Q: Why didn't my command use fast-path?**

A: Check for these disqualifiers:

- Contains "and", "or", "then" (multi-action)
- Starts with unusual words (will be stripped)
- Is a question or requires reasoning (intentionally LLM)

**Q: My command should match but doesn't?**

A: Add it to the test suite to verify:

```bash
cd c:\AURA_V2
python scripts\test_fastpath.py
```

Then file an issue with the command!
