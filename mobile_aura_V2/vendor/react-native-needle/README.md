# react-native-needle

On-device structured extraction and tool calling for React Native, powered by
[Cactus Compute's **Needle 2**](https://huggingface.co/Cactus-Compute/needle2) —
a 45M-parameter model that runs entirely on the phone. No server, no API key, no
network after install.

Needle is not a chatbot. Given a tool schema it emits a schema-conforming call
or declines, which makes it a good fit for pulling structured fields out of
messy text and for letting a small model drive app actions.

> **Status: 0.1.1, Android/arm64 only.** The binding is complete and exercises
> every function Needle exposes. Read [Known limits](#known-limits) before you
> build a feature on it — the stock model handles clean single-intent commands
> well, and has specific, reproducible failure modes beyond that.

## Install

```bash
npm install react-native-needle
npx react-native-needle fetch-model
```

The **engine** (a 20 MB static archive) is downloaded on install and pinned by
SHA-256. The **weights** (14 MB) are a separate, explicit step — plenty of
callers will want to ship [their own model](#using-your-own-model) instead.

This is a native module, so it needs a development build. It will not run in
Expo Go.

```bash
npx expo prebuild
npx expo run:android
```

If your installer skipped lifecycle scripts (`--ignore-scripts`, pnpm's
default, an offline CI box), the Android build stops with the fix rather than a
link error. Run `npx react-native-needle fetch` and rebuild. `npx
react-native-needle doctor` reports what is present.

## Usage

```ts
import {
  needleSupported,
  loadBundledModel,
  configure,
  extract,
} from 'react-native-needle';

if (needleSupported) {
  await loadBundledModel();

  await configure(
    'You control smart home devices. Call a tool for the user request.',
    [
      {
        name: 'set_brightness',
        description: 'Set the brightness of the lights in a room',
        parameters: {
          type: 'object',
          properties: {
            room: { type: 'string', description: 'Which room' },
            level: { type: 'number', description: 'Brightness percentage, 0-100' },
          },
          required: ['room', 'level'],
        },
      },
    ]
  );

  const args = await extract<{ room: string; level: number }>(
    'Turn the kitchen lights down to 30 percent'
  );
  // → { room: 'kitchen', level: 30 }
}
```

That call is measured at ~230 ms on an arm64 emulator, at confidence 1.0.

`extract()` returns `null` rather than throwing when the model declines or emits
something unparseable: a caller pre-filling a form wants "no answer", not an
exception. Declining is normal and deliberate — asked something outside its
tools, Needle answers with an empty call list and a reason:

```json
{ "function_calls": [], "reasoning": "No tool available for geography queries." }
```

### Validate before you trust

Needle reports which fields it could not ground in the input:

```ts
import { complete, ungroundedFields, parseEnvelope } from 'react-native-needle';

const raw = await complete(userText);
if (ungroundedFields(raw).length) {
  // The model is telling you it made these up. Discard them.
}
const { confidence, reasoning } = parseEnvelope(raw) ?? {};
```

In our testing it correctly flagged a numeric field it had fabricated — while
reporting confidence 1.0 for the call as a whole. **Treat
`validation.ungrounded` as a hard gate, and do not lean on `confidence`:** it
read 1.0 on the one answer that was wrong.

## API

| | |
| --- | --- |
| `needleSupported: boolean` | False on iOS and on any device without arm64. Check this first. |
| `loadBundledModel(assetName?)` | Load the `.cact` from app assets. Reads straight into memory — no copy to disk, no storage permission. |
| `loadModel(path)` | Load from a file path (a downloaded or user-selected model). |
| `isModelLoaded()` | Whether a model is resident. |
| `configure(systemPrompt, tools)` | Set the system prompt and tool schema. The schema is what makes output conform. |
| `complete(input, maxNewTokens?)` | Raw completion — the JSON tool call as emitted. |
| `extract<T>(input, maxNewTokens?)` | The first tool call's arguments, or `null` if it declined or the output was unparseable. |
| `parseEnvelope(raw)` | The full response object — `confidence`, `reasoning`, `validation`. |
| `ungroundedFields(raw)` | Field paths the model admits it invented. |
| `reset()` | Clear conversation state. |

Inference is single-session and stateful in the native library — there is one
global context behind Needle's C API — so calls are serialised on a lock and run
off the UI thread.

## Using your own model

The stock model is a general tool-caller. For a narrow domain, a fine-tune on
your own data will beat it comfortably, and Cactus's `cactus-needle` Python
package supports LoRA fine-tuning.

Install the result with the same CLI:

```bash
npx react-native-needle fetch-model ./my-finetune.cact
```

Then rebuild. `loadBundledModel()` picks it up with no code change.

## Known limits

Measured on an arm64 Android emulator against Needle 2's stock weights. Your
mileage on a real phone will differ — emulator numbers are indicative, not a
benchmark.

**What it does well.** Clean, single-intent commands are handled correctly and
fast: `Turn the kitchen lights down to 30 percent` → `{room: "kitchen", level: 30}`
in ~230 ms; `Set a timer for 12 minutes` → `{minutes: 12}` in ~140 ms. It also
extracts from prose — `Your parcel weighing 2.4 kg has left the depot, tracking
AB4471.` → `{weight_kg: 2.4, tracking: "AB4471"}` — and correctly refuses
requests its tools do not cover.

**A leading unrelated clause makes it abandon the whole request.** Given:

> `Preheat to 200 C and bake 25 minutes, serves 4. Add 250 grams of flour to the list.`

with an `add_item` tool available, it declined outright:

```json
{ "function_calls": [], "reasoning": "No tool available for preheating or baking." }
```

The same sentence on its own works fine. It latches onto the first instruction
it sees and gives up rather than scanning for the part it *can* serve, so
segment multi-intent input yourself before handing it over.

**String fields over-capture when neighbouring text looks related.** In a
denser message, `tracking` came back as `"AB4471, ref 522119876543"` — the
tracking code plus the next field glued on. The number in the same message was
extracted correctly.

**Numbers in crowded strings can be fabricated.** We have one reproducible case
where a message containing several numbers yielded a value that appears nowhere
in the input, returned at confidence 1.0 with an invented rationale. The model
flagged it itself:

```json
"validation": { "ungrounded": ["record_item.amount"] }
```

That flag is the only reliable signal here — `confidence` was 1.0 on exactly
the answer that was wrong. If a wrong number is expensive in your app, gate on
`ungroundedFields()` or use a deterministic parser.

**Other limits:**

- **arm64-v8a only.** Cactus's `armeabi-v7a` archive is built against a newer
  libc++ than NDK 27 ships and fails to link with an undefined
  `std::__ndk1::__hash_memory`. `needleSupported` is false on 32-bit devices.
- **iOS is not wired up yet.** Cactus publishes `ios-arm64` archives, so this is
  a podspec away, not new logic.
- **Memory.** Peak RSS measured at **500–530 MB**, against a documented ~28 MB
  per session. This is the real constraint — budget for it on low-RAM devices.
- **Latency.** 1.5–5 s to load the model, then 140 ms – 1.6 s per completion
  (130–185 tok/s decode), rising with input length.
- **APK size.** About **28 MB** added: 14.5 MB for `libneedlejni.so` plus
  13.7 MB of weights — not the 14 MB the model size suggests.

## Requirements

- Expo SDK 51+ (built and tested on SDK 54 / React Native 0.81)
- Android `minSdk` 24, arm64 device or emulator
- Node 18+ for the CLI

## License

MIT for this binding — see [LICENSE](LICENSE).

Needle 2's engine and weights are © Cactus Compute, licensed under Apache-2.0
and downloaded from Hugging Face at install time. See [NEEDLE_LICENSE](NEEDLE_LICENSE).
This project is not affiliated with or endorsed by Cactus Compute.
