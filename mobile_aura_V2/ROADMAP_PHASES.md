# AURA Mobile — Native Android (Kotlin + Jetpack Compose) Master Roadmap

> **Target Architecture**: 100% Native Android (Kotlin 2.0+, Jetpack Compose, Material 3, Coroutines/StateFlow, OkHttp 4, AndroidX Accessibility & WindowManager).  
> **Benchmark Reference**: Samsung One UI System Intelligence ("I Can't Believe It's Bixby") & Jarvis Holographic HUD.

---

## 🟣 Phase 1: "The Sovereign UI & Design System"
> **Focus**: Production-grade Jetpack Compose UI architecture, One UI aesthetic, 60fps holographic visuals, and complete vector iconography.

### Core Deliverables:
- **Design Tokens & Theme Architecture**:
  - Obsidian Void Background (`#08080C`), Elevated Surface (`#111018`), Subtle Border (`#2A2538` / `rgba(106, 83, 153, 0.25)`).
  - Signature Royal Purple (`#6A5399` / `#8E6FD1`), Electric Cyber Cyan (`#00F0FF`), Cyber Gold (`#FFD700`).
  - Fluid glassmorphism with subtle gradient borders (`Brush.linearGradient`) and One UI squircles (`RoundedCornerShape(22.dp)`).
- **Zero-Emoji Mandate**:
  - 100% vector iconography using `androidx.compose.material.icons` (AutoMirrored, Outlined, and Filled).
- **Liquid Glass Sliding Navigation Bar**:
  - Custom Compose navigation bar with spring-animated liquid capsule pill sliding smoothly across tabs on the X-axis (`animateDpAsState`).
  - Zero tab-switching latency; lazy-loaded screen composables.
- **Cinematic Arc Reactor / Particle Swarm Orb**:
  - High-performance `Canvas` composable with multi-ring rotating telemetry reticles, pulsating radial gradient core, and floating orbital particles.
  - State-reactive: `IDLE` (slow cosmic breathing), `LISTENING` (cyan audio-reactive ripple), `THINKING` (rapid purple/gold vortex), `SPEAKING` (harmonic frequency wave).
- **Core Screen Scaffolding**:
  - `Home`: Arc Reactor hero, quick action chips, telemetry status cards, connection badge.
  - `Chat`: Streaming Markdown messages, tool execution cards, latency indicators, audio input bar.
  - `Automate`: Native Android shortcut triggers, accessibility status card, PC quick commands.
  - `Settings`: Dual-provider configuration (Groq tool planner + OpenRouter chat), Tailscale PC IP setup, voice engine selection.

---

## ⚡ Phase 2: "The Brain, FastPath & PC Tailscale Link"
> **Focus**: Network communication, sub-millisecond local intent routing, dual-model LLM planner, and PC daemon integration.

### Core Deliverables:
- **OkHttp 4 + SSE Streaming Client**:
  - Direct HTTP/2 and Server-Sent Events (SSE) streaming engine without JavaScript bridge overhead.
  - Native connection pooling, auto-reconnect, and cleartext HTTP support for Tailscale local networks (`100.x.y.z:8000`).
- **Tailscale PC Daemon Handshake**:
  - Dynamic discovery and heartbeat health checks against PC FastAPI daemon (`GET /health`, `GET /system-stats`, `GET /now-playing`).
  - Bearer token authentication (`testkey123`).
- **Sub-Millisecond Deterministic FastPath Engine (<2ms)**:
  - Zero-LLM regex/keyword parser executing immediately on-device:
    - **Camera**: Launch front/rear camera, video mode, selfie mode.
    - **Phone**: Direct dialer launch or contact calling.
    - **WhatsApp**: Open specific chat, start call, voice message intent.
    - **System**: WiFi, Bluetooth, Flashlight, Volume, Battery status.
- **Compound Intent Classifier & Dual-Provider Split**:
  - Distinguishes single-shot actions from compound multi-step directives (e.g., *"open whatsapp, then youtube, copy link and send to Max"*).
  - **Tool Planner**: Ultra-low-latency provider (Groq `llama-3.3-70b-versatile` or Cerebras) generating JSON action plans.
  - **Chat Brain**: Conversational model (OpenRouter / Nvidia NIM / Gemini 2.0 Flash) for open-ended dialogue.
- **Zero-Latency Audio & STT/TTS Engine**:
  - Android SpeechRecognizer / Vosk offline STT integration for handsfree voice transcription.
  - Native Android `TextToSpeech` with pre-warmed voice synthesis and audio cache.

---

## 🖐️ Phase 3: "The Sovereign Hands & Accessibility Automation"
> **Focus**: Deep on-device OS automation via native Android `AccessibilityService`.

### Core Deliverables:
- **Pure Kotlin `AuraAccessibilityService`**:
  - Runs in the application process with direct memory access to the active window node hierarchy (`AccessibilityNodeInfo`).
  - Zero JSON serialization lag (<1ms tree inspection vs 200ms+ in React Native).
- **Autonomous Capture-Analyze-Act Loop**:
  - `Dump Active Screen Hierarchy` ➔ `Spatial Coordinate & Label Extraction` ➔ `LLM Action Planner` ➔ `Dispatch Native Gesture` ➔ `Verify State Transition`.
- **Native Gesture Dispatching**:
  - Real-time `dispatchGesture()` execution: precise tap coordinates, directional swipes, fluid scrolls, and text injection (`ACTION_SET_TEXT`).
- **App Automations**:
  - End-to-end automation across WhatsApp, YouTube, Instagram, and Android System Settings.
- **Self-Healing & Stuck-State Detection**:
  - Escape heuristics: automatic back-press, modal dismissal, screen-refresh verification, and fallback recovery.
- **Live Task Audit Trail**:
  - Visual step-by-step HUD card showing executed actions, target coordinates, and outcome status.

---

## 🌐 Phase 4: "The Living Presence & Floating HUD (`SYSTEM_ALERT_WINDOW`)"
> **Focus**: System-wide presence floating over other applications, inspired by Samsung Bixby and Google Gemini.

### Core Deliverables:
- **Draggable Floating Holographic Orb**:
  - Native Android `WindowManager` overlay with `TYPE_APPLICATION_OVERLAY`.
  - Smooth spring physics, edge-docking with idle transparency fade, and magnetic snapping.
- **Context-Aware Screen Reader**:
  - Overlay button triggers instant screenshot capture via `MediaProjection` or active accessibility text scraping.
  - Sends screen context to LLM: *"What is this article about?"*, *"Summarize this chat"*, *"Find the cheapest flight on this screen"*.
- **Quick Voice Trigger Without App Switching**:
  - Tap the floating orb from any active app (e.g. while watching YouTube or browsing Chrome) to speak; mini floating transcription capsule appears.
- **Live Action Execution HUD**:
  - Displays mini step-by-step automation status while AURA controls the background app underneath.

---

## 🚀 Phase 5: "Ecosystem Synergy & Voice Wake"
> **Focus**: Background resilience, wake-word activation, Obsidian vault memory, and PC synergy.

### Core Deliverables:
- **Foreground Service & Samsung One UI Survival**:
  - Android `ForegroundService` with persistent low-profile notification and partial wake-locks to ensure Samsung One UI never kills the background daemon.
- **Offline Wake-Word Detection**:
  - Integration of lightweight on-device wake-word engine (Porcupine / Vosk) listening for "Hey Aura" with minimal battery consumption.
- **Cross-Device Vault & Memory Sync**:
  - Direct synchronization with PC ChromaDB vector memory and Obsidian Vault (`/vault/list`, `/vault/read`).
  - Clipboard sharing between PC and Samsung device.
- **60/120fps Dynamic Display Polish**:
  - Full support for Samsung 120Hz LTPO displays, custom GL shaders for the Arc Reactor core, and complete haptic feedback (`VibratorManager`).
