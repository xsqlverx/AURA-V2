# SESSION_CONTEXT

<!--
CRITICAL RULE FOR OPENCODE:
- DO NOT summarize full git histories or chat logs.
- DO NOT extrapolate or guess logic that was not explicitly executed in terminal or code.
- IF A FEATURE WAS NOT TESTED, MARK IT AS "UNTESTED". DO NOT ASSUME IT WORKS.
- OVERWRITE THIS FILE COMPLETELY AT THE END OF EVERY SESSION. NEVER APPEND.
-->

## 1. Primary Objective

- **Goal:** Add a menu button (hamburger icon) to ALL 14 tab screens so users can open the drawer from any page, and lower the topbar padding for better thumb reachability.

## 2. Verified State (Anti-Hallucination Anchor)

- **Git Branch:** main (no commits)
- **TypeScript:** `npx tsc --noEmit` exits 0 — zero errors
- **Runtime:** UNTESTED (app never launched after changes)
- **Dependencies added:** `@react-navigation/native`, `@react-navigation/drawer` (via `npx expo install`)
- **Files modified:**
  - `src/components/glances/GlanceHeader.tsx` — menu button + typed navigation; paddingTop 12→24
  - `app/(tabs)/_layout.tsx` — drawer header height 64→80
  - `app/(tabs)/memory.tsx` — menu button + paddingTop 28
  - `app/(tabs)/notes.tsx` — menu button + paddingTop 28
  - `app/(tabs)/processes.tsx` — menu button + paddingTop 28
  - `app/(tabs)/actions.tsx` — menu button + paddingTop 28
  - `app/(tabs)/stats.tsx` — menu button + paddingTop 28
  - `app/(tabs)/settings.tsx` — menu button + paddingTop 28
  - `app/(tabs)/presets.tsx` — menu button + paddingTop 28
  - `app/(tabs)/desktop.tsx` — wrapped with GlanceHeader (menu + subtitle)
  - `app/(tabs)/files.tsx` — wrapped with GlanceHeader
  - `app/(tabs)/media.tsx` — wrapped with GlanceHeader
  - `app/(tabs)/activity.tsx` — wrapped with GlanceHeader
  - `app/(tabs)/health.tsx` — wrapped with GlanceHeader
  - `package.json` — added `@react-navigation/native`, `@react-navigation/drawer`

## 3. Active WIP / Blocker

- **State:** Every screen has a menu button. TS clean. Zero runtime verification.
- **Next step:** `npx expo start` → verify menu button on every screen → verify drawer opens → verify reachability.

## 4. Pinned Constants

- `useNavigation<DrawerNavigationProp<{}>>()` pattern for drawer access
- `src/theme.ts` radius = `{card, button, modal, input}` (no `sm`). Custom headers use `radius.input = 14` for menu button border radius
- GlanceHeader paddingTop=24, custom tab headers paddingTop=28, Drawer header height=80
