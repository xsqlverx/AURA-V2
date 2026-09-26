# Google AI Studio Master Prompt — AURA Native Android (Kotlin + Jetpack Compose)

> **Instructions for User**: Copy the entire text inside the prompt block below and paste it directly into **Google AI Studio** (using Gemini 1.5 Pro or Gemini 2.0 Flash with maximum thinking / output length).

---

```markdown
You are an elite Android Systems & Jetpack Compose UI/UX Architect designing the flagship native Android app for "AURA" (an autonomous system-level AI companion living on Samsung Galaxy One UI 8.5/9 devices).

### CRITICAL DESIGN DIRECTIVE — ZERO AMATEUR UI:
Most AI-generated Android apps look generic, washed-out, and amateurish (using default Material 3 pastel purple/teal, plain rectangular cards, flat buttons, and cheesy emojis). 
DO NOT DO THIS. 
AURA must look like a fusion of Stark Industries Iron Man HUD, Cyberpunk 2077 Telemetry, and Samsung One UI Fluidity (benchmark reference: "I Can't Believe It's Bixby" - https://www.youtube.com/watch?v=adAcFscS2JY).

### HARD RULES:
1. **ZERO EMOJIS**: Under NO circumstances use emojis (no 🤖, 💬, ⚡, 📱, etc.). Every single icon MUST be a vector icon from `androidx.compose.material.icons.Icons.Default.*`, `Icons.Outlined.*`, or `Icons.AutoMirrored.*`.
2. **COLOR PALETTE (STRICT TOKENS)**:
   - `ObsidianVoid`: `Color(0xFF08080C)` — The deepest, purest void black (app background).
   - `SurfaceElevated`: `Color(0xFF111018)` — Primary card surface.
   - `SurfaceGlass`: `Color(0xCC1A1829)` — Translucent glass for overlays/dialogs.
   - `BorderSubtle`: `Color(0xFF2A2538)` — Fine card outline (1.dp).
   - `RoyalPurple`: `Color(0xFF6A5399)` — AURA's primary signature brand color.
   - `RoyalPurpleLight`: `Color(0xFF8E6FD1)` — Neon purple glow and accent lines.
   - `ElectricCyan`: `Color(0xFF00F0FF)` — Status active, telemetry ticks, audio waveforms.
   - `CyberGold`: `Color(0xFFFFD700)` — Warning, FastPath trigger indicators.
   - `SuccessEmerald`: `Color(0xFF00E676)` — Connected / operational indicator.
   - `ErrorCrimson`: `Color(0xFFFF5252)` — Alert indicator.
   - `TextPrimary`: `Color(0xFFFFFFFF)` — High-contrast white.
   - `TextSecondary`: `Color(0xFF9D9AA8)` — Slate-gray secondary labels.
   - `TextMuted`: `Color(0xFF5C586E)` — Micro-telemetry caption text.
3. **ONE UI GEOMETRY**:
   - All cards and surfaces must use `RoundedCornerShape(22.dp)` (Samsung One UI squircle).
   - Card borders: `Modifier.border(1.dp, Brush.linearGradient(listOf(Color(0xFF2A2538), Color(0x4D6A5399))), RoundedCornerShape(22.dp))`.
4. **LIQUID GLASS NAVIGATION BAR**:
   - A custom bottom bar (not default NavigationBar).
   - Features a floating translucent pill container (`SurfaceGlass`) with a spring-animated indicator pill (`RoyalPurple` with subtle cyan glow) sliding smoothly across the X-axis beneath the active tab icon (`animateDpAsState`).
5. **ARC REACTOR / 3D HOLOGRAPHIC CANVAS ORB**:
   - The Home Screen hero is a custom `Canvas` drawing an Arc Reactor / Particle Swarm:
     - Outer rotating segmented rings (`drawArc` with dashed effects or angle offsets).
     - Inner rotating counter-ring.
     - Pulsating energy core with radial gradient (`Brush.radialGradient(listOf(ElectricCyan, RoyalPurple, Color.Transparent))`).
     - State-driven animation (Idle, Listening, Thinking, Speaking) using `rememberInfiniteTransition()`.
6. **CYBER TELEMETRY ELEMENTS**:
   - Monospace micro-badges (`FontFamily.Monospace`, font size 9–11.sp, tracking 1.2.sp) such as `[SYS_LINK: TAILSCALE_ACTIVE]`, `[CORE_TEMP: NOMINAL]`, `[ACCESSIBILITY: STANDBY]`.

---

### REQUIRED ARCHITECTURE & OUTPUT FILES:

Generate a complete, ready-to-compile Gradle Android project scaffold in Kotlin with the following files:

1. `build.gradle.kts` (Project-level) and `app/build.gradle.kts` (App-level):
   - Min SDK 28, Target/Compile SDK 35, Java 17, Kotlin 2.0+, Jetpack Compose BOM 2024.09.00+, Material 3, Navigation Compose, OkHttp 4.12.0, Lifecycle ViewModel Compose, Coroutines.
2. `app/src/main/AndroidManifest.xml`:
   - Permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`, `BIND_ACCESSIBILITY_SERVICE`.
   - `android:usesCleartextTraffic="true"` (for local/Tailscale network communication with PC FastAPI daemon).
3. `theme/`:
   - `Color.kt` with all the exact color tokens above.
   - `Type.kt` with clean typography and monospace telemetry styles.
   - `Theme.kt` with `AuraTheme` wrapping Material 3 dark color scheme.
4. `components/`:
   - `ArcReactorOrb.kt`: The production-grade animated Canvas Arc Reactor.
   - `LiquidBottomBar.kt`: The sliding spring-animated liquid navigation bar for the 4 tabs (`HOME`, `CHAT`, `AUTOMATE`, `SETTINGS`).
   - `TelemetryCard.kt`: Reusable glassmorphic squircle card with subtle gradient border.
5. `screens/`:
   - `HomeScreen.kt`: Hero Arc Reactor orb, system telemetry meters (PC CPU, RAM, Tailscale status), quick action chips (Scan Screen, PC Mute, Flashlight, Selfie Mode).
   - `ChatScreen.kt`: Streaming chat bubble list (user in purple bubble, AURA in glass card with cyan glow), audio waveform visualizer placeholder, and fluid message input bar with mic button.
   - `AutomateScreen.kt`: Accessibility Service permission status card, on-device quick shortcuts (Camera front/back, WhatsApp, Call Contact, WiFi), and PC Remote Control quick triggers.
   - `SettingsScreen.kt`: Dual-Provider LLM configuration cards (Groq API Key for Tool Planning, OpenRouter Key for Conversational Chat), Tailscale PC IP field (`http://100.x.y.z:8000`), Voice synthesis toggle.
6. `service/`:
   - `AuraAccessibilityService.kt`: Clean skeleton for native screen scraping and `dispatchGesture()`.
7. `MainActivity.kt`:
   - Full Jetpack Compose scaffold wiring `AuraTheme`, `NavHost`, and `LiquidBottomBar`.

Produce complete, clean, high-performance, non-placeholder Kotlin code ready to commit to GitHub.
```
