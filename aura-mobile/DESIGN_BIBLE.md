# AURA Design Bible — v2.0

> Product Design Specification for AURA Mobile — the thin-client neural interface for a desktop AI daemon.
>
> This document is the single source of truth for every visual, motion, and interaction decision.
> All future screens, components, and animations must conform to what is defined here.

---

## Table of Contents

1. [Product Philosophy](#1-product-philosophy)
2. [Visual Identity](#2-visual-identity)
3. [Motion Language](#3-motion-language)
4. [Orb System](#4-orb-system)
5. [Component System](#5-component-system)
6. [Screen Hierarchy](#6-screen-hierarchy)
7. [AI Interaction Philosophy](#7-ai-interaction-philosophy)
8. [UX Principles](#8-ux-principles)

---

## 1. Product Philosophy

### First Five Seconds

The user opens AURA. The screen is black. A single point of cyan light pulses at the center. The phone vibrates once — a soft, brief acknowledgment. The light expands into three concentric rings, breathing slowly.

Before the user has read a single word, they understand:
- Something is alive here
- It is waiting for me
- This is not an app

The boot sequence is not a loading screen. It is a living system introducing itself.

### Emotional Response

AURA should evoke:

- **Awe** — the feeling of operating advanced technology. Not complexity, but capability that feels ahead of its time.
- **Calm** — the interface never rushes the user. Every animation has ease. Nothing flashes or demands attention without reason.
- **Trust** — the system communicates its state continuously. The user is never left wondering if something is broken or working.
- **Presence** — the desktop daemon feels near, even though it lives on a remote machine. The interface bridges physical distance.

### How AURA Is Different

Every major AI assistant (ChatGPT, Claude, Gemini) is designed as a **web product** — a chat window in a browser tab, surrounded by chrome, competing with notifications, toolbars, and bookmarks.

AURA is not a website.

AURA is an **operating environment** for human-AI collaboration. The phone is a window into a distributed intelligence. The intelligence does not live in the app — it lives on the desktop, always running, always aware. The mobile interface is how you reach it when you are away.

This distinction changes everything:
- There is no "login" — you connect to your daemon
- There is no "new chat" — the daemon has continuous context
- There is no "loading" — the daemon is always running, the phone is just catching up
- There is no "settings page" that controls the app — settings control the daemon

### Communicating Remote Intelligence

The UI must constantly remind the user that the intelligence is elsewhere:
- Connection status is not a footnote — it is a primary signal
- Latency hints (subtle breathing while waiting) communicate network distance
- The desktop (its stats, its processes, its media) is always surfaced, never buried
- Actions feel like remote commands, not local operations

---

## 2. Visual Identity

### Color Palette

#### Core Backgrounds

| Token | Hex | Purpose |
|-------|-----|---------|
| `bgDeep` | `#050505` | Root background, screen background |
| `bgPrimary` | `#0A0A0A` | Secondary surfaces, scroll undershoot |
| `bgSurface` | `#0F0F0F` | Card-adjacent surfaces |
| `bgCard` | `#141414` | Deprecated — replaced by glass system |

These are not grays. They are **near-black with a barely perceptible cool shift** — achieved by a `0.5%` cyan tint in the black.

#### Glass System

| Token | Value | Purpose |
|-------|-------|---------|
| `glassBg` | `rgba(255,255,255,0.04)` | Default glass fill |
| `glassBgHover` | `rgba(255,255,255,0.07)` | Glass hover state |
| `glassBgActive` | `rgba(255,255,255,0.10)` | Glass press/active state |
| `glassBorder` | `rgba(255,255,255,0.08)` | Default glass border |
| `glassBorderStrong` | `rgba(255,255,255,0.14)` | Elevated glass border |

#### Accent System

AURA uses exactly **two** accent colors, each with a specific semantic role. No third accent. No gradients between them unless specified.

| Token | Hex | Role |
|-------|-----|------|
| `cyan` | `#00F2FF` | **The Primary Voice** — active state, AI speaking, connection, action, focus |
| `purple` | `#BC8CFF` | **The Memory Tone** — data, knowledge, recollection, stored context |

#### Semantic Colors

| Token | Hex | Role |
|-------|-----|------|
| `green` | `#3FB950` | System stable, connected, success, online |
| `amber` | `#FF9F0A` | Thinking, processing, indeterminate state |
| `red` | `#FF453A` | Error, disconnected, critical, destructive action |
| `white` | `rgba(255,255,255,0.85)` | Primary text |
| `whiteMuted` | `rgba(255,255,255,0.55)` | Secondary text |
| `whiteDim` | `rgba(255,255,255,0.30)` | Tertiary text, placeholder |
| `whiteFaint` | `rgba(255,255,255,0.12)` | Dividers, disabled |

### Accent Usage Rules

#### When to use cyan
- The Orb when active
- Primary action buttons
- Focus rings and selection indicators
- Active navigation state
- AI speaking indicator
- Streaming text cursor
- Success confirmation borders
- Toggle "on" state

#### When to use purple
- Memory-related UI (cards, icons, headers)
- Stored data visualization
- Knowledge retrieval indicators
- Past conversation references
- "Recall" actions
- Note vault accents

#### When to use NEITHER cyan nor purple
- Loading states (use amber)
- Error states (use red)
- Connection status (use green/red)
- System metrics (use white with semantic coloring)
- Ambient information (use white hierarchy)
- Pure text content (use white hierarchy)

**Never use cyan and purple simultaneously in the same card or row.** UI elements should signal one intent at a time.

### Glow Rules

Glow is not decoration. Glow communicates **active presence**.

| Intensity | Usage | Implementation |
|-----------|-------|----------------|
| `glowSubtle` | Card hover, idle state | `rgba(0,242,255,0.06)` spread 30px |
| `glowActive` | Focused input, active button | `rgba(0,242,255,0.15)` spread 50px |
| `glowSpeaking` | Orb speaking state | `rgba(0,242,255,0.30)` animated pulse |
| `glowMemory` | Memory card, recall action | `rgba(188,140,255,0.12)` spread 40px |

Glow must never clip against UI edges. Always offset inward or outward with padding.

### Blur Hierarchy

| Level | Intensity | Use |
|-------|-----------|-----|
| `blurSubtle` | 20px | Card backgrounds in list context |
| `blurStandard` | 40px | Modal backgrounds, active cards |
| `blurHeavy` | 60px | Bottom sheets, overlays, lock screen |

Background blur should use `tint="dark"` exclusively. Never use `tint="light"` or `tint="default"`.

### Elevation System

AURA uses **layered glass** instead of drop shadows. Elevation is communicated through:

1. **Border brightness** — higher elevation = brighter border (`glassBorder` → `glassBorderStrong`)
2. **Blur intensity** — higher elevation = heavier blur
3. **Glow presence** — highest elevation elements may emit glow

No drop shadows. Shadows imply objects floating in space. Glass implies depth through material.

| Level | Name | Border | Blur | Glow |
|-------|------|--------|------|------|
| 0 | Background | None | None | None |
| 1 | Surface card | `glassBorder` | `blurSubtle` | None |
| 2 | Active card | `glassBorderStrong` | `blurStandard` | Optional `glowSubtle` |
| 3 | Modal | `glassBorderStrong` | `blurStandard` | `glowActive` |
| 4 | Bottom sheet | `glassBorderStrong` | `blurHeavy` | `glowActive` |
| 5 | Lock screen / boot | No border | `blurHeavy` | Full glow |

### Border Rules

- All borders use `rgba` white values — never colored borders except for semantic indicators
- Semantic borders (error, success, warning) appear only on cards that warrant attention
- Active/focused borders use `cyan` at `rgba(0,242,255,0.4)`
- Borders are always `1px` — never thicker

### Transparency Rules

- Glass fills use `rgba(255,255,255,0.04)` — barely perceptible
- Never use 100% transparent elements (they disappear against the deep background)
- Never use opacity below `0.04` — it becomes invisible
- Text opacity hierarchy: `0.85` (primary), `0.55` (secondary), `0.30` (tertiary), `0.12` (disabled)

### Corner Radius System

| Token | Value | Usage |
|-------|-------|-------|
| `radiusSm` | 8 | Small elements: badges, dots, small icons |
| `radiusMd` | 14 | Buttons, list items, inline inputs |
| `radiusLg` | 20 | Cards, modals, bottom sheets |
| `radiusXl` | 28 | Large sheets, full-screen overlays |
| `radiusFull` | 9999 | Pill buttons, avatars, status dots |

The system trends toward larger radii. Sharp corners (`0`) are only used for full-screen elements.

### Spacing Scale

The spacing scale is based on 4px increments with deliberate gaps filled.

| Token | Value | Usage |
|-------|-------|-------|
| `space2` | 2 | Between icon and text in inline labels |
| `space4` | 4 | Stacked element gap, badge padding |
| `space8` | 8 | Related element gap, nested padding |
| `space12` | 12 | Standard element gap, card inner padding |
| `space16` | 16 | Section gap, card-to-card spacing |
| `space20` | 20 | Content padding from screen edges |
| `space24` | 24 | Section-to-section spacing |
| `space32` | 32 | Group separation |
| `space40` | 40 | Large section break |
| `space48` | 48 | Screen top padding, hero spacing |
| `space64` | 64 | Feature separation |
| `space80` | 80 | Full-screen element padding |

### Grid System

AURA uses a **flexible 4-column grid** on phone screens:

- Columns are not fixed widths — they proportionally divide available space
- 1-column: full-width elements (cards, inputs)
- 2-column: split layout (stats, paired actions)
- 3-column: dense grid (quick actions, small cards)
- 4-column: reserved for data-dense contexts only

Gap between grid items: `space12` horizontal, `space12` vertical within group, `space24` between groups.

### Typography Hierarchy

| Token | Weight | Size | Line H | Tracking | Usage |
|-------|--------|------|--------|----------|-------|
| `display` | 700 | 48px | 52px | -2% | Screen hero, large numeric stats |
| `heading1` | 600 | 28px | 34px | -1% | Screen titles, primary headings |
| `heading2` | 600 | 20px | 26px | 0% | Card titles, section headers |
| `heading3` | 600 | 16px | 22px | 0% | Sub-cards, grouped headers |
| `body` | 400 | 15px | 22px | 0% | Body text, chat messages, descriptions |
| `bodySmall` | 400 | 13px | 18px | 0% | Secondary text, metadata |
| `caption` | 500 | 11px | 14px | +2% | Labels, timestamps, badges |
| `mono` | 400 | 12px | 16px | 0% | Code, paths, PIDs, terminal output |
| `label` | 600 | 10px | 12px | +8% | Section labels, uppercase headers |

Font family: **Plus Jakarta Sans** for all text. Monospace uses platform mono (Menlo on iOS, system monospace on Android).

### Iconography Rules

- **One icon library.** Lucide icons exclusively. No MaterialIcons, no SF Symbols, no custom SVGs unless a Lucide equivalent does not exist.
- Stroke width: Lucide default (`1.5px` or `2px` depending on icon)
- Icon size hierarchy: `14px` (inline), `18px` (list items), `22px` (action buttons), `28px` (hero indicators), `36px` (empty states)
- Icons are always the same color as adjacent text unless they are the primary signal (e.g., a glowing cyan action icon)
- Never tint icons with semantic colors unless the icon itself conveys meaning (e.g., a red trash icon for delete)

### Illustration Style

AURA does not use illustrations.

No characters, no mascots, no abstract art, no gradients-as-art. The only visual element that is not strict UI is the **Orb**. Everything else communicates through typography, glass, and glow.

This restraint is intentional: adding illustrations would make AURA feel like a consumer app. AURA is a tool. Its beauty comes from precision, not decoration.

### Lighting Philosophy

Light in AURA comes from **within the interface**, not from above.

- Glow radiates outward from active elements
- Cards do not cast shadows — they emit a faint aura
- The Orb is the primary light source
- Backgrounds absorb light (near-black) so that glow is visible

This creates the illusion that the interface is generating its own illumination — reinforcing the "alive" metaphor.

### Particle Effects

Particles are used in exactly one place: the **Orb** during speaking state. Small luminous dots orbit the core at varying radii, appearing and fading as they travel.

Particles are never used:
- In idle state (the Orb should appear still, not noisy)
- As background decoration
- As loading indicators
- Anywhere outside the Orb component

### Background Treatment

The screen background is `#050505` — not a gradient, not a pattern, not an image.

Subtle **ambient glow** may appear behind active content: a faint cyan wash behind the chat area during conversation, or a faint purple wash behind the memory list. This wash is achieved through a full-screen `LinearGradient` at `opacity 0.03` positioned behind content cards.

---

## 3. Motion Language

### Principles

1. **Every animation communicates state.** If an animation does not tell the user something about the system, remove it.
2. **Duration communicates priority.** Fast (150ms) for micro-interactions. Medium (300ms) for state changes. Slow (500ms-800ms) for emphasis.
3. **Easing communicates material.** Use `Easing.inOut(Easing.ease)` for organic motion. Never use linear easing.
4. **Stagger communicates hierarchy.** Items that appear together should enter in sequence, not simultaneously.
5. **Motion is not optional.** Static state changes are never acceptable. Every transition must be animated.

### Core Easing Curve

```
cubic-bezier(0.16, 1, 0.3, 1)
```

This is a custom overshoot-free spring-like curve. It feels fast, natural, and never bouncy unless specifically desired.

For spring animations:
- `damping: 15`
- `stiffness: 150`
- `mass: 1`

### State Animations

#### Idle State
- Duration: 2500ms loop
- Easing: `inOut(ease)`
- Behavior: Slow, deep breath. The Orb expands 5% over 1250ms, contracts 5% over 1250ms.
- Purpose: Communicate that the system is alive but waiting.

#### Listening State
- Duration: 1000ms loop
- Easing: `inOut(ease)`
- Behavior: Medium pulse, 15% expansion. Outer rings become more visible.
- Purpose: Show that AURA is receiving input.

#### Thinking State
- Duration: 600ms loop
- Easing: `inOut(ease)`
- Behavior: Faster pulse, 20% expansion. Color shifts toward amber/purple.
- Purpose: Communicate processing. The user should anticipate a response.

#### Speaking State
- Duration: 400ms loop
- Easing: `inOut(ease)`
- Behavior: Rapid, full pulse (30% expansion). Bright cyan glow. Particle emission active.
- Purpose: Communicate active output. The most energetic state.

#### Executing State
- Duration: 800ms
- Easing: `inOut(ease)`
- Behavior: Single sharp pulse followed by sustained glow. Not a loop — executes once and settles.
- Purpose: Communicate that a command has been received and is being performed.

#### Searching State
- Duration: 1200ms loop
- Easing: `inOut(ease)`
- Behavior: Gentle scanning motion — a beam of light rotates around the Orb periphery.
- Purpose: Communicate that AURA is looking for information.

#### Memory Retrieval State
- Duration: 900ms
- Easing: `inOut(ease)`
- Behavior: Brief purple flash, then the Orb dims slightly as if consulting internal records. Text fades in with purple glow behind it.
- Purpose: Communicate that the response is informed by stored knowledge.

#### Connection Loss
- Duration: 400ms
- Easing: `inOut(ease)`
- Behavior: Orb fades to dim red over 300ms. Rings dissolve outward. Haptic: one short pulse.
- Purpose: Immediately communicate that the link is broken.

#### Reconnect
- Duration: 600ms
- Easing: `inOut(ease)`
- Behavior: Orb pulses from dim red → amber → green over three expanding pulses.
- Purpose: Communicate recovery. Optimistic, not jarring.

#### Error
- Duration: 300ms
- Easing: `inOut(ease)`
- Behavior: Brief shake (translateX: 0 → -6 → 6 → -4 → 4 → 0 at 40ms intervals). Red border flash.
- Haptic: two short pulses.
- Purpose: Communicate failure without panic. The interface absorbs the error gracefully.

#### Success
- Duration: 400ms
- Easing: `inOut(ease)`
- Behavior: Element scales to 1.05 over 200ms, then settles to 1.0 over 200ms. Brief green glow.
- Haptic: one short pulse.
- Purpose: Confirm completion without visual noise.

### Interaction Animations

#### Button Press
- Trigger: `onPressIn`
- Duration: 100ms
- Behavior: Scale to 0.94. Opacity to 0.85.
- Release: Spring back to 1.0 over 200ms.
- Haptic: light impact on press, none on release.

#### Card Press
- Duration: 100ms
- Behavior: Scale to 0.98. Border brightens.
- Release: Spring back to 1.0 over 200ms.

#### Long Press
- Duration: 300ms hold threshold
- Behavior: After 200ms of hold, element pulses subtly (scale 1.0 → 1.02) to confirm long press is recognized.
- Haptic: medium impact on threshold.

#### Page Transition
- Duration: 350ms
- Easing: `inOut(ease)`
- Behavior: New page fades in (opacity 0 → 1) while old page fades out. Content scales from 0.97 → 1.00.
- Direction: Push from right for forward navigation. Push from left for back.

#### Modal Presentation
- Duration: 400ms
- Easing: `inOut(ease)`
- Behavior: Background overlay fades to `rgba(0,0,0,0.7)` over 200ms. Modal slides up from bottom edge, stopping with 40px bottom margin. Modal scales from 0.95 → 1.00 during slide.

#### Bottom Sheet
- Duration: 450ms
- Easing: `inOut(ease)` with spring snap at end
- Behavior: Drag handle visible at top. Sheet tracks finger position during drag. Releases with velocity-based snap (open or close). Backdrop fades proportionally to sheet position.

#### Drawer Interaction
- Duration: 300ms
- Easing: `inOut(ease)`
- Behavior: Content slides right, revealing drawer beneath. Drawer content fades in with stagger (each item: 50ms delay). Backdrop overlay fades to `rgba(0,0,0,0.5)`.

#### Pull to Refresh
- Duration: 200ms threshold
- Behavior: Pull distance maps to rotation of a circular indicator. At threshold, indicator snaps to full rotation and begins looping. On release, content refreshes and indicator fades out over 200ms.

#### Toggle Switch
- Duration: 250ms
- Easing: spring (damping: 12, stiffness: 100)
- Behavior: Thumb slides from left to right. Background color transitions from `glassBg` to `cyan` with 50ms delay after thumb starts moving.

### Content Animations

#### List Item Appear
- Duration: 300ms per item, staggered 40ms
- Easing: `inOut(ease)`
- Behavior: Fade in + translateY (20px → 0).

#### Card Expansion
- Duration: 350ms
- Easing: `inOut(ease)`
- Behavior: Card height animates from collapsed to expanded. Content inside fades in after expansion begins, not before.

#### Streaming Text
- Duration: per-character (15-30ms)
- Behavior: Characters appear left to right with a subtle cyan glow on the most recent word. The glow fades after 500ms.
- Cancel: When streaming stops, the glow on the last word fades out over 300ms.

#### Voice Recording
- Duration: 1000ms loop
- Behavior: Mic icon pulses (opacity and scale) in rhythm with audio input level. When silent, pulse reduces to idle breathing.

#### Notification
- Duration: 400ms in, 3000ms hold, 300ms out
- Behavior: Slides down from top edge with spring bounce. Progress bar at bottom counts down auto-dismiss. User can swipe up to dismiss early.

### Animation Timing Reference

| Action | Duration | Delay | Stagger |
|--------|----------|-------|---------|
| Button press | 100ms | 0 | — |
| Page transition | 350ms | 0 | — |
| Modal slide-up | 400ms | 0 | — |
| Bottom sheet | 450ms | 0 | — |
| List item entry | 300ms | 40ms | ✓ |
| Streaming char | 20ms | 0 | ✓ |
| Orb idle breath | 2500ms | 0 | — |
| Orb thinking | 600ms | 0 | — |
| Orb speaking | 400ms | 0 | — |
| Error shake | 300ms | 0 | — |
| Success confirm | 400ms | 0 | — |
| Connection loss | 400ms | 0 | — |
| Reconnect | 600ms | 0 | — |

---

## 4. Orb System

### The Orb Is AURA's Face

The Orb is the single most important visual element in the product. It is not an icon, not a logo, not a decoration. It is the daemon's presence made visible.

### Visual Architecture

The Orb consists of four layers:

```
Layer 4: Particles (speaking only)     — emitted from core, fade outward
Layer 3: Outer ring (r3)               — 2.2x core diameter, most transparent
Layer 2: Middle ring (r2)              — 1.7x core diameter
Layer 1: Inner ring (r1)               — 1.3x core diameter
Layer 0: Core                          — the visible "body"
```

**Core:**
- Shape: perfect circle
- Size: varies by context (80px default, 120px on home hero, 60px in chat)
- Fill: interpolates between two colors based on state
- Shadow: cyan glow at 0.4 opacity, 12px radius
- Surface: appears self-illuminating

**Rings:**
- 1px border, white at varying opacity (`rgba(0,242,255, 0.06–0.20)`)
- Scale animates with pulse value
- Never fill — always outline
- Inner ring fastest, outer ring slowest

**Particles (speaking only):**
- 4-6 small dots (3px diameter)
- Orbit the core at 1.5x diameter
- Varying speeds (3-5s per orbit)
- Fade in/out as they travel
- Color: `cyan` at `0.3–0.6` opacity

### State Definitions

| State | Core Color 1 | Core Color 2 | Pulse Spread | Speed | Rings Visible | Particles |
|-------|-------------|-------------|--------------|-------|---------------|-----------|
| `disconnected` | `#3A1A1A` | `#6B1F1F` | 0.3x | 2500ms | Dim, faint | No |
| `idle` | `#0A1A2A` | `#0F2A4A` | 0.4x | 1500ms | Subtle | No |
| `listening` | `#0A2A3A` | `#005F7F` | 0.6x | 1000ms | Visible | No |
| `thinking` | `#1A0A3A` | `#5A3FBF` | 0.8x | 600ms | Bright | No |
| `speaking` | `#005F7F` | `#00F2FF` | 1.0x | 400ms | Full glow | Yes |
| `searching` | `#0A2A2A` | `#007F6F` | 0.5x | 1200ms | Visible, rotating highlight | No |
| `executing` | `#0A2A3A` | `#00F2FF` | 0.8x then settle | 800ms (one-shot) | Bright flash then settle | No |

### Idle Movement

In idle state, the Orb should exhibit **micro-movement** — a barely perceptible slow drift:
- translateY: sin wave, ±3px over 4s
- translateX: sin wave (offset phase), ±2px over 5s
- This simulates a living thing that breathes and sways, not a static icon

### Transition Timing Between States

| From | To | Duration | Notes |
|------|----|----------|-------|
| Any | `idle` | 300ms | Always smooth settle |
| `idle` | `listening` | 200ms | Fast — user spoke |
| `listening` | `thinking` | 150ms | Immediate — input received |
| `thinking` | `speaking` | 200ms | Slight anticipation before speech |
| `thinking` | `idle` | 300ms | System decided not to speak |
| `speaking` | `idle` | 400ms | Gradual power-down |
| `speaking` | `listening` | 200ms | Interruption — quick rebound |
| Any | `disconnected` | 400ms | Always includes haptic |
| `disconnected` | `idle` | 600ms | Recovery sequence |

### Size Tokens

| Context | Diameter | Rings |
|---------|----------|-------|
| Lock screen hero | 120px | 3 rings, max spread |
| Home hero card | 100px | 3 rings, medium |
| Chat empty state | 80px | 3 rings, standard |
| Chat inline (thinking) | 48px | 2 rings, compact |
| Settings / status badge | 32px | 1 ring, minimal |

### Accessibility

- The Orb must never strobe or flash at frequencies above 3Hz
- Speaking state max frequency: 2.5Hz (400ms cycle)
- All state changes must be accompanied by a text label for screen readers
- Reduced motion setting: disable all Orb animation, show static colored circle instead

---

## 5. Component System

### Component Hierarchy

```
ScreenShell
├── ScreenHeader
├── Content Area
│   ├── SectionHeader
│   ├── GlassCard (variants)
│   │   ├── InfoCard
│   │   ├── MetricCard
│   │   ├── PromptCard
│   │   ├── CommandCard
│   │   ├── MemoryCard
│   │   ├── NoteCard
│   │   ├── NewsCard
│   │   └── WeatherCard
│   ├── QuickAction (grid item)
│   ├── StatusChip
│   ├── DesktopStatusCard
│   └── ConnectionCard
├── VoiceBar
├── StreamingIndicator
├── SearchBar
├── FloatingAction
├── Bottom Sheet
├── Context Menu
├── Toast / Dialog / ConfirmationSheet
├── SkeletonLoader
├── EmptyState
├── ErrorState
└── LoadingState
```

### GlassCard

**Purpose:** Fundamental container for all content. The atomic unit of AURA's visual identity.

**Hierarchy:** Wraps all content blocks. May contain any other component.

**Spacing:**
- Inner padding: `space16`
- Outer margin: `0 0 space12` (bottom margin for list context)
- Children gap: `space12`

**Variants:**

| Variant | Border | Blur | Glow | Use |
|---------|--------|------|------|-----|
| `default` | `glassBorder` | `blurSubtle` | None | Standard content |
| `elevated` | `glassBorderStrong` | `blurStandard` | `glowSubtle` | Featured content |
| `active` | `cyan 0.4` | `blurStandard` | `glowActive` | Currently selected/focused |
| `memory` | `purple 0.3` | `blurStandard` | `glowMemory` | Memory-related content |
| `error` | `red 0.3` | `blurStandard` | None | Error state display |
| `glowCyan` | `glassBorder` | `blurStandard` | `glowActive` | Hero content (home) |

**Interaction:**
- Press: scale 0.98, border brightens
- Long press: haptic medium, context menu (if applicable)

**Animation:** FadeInDown + scale on mount. No animation on unmount.

**Accessibility:** Card is a single accessibility element. Role: button if pressable, group if static.

### GlassButton

**Purpose:** Primary call-to-action element.

**Hierarchy:** Placed within cards, at bottom of sections, or inline.

**Spacing:** Horizontal padding `space20`, vertical padding `space14`. Minimum width `120px`.

**Variants:**

| Variant | Background | Text | Border | Use |
|---------|-----------|------|--------|-----|
| `primary` | `cyan` | `#050505` | None | Main action |
| `secondary` | `glassBg` | `white` | `glassBorder` | Alternative action |
| `ghost` | `transparent` | `whiteMuted` | None | Tertiary action |
| `danger` | `red 0.15` | `red` | `red 0.3` | Destructive action |

**Interaction:**
- Press: scale 0.94, opacity 0.85. Haptic: light impact.
- Release: spring back to 1.0.
- Disabled: opacity 0.4. No interaction.

**Animation:** Spring scale on press/release. Loading state: text fades out, spinner fades in.

**Accessibility:** Minimum touch target 44x44pt. Label describes action.

### GlassInput

**Purpose:** Text entry for all contexts.

**Hierarchy:** Placed inline within cards, in forms, or in the chat bar.

**Spacing:** Inner padding `space12` horizontal, `space12` vertical. Outer margin varies by context.

**States:**
- Default: `glassBg` background, `glassBorder` border
- Focused: `glassBg` background, `cyan` border at `0.4`, `glowActive`
- Filled: same as focused, subtle check icon on right (optional)
- Error: `red` border at `0.4`, error message below
- Disabled: opacity 0.4

**Interaction:**
- Focus: border color transitions over 200ms. Cursor appears.
- Blur: border color transitions back over 200ms.
- Clear button (if text present, if single-line): appears on right with 100ms fade.

**Accessibility:** Label must be provided via `aria-label` or visible label above.

### StatusChip

**Purpose:** Compact status indicator. Shows connection state, system state, or badge count.

**Hierarchy:** Appears in headers, cards, and inline.

**Spacing:** Horizontal padding `space8`, vertical padding `space4`. Gap between dot and text: `space4`.

**Variants:**

| Variant | Dot Color | Background | Text | Use |
|---------|-----------|------------|------|-----|
| `online` | `green` | `green 0.08` | `green` | Connected |
| `offline` | `red` | `red 0.08` | `red` | Disconnected |
| `thinking` | `amber` | `amber 0.08` | `amber` | Processing |
| `speaking` | `cyan` | `cyan 0.08` | `cyan` | AI output |
| `count` | none | `glassBg` | `white` | Numeric badge |

**Animation:** Dot pulses subtly when state is active (online, thinking, speaking). Transitions between states take 200ms.

### SectionHeader

**Purpose:** Label grouped content sections within a screen.

**Hierarchy:** Placed above a group of cards or grid items.

**Spacing:** Margin bottom `space12`. Icon + text gap: `space6`.

**Content:** Small icon (14px) + uppercase label text.

**Typography:** `label` token. Color: `whiteMuted` by default, `cyan` for primary sections.

**Animation:** Fades in on mount with 100ms delay.

### ScreenHeader

**Purpose:** Top navigation bar for every screen. Single unified component — no per-screen header definitions.

**Variants:**

| Variant | Contents |
|---------|----------|
| `default` | Back button (if sub-screen) + title + optional action |
| `home` | Drawer menu + logo + title/subtitle + StatusChip |
| `modal` | Title + close button only |

**Spacing:** Height `56px`. Horizontal padding `space16`. Title uses `heading2`.

**Animation:** Title fades in on screen mount. Back button appears with slide-from-left if navigated to.

### InfoCard

**Purpose:** Display a single piece of information with a label and value.

**Layout:**
```
┌─────────────────────┐
│ 🔹 Label            │
│ Value               │
│ ▓▓▓▓▓░░░░░ 60%     │ (optional progress)
└─────────────────────┘
```

**Spacing:** Inner `space16`. Label-to-value gap: `space4`. Use: system stats, health metrics.

### MetricCard

**Purpose:** Display a prominent numeric value with context.

**Layout:**
```
┌─────────────────────┐
│       86%           │  <- display (count)
│   CPU Usage         │  <- heading3
│   ▓▓▓▓░░░░          │  <- mini progress bar
└─────────────────────┘
```

**Spacing:** Centered layout. Value uses `display` typography. Progress bar: 3px height, cyan gradient fill.

### PromptCard

**Purpose:** Suggestion chip shown in chat empty state or as quick reply.

**Layout:** Horizontal pill with text. No icon.

**Spacing:** `space12` horizontal, `space8` vertical. Border: `glassBorder`.

**Interaction:** Tap to send as message. Scale animation on press.

### CommandCard

**Purpose:** Display a remote command (launch app, system control, clipboard action).

**Layout:**
```
┌─────────────────────────┐
│ 🔹 App Name        >   │
│ Launch on desktop       │
└─────────────────────────┘
```

**Interaction:** Tap to execute. Success state: brief green flash. Error state: red border flash.

### ConnectionCard

**Purpose:** Display backend connection status and details.

**Layout:**
```
┌─────────────────────────┐
│ ● ONLINE                │
│ 100.x.x.x:8000          │
│ Latency: 12ms           │
└─────────────────────────┘
```

**Animation:** Latency value updates with smooth number transition (not instant snap).

### VoiceBar

**Purpose:** Persistent voice input control, typically at bottom of chat.

**Layout:**
```
┌─────────────────────────────────┐
│  Type a message...         🎤  │
└─────────────────────────────────┘
```

The bar combines text input and voice button. The voice button is always visible. When recording, input area shows waveform visualization instead of text field.

**Accessibility:** Voice button announces "Hold to speak" / "Release to send".

### StreamingIndicator

**Purpose:** Show that AI response is in progress.

**Layout:** Three dots with staggered pulsing opacity. Cyan color.

**Animation:** Dot 1: 0ms delay. Dot 2: 200ms delay. Dot 3: 400ms delay. Each dot pulses on a 1200ms loop.

### SkeletonLoader

**Purpose:** Placeholder while content loads.

**Layout:** Mimics the shape of the content being loaded (card outlines, text lines).

**Animation:** Subtle shimmer sweep: a gradient highlight moves across the skeleton from left to right over 1500ms. Loop. Opacity: 0.1 base, 0.2 highlight.

**Usage:** Every screen must show skeleton loaders matching their final layout. No `ActivityIndicator` fallbacks.

### EmptyState

**Purpose:** Show when a list or screen has no data.

**Layout:** Centered icon (36px) + heading3 + bodySmall text. Optional action button.

**Animation:** Icon fades in, text fades in 100ms later.

**Content:** Must be contextual, not generic. Examples:
- "No memories yet" → "Tap + to save your first memory"
- "No notes yet" → "AURA can help you organize your thoughts"
- "No processes" → "All quiet on the desktop"

### ErrorState

**Purpose:** Show when content fails to load.

**Layout:** Centered red icon (36px) + error message + "Retry" button.

**Animation:** Icon shakes briefly on appear.

### Toast

**Purpose:** Transient feedback for completed actions.

**Layout:** Small glass card at top of screen. Icon + message. Auto-dismiss after 3000ms. Manual swipe-to-dismiss.

**Animation:** Slides down from top with spring. Progress bar (bottom edge) counts down auto-dismiss.

**Types:**
- `success`: green accent
- `error`: red accent
- `info`: cyan accent
- `warning`: amber accent

### BottomSheet

**Purpose:** Modal selection or detail view. Preferred over center modals for mobile.

**Layout:** Rounded top corners (`radiusXl`). Drag handle (8px wide, 3px tall, centered). Content scrolls vertically.

**Animation:** Slides up on open, tracks finger on drag, velocity-based snap on release.

### Dialog (Alert)

**Purpose:** Critical confirmation or information requiring acknowledgment.

**Layout:** GlassCard centered on dark overlay. Title + message + 1-2 buttons.

**Animation:** Overlay fades in. Card scales from 0.92 → 1.00 with spring.

### ContextMenu

**Purpose:** Action list triggered by long press.

**Layout:** Floating glass card positioned near press point. Vertical list of actions. Each action: icon + label.

**Animation:** Scales from 0.90 → 1.00, items stagger in.

---

## 6. Screen Hierarchy

### Home

**Primary focus:** Orb state + connection status. The user should immediately know if AURA is connected and what it is doing.

**Secondary information:** System health (CPU, RAM, battery) — glanceable metrics.

**Ambient information:** Weather, time since last interaction, recent memory count.

**Layout priority:**
1. Orb (visual presence + connection state)
2. Status card (online/offline + backend info)
3. Quick actions grid (link to other sections)
4. System metrics row (collapsible)
5. Weather (ambient, bottom)

**What to remove:** Nav tiles that duplicate the drawer. The drawer exists for navigation; home should focus on presence, not menus.

### Chat

**Primary focus:** The conversation. Messages must be the center of attention, surrounded by appropriate negative space.

**Secondary:** Suggestions/prompts when chat is empty.

**Ambient:** Connection status, typing indicator.

**Layout priority:**
1. Message list (fills most of screen)
2. Voice/input bar (fixed at bottom)
3. Empty state (Orb + suggestions, shown when no messages)

**Streaming:** Each new word from AURA should feel like it is being written in real time. The streaming cursor (cyan underline) follows the last word.

### Memory

**Primary focus:** Semantic memory entries — the vector store content.

**Secondary:** Search bar, count.

**Layout priority:**
1. Search bar (top, always visible)
2. Memory list with staggered entry animation
3. Floating "+" action (bottom right)

**Detail view:** Tapping a memory card expands it inline (not navigating to a new screen). Long press offers edit/delete in a context menu.

### Notes

**Primary focus:** Vault note titles as a list.

**Secondary:** Create button, search.

**Detail view:** Full-screen note reader with swipe-to-go-back. Editing happens inline in the detail view (tap to edit).

**Layout:**
1. Search bar
2. Note list (card per note, shows title + first line preview)
3. FAB for new note

### Actions (Desktop Control)

**Primary focus:** Remote system controls.

**Secondary:** Audio controls, clipboard, app launcher.

**Layout priority:**
1. Power controls (lock, sleep, restart, shutdown — collapsed by default with expansion)
2. Now Playing + Volume (grouped as "Media")
3. Quick Launch (app grid)
4. Clipboard
5. News (optional, bottom)

### Processes

**Primary focus:** Process list with search.

**Secondary:** Kill action.

**Layout:**
1. Search bar with system toggle
2. Process list (name, PID, kill button)
3. Count footer

### Files

**Primary focus:** Directory browsing.

**Secondary:** Navigation breadcrumbs, search.

**Layout:**
1. Breadcrumb path (interactive — tap any segment to jump)
2. Search bar (optional)
3. File/folder list with folder-first sorting
4. Context menu on long press (open, copy path, delete)

### Stats

**Primary focus:** System health metrics.

**Secondary:** Uptime, power status.

**Ambient:** Live indicator.

**Layout:**
1. CPU / RAM / Disk / Battery cards (animated progress bars)
2. Uptime card
3. Live auto-refresh indicator

### Settings

**Primary focus:** Connection configuration.

**Secondary:** Security, about.

**Layout:**
1. Connection card (URL + key + test integrated in one flow)
2. Security link
3. About section (version, build)

---

## 7. AI Interaction Philosophy

### How AURA Speaks Visually

AURA does not just display text. Every response is accompanied by visual state:

- **While thinking:** The Orb pulses amber/purple. A "..." appears in the chat area, but not as text — as a streaming indicator (three dots).
- **While speaking:** The Orb glows bright cyan. Text streams in character-by-character. Each sentence ends with a brief pause before the next.
- **After speaking:** The Orb returns to idle breathing. The last word's glow fades over 500ms.

### How AURA Suggests Actions

AURA surfaces suggestions in three ways:

1. **Prompt cards** in the chat empty state — "Ask me about your desktop", "Check your system health", "What's new today?"
2. **Contextual quick actions** — when the user types "open", AURA suggests app names. When the user asks about memory, AURA suggests memory-related commands.
3. **Proactive recommendations** — when the daemon detects something noteworthy (high CPU, new message, completed task), it surfaces a subtle notification rather than waiting to be asked.

### How AURA Exposes Context

AURA should make the user aware of what it knows:

- **Memory references** in responses: when AURA uses a memory, the relevant text appears with a subtle purple left-border and a small "Memory" label. The user can tap it to see the full memory entry.
- **Desktop awareness:** When AURA references the desktop state ("your system is at 86% CPU"), the metric appears as a small inline card rather than plain text.
- **Source transparency:** If AURA searched the web, show a small "Web" label. If it used tools, show a "Tool used" indicator.

### How AURA Handles Waiting

During long-running tasks:

- The Orb enters the `executing` state
- A progress message appears: "Running diagnostics..." or "Searching through 1,240 memories..."
- If the task exceeds 5 seconds, AURA sends an intermediate update: "Still working on this — found 3 relevant items so far"
- The user can interrupt with "Stop" or a new message

### How AURA Communicates Progress

Progress is shown through:
- The Orb's state (faster pulse = more intensive work)
- Subtle text updates ("Processing...", "Almost done...")
- No progress bars unless the backend provides them (file operations, system commands)

### How AURA Surfaces Recommendations

AURA should occasionally be proactive, but never intrusive:

- **First open of the day:** Briefing notification. "Good morning. 3 new memories since yesterday. CPU stable at 32%."
- **Detected patterns:** If the user always checks stats after opening, AURA shows stats by default.
- **System events:** If CPU spikes above 90%, AURA suggests investigating. Not as a popup — as a subtle card in the home screen.

### Proactivity Rules

| Situation | AURA Action |
|-----------|-------------|
| First open of day | Briefing notification |
| System anomaly | Subtle card on home screen |
| User idle > 30s | No action — do not disturb |
| Memory count threshold | Subtle suggestion: "You have 50 memories — want to review?" |
| Backend reconnects after downtime | Brief summary of missed events |
| User repeatedly accesses same screen | Surface that screen's content proactively on home |

### When AURA Remains Silent

- During user typing (never interrupt)
- During user scrolling (never animate or change state)
- When the user is reading a long response (wait for next input)
- When the connection is lost (show disconnected state, do not attempt to speak)

---

## 8. UX Principles

### 1. One primary action per screen.
Every screen has exactly one thing the user should do. All other elements support that action. If a screen has two equally important actions, split it into two screens.

### 2. State is always visible.
The user should never wonder "is it working?" Every system state has a visual representation. Loading, success, error, idle — all have distinct, obvious appearances.

### 3. Every animation has purpose.
No decorative motion. If an animation does not communicate state, hierarchy, or feedback, remove it. Motion is signal, not decoration.

### 4. The desktop is always present.
The remote daemon is the entire point of the app. Connection status, system health, and remote capabilities must never be more than one tap away.

### 5. Reduce navigation.
If a user needs more than two taps to reach something, consider restructuring. The drawer provides full access in one gesture. Screens should be broad (show information), not deep (require drilling).

### 6. Consistency over novelty.
AURA has a defined component system. Every card, button, and input must use the system components. Novel interactions require design review and must be added to this document.

### 7. Trust is visual.
AURA communicates its state honestly. If the connection drops, AURA shows red immediately — not a 5-second timeout. If a command fails, AURA shows error clearly — not a silent failure.

### 8. Negative space is a feature.
White space (black space) is not wasted. It communicates that AURA is uncluttered, intentional, and premium. Resist the urge to fill empty areas with decoration.

### 9. Typography is the primary UI.
Most of what AURA communicates is through text. Typography hierarchy (size, weight, color, spacing) is the primary tool for visual hierarchy. Master it before adding any visual elements.

### 10. Never use a loading spinner.
`ActivityIndicator` is banned. Use skeleton loaders for initial content, streaming indicators for AI responses, and the Orb for system state. Spinners communicate "I don't know how long this will take." AURA always knows.

### 11. Proactivity has a dimmer switch.
AURA can be proactive, but the dimmer goes from 0 (fully passive) to 10 (constantly suggesting). Default is 3. Surface the dimmer in settings.

### 12. Glass is not a trend.
Glassmorphism is not a visual style AURA adopts because it is popular. Glass communicates depth, layering, and the "window into another machine" metaphor. Every glass surface must earn its place.

### 13. The user is always in control.
AURA can suggest, recommend, and offer. It never acts without confirmation for destructive operations (shutdown, restart, delete). Non-destructive operations (launch app, open file) execute immediately.

### 14. Gestures are discoverable.
Swiping, long pressing, and other gestures must have visual hints. A drag handle on bottom sheets. A subtle "pull to refresh" instruction on first visit. A long-press hint on cards that support it.

### 15. Error messages are human.
Never show raw error codes or stack traces. Every error message explains:
- What happened (in plain language)
- Why it might have happened
- What the user can do about it

### 16. Connection is a first-class concern.
AURA is useless without its backend. Connection status is not a setting — it is a primary UI element. The user should see connection state instantly upon opening the app.

### 17. The boot sequence is onboarding.
The boot sequence is not a splash screen. It is the user's first interaction with the daemon. The status lines ("Neural Link: ESTABLISHED") set expectations about what AURA is and does.

### 18. Nothing blinks.
Blinking (full on/off oscillation) is never used. Pulse (smooth opacity transition) is used instead. Blinking suggests an error or an unskippable notification. AURA does not do either.

### 19. Reduce settings.
Every setting is a decision the user should not have to make. Prefer sensible defaults over configuration options. If a setting exists, it must have a clear, demonstrable effect on behavior.

### 20. The Orb is sacred.
The Orb is the daemon's face. It must never be used as a generic loading indicator. It must never be animated outside of its defined states. It must never be repositioned for layout convenience.

### 21. Immediacy over completeness.
Show partial data immediately rather than complete data after a delay. Stat cards show cached values while refreshing. Memory list shows local cache while fetching. Chat shows "..." while streaming begins.

### 22. Every interaction has a micro-haptic.
Button press: light impact. Toggle: light tap. Error: two short taps. Success: one short tap. Long press threshold: medium impact. Haptics are not optional — they are part of the interaction contract.

### 23. The interface fades into the background.
When the user is reading a long AI response, headers fade slightly, navigation becomes less prominent, and the content takes center stage. After 3 seconds of inactivity, chrome dims.

### 24. AURA speaks first.
On first launch after boot, AURA should greet the user conversationally — not with a blank chat screen. A short message in the chat: "Back online. Your system looks healthy." Or "Welcome back. You have 3 unread notifications."

### 25. No feature is isolated.
Every feature relates back to the daemon. Files are the desktop's files. Processes are the desktop's processes. Memory is the daemon's memory. The UI must constantly reinforce that the phone is a window.

---

*This document is a living specification. All future components, screens, and interactions must conform to what is defined here. Any deviation requires an update to this document before implementation begins.*
