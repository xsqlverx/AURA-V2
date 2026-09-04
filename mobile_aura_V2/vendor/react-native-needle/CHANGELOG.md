# Changelog

## 0.1.1

- **Fix `extract()` returning the response envelope instead of the fields.**
  Needle nests arguments under `function_calls[0]`; 0.1.0 read `arguments` from
  the top level, which this envelope never has. A decline also came back as a
  truthy object instead of `null`, so callers could not tell "here are your
  fields" from "I refused". Parsing is now a pure module covered by tests built
  from real captured device output.
- Add `parseEnvelope()` and `ungroundedFields()` so callers can reach
  `confidence`, `reasoning`, and the fields the model admits it invented.
- Rewrite the README around tool calling and device control, with re-measured
  numbers. The previous latency figures were badly pessimistic (completions are
  140 ms – 1.6 s, not 9–15 s) and the memory figure was too optimistic (peak RSS
  is 500–530 MB, not ~280 MB).
- Publish from CI via npm trusted publishing (OIDC), so releases need no token
  and no 2FA prompt.
- Pin the compiled-against type surface (`expo-modules-core`, `react-native`) in
  devDependencies and commit a lockfile. Previously the build only worked
  because npm auto-installed the peer range, which in a clean checkout resolved
  two Expo SDKs ahead of what the package was measured on.

## 0.1.0

First release. Android/arm64 only.

- Expo module wrapping Needle 2's complete C API (`load`, `init`, `complete`,
  `reset`) with real on-device inference.
- `extract<T>()` helper that returns the tool call's arguments, or `null` when
  the model declines — no exceptions on the "no answer" path.
- Engine fetched on install and checksum-pinned; weights fetched on request via
  `npx react-native-needle fetch-model`, which also installs a local `.cact` so
  a fine-tune can be dropped in.
- Build fails with an actionable message when the engine is absent, rather than
  an undefined-symbol wall.
