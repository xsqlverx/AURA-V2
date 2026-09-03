# AURA Mobile V2 — UI Revamp Plan

## The Vision

A standalone Jarvis-style AI agent that lives on your phone. Dark, futuristic, holographic. The orb isn't just decorative — it's the brain. Two modes: **Phone** (on-device tools) and **PC** (remote desktop control via backend). The UI should feel like you're holding Stark's phone.

---

## Reference Apps & What to Steal

### 1. JARVIS AI Voice Assistant (Google Play)
- **4 switchable interfaces**: Classic (card dashboard), Aegis HUD (animated HUD + 3D hero), Nova Orb (5 energy spheres you swipe between), Zeron Visor (first-person cockpit with instrument panels)
- **Takeaway**: Let users pick their visual mode. Ship with 2-3 themes.

### 2. Jarvis OS (GitHub — Expo + Next.js)
- **Architecture**: Expo mobile app → Express backend → Next.js dashboard
- **Screens**: Chat, Mission Control (overview), Goals, Inbox, Memory Review, Job Status, Deliverables, Connector Setup
- **Takeaway**: The "PC tab" concept — a Mission Control screen showing PC status, running tasks, system metrics

### 3. Event Horizon UI (GitHub — Expo/React Native Web)
- **Design language**: Monochrome + one accent blue (`#60a8ff`), 45° corner cuts on bubbles (not rounded), four-point stars, CRT scanlines, noise overlay, black-hole funnel background
- **Components**: Starfield background, DM corner-cut message bubbles, HUD header with waveforms/readings/status lights, welcome screen with boot sequence
- **Takeaway**: The corner-cut bubble aesthetic is独特 and clean. The boot sequence is chef's kiss.

### 4. ΩS Phone 2080 (React + Three.js)
- **Design**: Holographic everything, Three.js particle field with neural connection mesh, glassmorphism cards, "Quantum Aurora" palette (Neon Cyan + Holographic Purple + Neural Pink)
- **Features**: Dynamic Island with AI status, DNA auth lock screen, holographic widgets
- **Takeaway**: The Dynamic Island pattern for AURA status. The Three.js particle background.

### 5. Jarvis_Ironman (Next.js + Three.js)
- **Orb**: Layered wireframe shells, particles, post-processing bloom
- **Hand tracking**: MediaPipe for gesture control
- **Takeaway**: The orb as a 3D holographic object, not just a 2D animation

### 6. project-jarvis (Vanilla JS + Node.js)
- **HUD**: Arc Reactor animation, corner brackets, grid lines, scanlines, breathing pulse
- **Boot sequence**: Cinematic startup — reactor ignition → system checks → personalized greeting
- **Takeaway**: The boot sequence. Make first launch feel like powering on JARVIS.

### 7. V-Launcher (Jetpack Compose)
- **Neural Hub** (minus-one screen): Holographic CPU/RAM/storage visualizers, dynamic battery monitor
- **Dynamic Island overlay**: Floating terminal that snaps to edges, idle fading, cyberpunk terminal UI
- **Takeaway**: The floating terminal overlay pattern. System vitals as holographic displays.

---

## Design System

### Color Palette
```
Primary:        #00f0ff (Cyan — AURA's signature)
Secondary:      #8b5cf6 (Purple — user/actions)
Accent:         #10b981 (Green — success/online)
Warning:        #f59e0b (Amber — thinking/processing)
Error:          #ef4444 (Red — errors/offline)
Background:     #0a0a0f (Near-black)
Surface:        #111118 (Dark card)
Surface-2:      #1a1a24 (Elevated surface)
Text:           #e2e8f0 (Light gray)
Text-dim:       #64748b (Muted)
Glow:           rgba(0, 240, 255, 0.15) (Cyan glow)
```

### Typography
- **Headers**: JetBrains Mono (monospace, techy feel)
- **Body**: Inter or SF Pro (clean, readable)
- **Code/Status**: JetBrains Mono

### Visual Elements
- **45° corner cuts** on message bubbles and cards (not rounded corners)
- **Glow effects** on active elements (box-shadow with cyan)
- **Glassmorphism** on overlays (backdrop-blur + semi-transparent bg)
- **CRT scanlines** overlay (subtle, toggleable)
- **Noise texture** overlay (film grain feel)
- **Four-point stars** in backgrounds (not circles)
- **Grid lines** as subtle background pattern

---

## Screen Architecture

### Tab Navigation (Bottom)
```
┌─────────────────────────────────────────┐
│                                         │
│           [Active Screen]               │
│                                         │
├─────────────────────────────────────────┤
│  💬 Chat   │  🖥️ PC   │  ⚡ Tools  │  ⚙️ Settings  │
└─────────────────────────────────────────┘
```

### Screen 1: Chat (Main)
The default screen. Where you talk to AURA.

```
┌─────────────────────────────────────────┐
│ ◁ AURA          ● PC Connected    ⚙    │  ← HUD Header
├─────────────────────────────────────────┤
│                                         │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │     ◉ AURA ORB (3D/Holographic) │   │  ← Orb: breathing, state-colored
│  │        idle · listening ·        │   │     Idle=cyan, Listening=green,
│  │        thinking · speaking       │   │     Thinking=amber, Speaking=purple
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                         │
│  ┌─ Corner-cut bubble ─────────────┐   │
│  │ Where's my coffee?        14:32 │   │  ← User message (purple, right-aligned)
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─ Corner-cut bubble ─────────────┐   │
│  │ I don't know where your coffee  │   │  ← AURA response (cyan-tinted, left)
│  │ is, but I can call the cafe.    │   │
│  │ [Call Cafe] [Search Nearby]     │   │  ← Action cards (if tool matched)
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Ask AURA anything...      [▶]  │   │  ← Input bar (glowing border)
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key elements:**
- **HUD Header**: Thin bar with AURA wordmark, PC connection status dot (green/grey, tappable), settings gear
- **Orb**: Centered, 3D holographic, breathes with state. Tapping it triggers voice input.
- **Messages**: 45° corner-cut bubbles. User = purple, AURA = dark with cyan border. Action cards嵌入在AURA responses中.
- **Input**: Glowing border that pulses cyan when idle, green when listening. Send button becomes a waveform animation when AURA is speaking.

### Screen 2: PC Command Center
The "PC tab" — see and control your PC remotely.

```
┌─────────────────────────────────────────┐
│ ◁ AURA          ● PC Connected    ⚙    │
├─────────────────────────────────────────┤
│  PC STATUS                               │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 Online · Windows 11          │   │  ← Connection status
│  │ CPU: ████████░░ 78%  [3.2 GHz] │   │  ← Holographic bars
│  │ RAM: ██████░░░░ 62%  [10/16GB] │   │
│  │ GPU: ████░░░░░░ 41%  [RTX 4070]│   │
│  │ NET: ↑ 2.3 MB/s  ↓ 12.1 MB/s  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  QUICK ACTIONS                          │
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ 🔍     │ │ 📋     │ │ 🎵     │     │  ← Action tiles
│  │ Search │ │ Clipbrd│ │ Media  │     │     Tap to execute
│  └────────┘ └────────┘ └────────┘     │
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ 📝     │ │ 🌤️     │ │ 📂     │     │
│  │ Notes  │ │ Weather│ │ Files  │     │
│  └────────┘ └────────┘ └────────┘     │
│                                         │
│  RECENT PC ACTIVITY                     │
│  ┌─────────────────────────────────┐   │
│  │ ✓ Web search: "react native"    │   │  ← Activity feed
│  │ ✓ Opened VS Code                │   │     Timestamped
│  │ ⏳ Downloading: model.gguf      │   │     Status indicators
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key elements:**
- **System Vitals**: Holographic bars with glow effects, real-time updates via WebSocket
- **Quick Actions**: 6-tap grid for common PC tools. Each tile has an icon + label, glowing border on press.
- **Activity Feed**: Scrollable list of recent PC actions with timestamps and status (✓/⏳/❌)

### Screen 3: Tools
On-device mobile tools management.

```
┌─────────────────────────────────────────┐
│ ◁ AURA          ● PC Connected    ⚙    │
├─────────────────────────────────────────┤
│  MOBILE TOOLS                           │
│  ┌─────────────────────────────────┐   │
│  │ 📞 Make Call          [Active]  │   │
│  │ 💬 Send SMS           [Active]  │   │
│  │ 📱 Open App           [Active]  │   │
│  │ 🔗 Open URL           [Active]  │   │
│  │ ⚙️  Settings           [Active]  │   │
│  │ 🔊 Volume             [Stub]    │   │  ← Toggle switches
│  │ 🔋 Battery            [Stub]    │   │     Active = green glow
│  │ 📶 WiFi               [Stub]    │   │     Stub = dimmed
│  └─────────────────────────────────┘   │
│                                         │
│  PC TOOLS (via backend)                 │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Web Search        [Active]  │   │
│  │ 📋 Clipboard         [Active]  │   │
│  │ 🎵 Media Control     [Active]  │   │
│  │ 📝 Notes             [Active]  │   │
│  │ 🌤️ Weather           [Active]  │   │
│  │ 📂 Obsidian          [Active]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Last synced: 2 min ago                 │
└─────────────────────────────────────────┘
```

### Screen 4: Settings
Same as current but with better visual treatment.

---

## Key UI Components to Build

### 1. Orb (Enhanced)
- Replace 2D gradient circle with **Three.js holographic orb**
- Wireframe shells that rotate
- Particle effects around it
- Color shifts by state (cyan idle, green listening, amber thinking, purple speaking)
- Breathing animation with glow pulse
- Tap → voice input, long press → settings

### 2. Boot Sequence (New)
First launch animation:
```
1. Black screen → Arc Reactor ignition (cyan glow expands)
2. "AURA SYSTEMS" text fades in with glitch effect
3. System checks cascade: [✓ Neural Link] [✓ Tool Engine] [✓ Memory Core]
4. "Good evening, Kenaz." personalized greeting
5. Fade into main chat screen
```

### 3. Message Bubbles
- **45° corner cuts** instead of rounded corners
- User messages: purple background, right-aligned
- AURA messages: dark bg with cyan left border, left-aligned
- **Action cards** embedded in AURA responses (tool call results as mini-tiles)
- **Task timeline** for multi-step operations (Step 1 ✓, Step 2 ⏳, Step 3 ⊘)

### 4. HUD Header
- Thin bar at top
- Left: AURA wordmark (monospace, glowing)
- Center: PC status dot (green = connected, grey = offline, red = error)
- Right: Settings gear
- Background: semi-transparent with backdrop-blur

### 5. Input Bar
- Pill-shaped with glowing animated border
- Border color matches AURA state (cyan idle, green listening)
- Send button → waveform animation when AURA is speaking
- Mic button for voice input

### 6. Action Cards
-嵌入在消息中的可交互tiles
- Corner-cut cards with icon + label + status
- Tap to execute, long press for options
- Glow effect on press

### 7. System Vitals (PC Screen)
- Holographic progress bars with glow
- CPU/RAM/GPU/NET with real-time updates
- Color-coded: green < 60%, amber 60-80%, red > 80%

### 8. Particle Background
- Subtle floating particles (cyan/purple)
- React to device tilt (gyroscope)
- Four-point stars, not circles
- Density adjusts by screen (more on chat, less on settings)

---

## Animation Specs

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Orb breathing | Scale 0.95↔1.05 + glow pulse | 1800ms idle, 600ms listening, 400ms speaking | ease-in-out |
| Message enter | translateY(20) + opacity(0→1) | 300ms | spring(damping: 15) |
| Action card press | scale(0.96) + glow intensify | 150ms | ease-out |
| Screen transition | slide + fade | 250ms | ease-in-out |
| Boot sequence | Cascade delay per check | 200ms each | ease-out |
| Particle float | translateY infinite loop | 3-6s random | linear |
| Input border pulse | opacity 0.3↔0.8 | 2000ms | ease-in-out |
| HUD status dot | scale 1↔1.2 pulse | 1500ms | ease-in-out |

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)
1. Update color palette + typography in `colors.ts` / `theme.ts`
2. Build `HudHeader` component
3. Build enhanced `Orb` with state-based coloring (keep 2D for now, 3D later)
4. Build corner-cut `MessageBubble` component
5. Build glowing `InputBar` component

### Phase 2: Chat Screen Rebuild (Day 3-4)
1. Rebuild `chat.tsx` with new components
2. Add action cards嵌入in messages
3. Add particle background (simple version)
4. Add boot sequence animation

### Phase 3: New Screens (Day 5-6)
1. Build PC Command Center screen
2. Build Tools screen
3. Add bottom tab navigation
4. WebSocket connection for PC vitals

### Phase 4: Polish (Day 7)
1. Animations tuning
2. CRT scanline overlay (toggle in settings)
3. Noise texture overlay
4. Boot sequence refinement
5. Haptic feedback on interactions

---

## Tech Decisions

| Choice | Why |
|--------|-----|
| Keep Expo SDK 57 | Already working, don't break it |
| 2D Orb first, 3D later | Three.js in React Native needs `expo-gl` + `react-three-fiber` — add in Phase 4 |
| Corner-cut bubbles via `clip-path` | CSS clip-path works on Android, no native module needed |
| Particle background via Reanimated | Already in project, no new deps |
| Glassmorphism via `backdrop-filter` | Supported in React Native 0.76+ (Expo 52+), we're on 57 |
| Tab navigation via expo-router tabs | File-based routing, already using expo-router |
| WebSocket for PC vitals | Already have Axios client, add WS connection |

---

## Dependencies to Add

```bash
npx expo install expo-gl @react-three/fiber three  # 3D orb (Phase 4)
npx expo install react-native-reanimated            # Already installed
npx expo install @expo/vector-icons                 # If not already present
```

---

## Before / After Comparison

### Colors (BEFORE → AFTER)
```
BEFORE:                          AFTER:
background: '#0A0A0A'           background: '#0a0a0f' (slightly blue-tinted)
surface: 'rgba(255,255,255,0.04)'  surface: '#111118' (solid dark)
purple: '#9B6BFF'               primary: '#00f0ff' (cyan becomes AURA's color)
orb.idle: '#9B6BFF'             orb.idle: '#00f0ff' (cyan)
orb.listening: '#00BFFF'        orb.listening: '#10b981' (green)
orb.thinking: '#00E5A0'         orb.thinking: '#f59e0b' (amber)
orb.speaking: '#FFD060'         orb.speaking: '#8b5cf6' (purple)
N/A                             glow: 'rgba(0, 240, 255, 0.15)'
```

### Chat Screen (BEFORE → AFTER)
```
BEFORE:                          AFTER:
┌──────────────────┐            ┌──────────────────┐
│ [Orb] AURA  [•]  │            │ ◁ AURA  ● PC  ⚙ │ ← HUD header
├──────────────────┤            ├──────────────────┤
│                  │            │   ◉ 3D ORB       │ ← Centered orb
│                  │            │   (holographic)  │
│ user msg (right) │            │                  │
│ aura text (left) │            │ ┌─corner-cut─┐  │ ← User bubble
│                  │            │ │ msg    14:32│  │    (purple, 45° cut)
│                  │            │ └────────────┘  │
│                  │            │ ┌─corner-cut─┐  │ ← AURA bubble
│                  │            │ │ response   │  │    (dark, cyan border)
│                  │            │ │ [Action]   │  │ ← Embedded action card
│                  │            │ └────────────┘  │
│ [input] [↑]     │            │ [glowing input] │ ← Animated border
└──────────────────┘            └──────────────────┘
```

### Orb (BEFORE → AFTER)
```
BEFORE: 2D gradient circle, 4 colors, simple breathing
AFTER: 3D holographic sphere, wireframe shells, particles, bloom glow
       (Phase 1: Enhanced 2D with glow layers → Phase 4: Three.js 3D)
```

### New Screens
```
BEFORE: 2 screens (chat, settings)
AFTER: 4 screens (chat, PC command center, tools, settings)
       + boot sequence on first launch
       + bottom tab navigation
```

## What NOT to Change

- Keep the existing API client (`src/api/client.ts`)
- Keep the existing task router (`src/router/taskRouter.ts`)
- Keep the existing mobile executor (`src/capabilities/mobileExecutor.ts`)
- Keep the existing Zustand store structure
- Keep the existing dev log system
- Keep the Android-only platform target

---

## Visual Mood Board (Text Description)

**Think**: Iron Man HUD meets modern mobile design. Dark, clean, glowing. Not cluttered. Every element has purpose. The orb is the centerpiece — everything radiates from it. The UI should feel alive — subtle animations everywhere, nothing static. When AURA is thinking, you should SEE it thinking. When a tool executes, you should SEE it happen.

**Anti-patterns to avoid**:
- Rounded corners everywhere (use corner cuts instead)
- Flat/boring message bubbles
- Static backgrounds
- Hidden state (everything should be visible)
- Overly complex layouts (keep it minimal, let the glow do the work)
