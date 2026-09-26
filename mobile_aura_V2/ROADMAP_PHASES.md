# AURA Mobile V2 — 5-Phase Master Roadmap

This document serves as the permanent reference specification for AURA Mobile V2 development.

---

## 🟣 Phase 1: "The Foundation"
> **Status**: ✅ **COMPLETE & DEPLOYED**

### Core Deliverables:
- **Design Language**: Signature Royal Purple (`#6A5399`), Electric Cyan (`#00f0ff`), Cyber Gold (`#FFD700`), and Obsidian Surface (`#08080C`).
- **Cinematic Arc Reactor Boot Sequence**: Central spark ignition, rotating dials, telemetry reticles, 5-step diagnostics cascade, and personalized greeting.
- **4-Tab Navigation & Cyber Drawer**:
  - `HOME` (`/`): Status dashboard & hero orb.
  - `CHAT` (`/chat`): Streaming conversation & route indicators.
  - `AUTOMATE` (`/automation`): Device shortcuts & Speak on PC prank tool.
  - `SYSTEM` (`/settings`): Multi-provider LLM hub & voice setup.
- **PC Backend Integration**: Fixed endpoints (`/system-stats`, `/now-playing`, `/action`, `/vault/` params).
- **Production Build**: Standalone Android APK verified on EAS Cloud.

---

## ⚡ Phase 2: "The Brain, Fast-Path & Liquid Nav"
> **Status**: 🔄 **CURRENT PHASE (In Progress)**

### Core Deliverables:
1. **Deterministic Fast-Path Intent Engine (<5ms, Zero LLM Call)**:
   - Direct execution for single-intent actions:
     - **Camera**: Open camera, selfie/front view mode, video mode.
     - **WhatsApp**: Open specific chat, WhatsApp voice/video calls, quick message.
     - **Phone Calls**: Dial contact, direct phone calls.
     - **System Toggles**: WiFi, Bluetooth, Flashlight, Volume, Battery status.
   - **Compound Intent Detector**: Distinguishes single-shot actions from complex multi-step directives (e.g. *"open whatsapp, then youtube, copy link and send to max..."*) and routes compound tasks to the LLM action planner.
2. **Dual-Provider Architecture (Tool Provider vs Chat Provider)**:
   - Separate configuration for **Tool Execution** (e.g. **Groq** `llama-3.3-70b-versatile` — ultra-fast & high free limits) vs **Chat Conversation** (OpenRouter / Nvidia NIM).
3. **Zero-Latency Voice & Speech-to-Text (STT)**:
   - Voice pre-fetching on startup to eliminate TTS speech delay.
   - Microphone voice transcription integration with permission guards.
4. **Liquid Glass Sliding Navigation Bar**:
   - Reanimated spring-driven liquid capsule pill sliding smoothly across tabs on the X-axis.
   - Elimination of page transition latency.
5. **3D Holographic Particle Swarm Orb Overhaul**:
   - Multi-tiered swirling 3D particle vortex (inner dense core, orbiting filaments, outer cosmic embers).
   - Encompassing HUD containment cradle with animated corner telemetry dots framing the orb.
6. **Professional Vector Iconography**:
   - Complete replacement of emojis with professional vector/cyber icons across all screens.

---

## 🖐️ Phase 3: "The Hands & Autonomous Screen Engine"
> **Status**: 📋 **UPCOMING**

### Core Deliverables:
- **Native Android Accessibility Service Bridge**:
  - Integration of legacy Kotlin module (`AuraAccessibilityService.kt`).
  - Screen hierarchy node tree extraction and spatial coordinate calculation.
- **Autonomous Capture-Analyze-Act Loop**:
  - `Capture Screen Layout` ➔ `LLM Action Planner` ➔ `Execute Native Tap/Type/Scroll` ➔ `Verify & Loop`.
- **App Automations**:
  - Deep multi-step automation across WhatsApp, Instagram, YouTube, and Android Settings.
- **Recovery Engine**:
  - Stuck-state detection, back-navigation escape, and retry heuristics.
- **Task Audit Log**:
  - Visual step-by-step audit log of executed actions.

---

## 🌐 Phase 4: "The Presence & Floating Overlay"
> **Status**: 📋 **UPCOMING**

### Core Deliverables:
- **Floating Draggable Holographic Orb (`SYSTEM_ALERT_WINDOW`)**:
  - Floating over other apps (Gemini-style) with drag-to-dock physics.
  - Expands to show live task progress while automating other apps.
- **Floating Quick-Voice Trigger**:
  - Tap floating orb from any application to issue voice commands.
- **Notification Intelligence Service**:
  - Background notification listener to capture, summarize, and prioritize incoming alerts.

---

## 🚀 Phase 5: "The Ultimate Polish & Ecosystem Synergy"
> **Status**: 📋 **UPCOMING**

### Core Deliverables:
- **Cross-Device Shared Memory**:
  - Local sync with PC ChromaDB vector store and Obsidian Vault notes.
- **Advanced 3D Shader Rendering**:
  - Particle shaders & audio-reactive spectrum visualizations.
- **Custom Macro Builder**:
  - User-recorded custom automation flows.
- **Final Showcase Readiness**:
  - Sub-second responsiveness and flawless 60fps animations.
