# AURA Mobile — Master Handoff & Native Architecture Blueprint

> **Document Type**: Cross-Session Transition & Native Android Blueprint  
> **Target Platform**: 100% Native Android (Kotlin 2.0+, Jetpack Compose, Material 3, Coroutines/Flow, OkHttp 4)  
> **Device Target**: Samsung Galaxy Devices (One UI 8.5/9 / Android 15/16)  
> **Benchmark Reference**: Samsung One UI System Intelligence ("I Can't Believe It's Bixby" — https://www.youtube.com/watch?v=adAcFscS2JY)

---

## 1. Executive Summary & Why We Pivoted to Native Kotlin

The React Native (Expo SDK 57) iteration of AURA Mobile reached its architectural limits. While UI styling was achieved, the core mission of AURA requires deep operating-system-level presence that React Native cannot provide:

1. **True Floating HUD Overlay (`SYSTEM_ALERT_WINDOW`)**:
   - AURA must float over any third-party app (YouTube, WhatsApp, Browser, Settings) as a draggable interactive holographic pill/orb. React Native runs inside a single `Activity` and cannot mount standalone reactive overlays over other apps without severe memory leaks and bridge crashes.
2. **Accessibility Node Serialization Latency**:
   - To automate user workflows, AURA reads the active Android UI accessibility tree. In React Native, serializing thousands of nested node objects into JSON over the bridge caused 200–400ms lag per action. In native Kotlin, `AccessibilityNodeInfo` traversal, coordinate calculation, and `dispatchGesture()` run in **under 2 milliseconds**.
3. **Samsung One UI Process Lifecycle**:
   - Samsung aggressively suspends background JavaScript engines. Native Android `ForegroundService` with notification channels, wake-locks, and native OkHttp connection pools guarantees 24/7 background survival.
4. **Hermes Runtime Incompatibilities**:
   - Stream decoders (`WHATWG streams`, `TextDecoder`) and complex worklet animations frequently crashed Hermes on Android. Native Kotlin handles Server-Sent Events (SSE) and Canvas 60/120fps shaders effortlessly.

The React Native codebase is safely committed and archived at `c:\AURA_V2\mobile_aura_V2` (commit `a0845b0`).

---

## 2. Target Workflow & Cloud-Offloaded Build Loop

To keep the developer's PC fast and free of heavy Gradle build processes:
1. **Initial Scaffold Generation**: Generated via Google AI Studio using the comprehensive prompt provided in this handoff.
2. **Repository Connection**: The scaffold is pushed to a new GitHub repository (`AURA-Mobile-Native`).
3. **Development via Antigravity**: Antigravity works on the Kotlin code locally, writes system services, and pushes commits to GitHub.
4. **Cloud Build**: A GitHub Actions workflow (`.github/workflows/build.yml`) builds the debug APK in ~60-90 seconds.
5. **Direct ADB Installation**: The developer or Antigravity installs the compiled APK straight to the connected Samsung phone via ADB Wireless:
   ```powershell
   adb install -r app-debug.apk
   ```

---

## 3. PC Backend Contract & Protocol (FastAPI)

The AURA PC daemon runs continuously on the Windows host machine:
- **Host**: Windows PC running FastAPI daemon on port `8000`.
- **Network**: Reachable via **Tailscale IP** (`http://100.x.y.z:8000`) or local Wi-Fi.
- **Cleartext Traffic**: Enabled via `android:usesCleartextTraffic="true"`.
- **Authentication**: Bearer token `testkey123` via `Authorization: Bearer testkey123` header.

### Endpoints:
| Method | Endpoint | Description | Payload / Response |
|---|---|---|---|
| `GET` | `/health` | Daemon status & heartbeat | `{"status": "ok", "version": "2.0"}` |
| `GET` | `/system-stats` | Real-time PC vitals | `{"cpu_percent": 14.2, "ram_percent": 68.1, "disk_percent": 45.0, "battery": null}` |
| `GET` | `/now-playing` | Active PC media playback | `{"title": "Song Title", "artist": "Artist", "playing": true}` |
| `POST` | `/action` | Execute PC action / tool | Body: `{"tool": "open_app", "args": {"name": "chrome"}}` |
| `POST` | `/chat` | Conversational query | Body: `{"message": "Hello AURA", "stream": true}` |
| `GET` | `/vault/list` | List Obsidian vault notes | Returns array of markdown files |
| `GET` | `/vault/read` | Read specific vault note | Query: `?filename=Daily.md` |

---

## 4. Multi-Provider Intelligence Model

1. **Deterministic FastPath Engine (On-Device Local, <2ms)**:
   - Zero-LLM regex/keyword parser for immediate execution:
     - Camera (front/selfie/rear/video), phone calls, direct WhatsApp chats, system toggles (WiFi/Bluetooth/Flashlight).
2. **Tool Execution & Action Planning (Groq or Cerebras)**:
   - Dedicated provider for planning complex multi-step mobile/PC actions:
   - **Model**: `llama-3.3-70b-versatile` on Groq (ultra-fast latency, generous free tier).
3. **Conversational Brain (OpenRouter / Nvidia NIM / Gemini)**:
   - Dedicated provider for conversational responses, persona, reasoning, and context analysis.

---

## 5. Design System Tokens & Aesthetics

**Aesthetic Identity**: Cyberpunk Stark Industries meets Samsung One UI Fluidity.

### Color Palette:
```kotlin
val ObsidianVoid = Color(0xFF08080C)       // Pure deep background
val SurfaceElevated = Color(0xFF111018)    // Card background
val SurfaceGlass = Color(0xCC1A1829)       // Translucent glass cards
val BorderSubtle = Color(0xFF2A2538)       // Card borders
val RoyalPurple = Color(0xFF6A5399)        // Signature primary brand
val RoyalPurpleLight = Color(0xFF8E6FD1)   // Glowing accents
val ElectricCyan = Color(0xFF00F0FF)       // Telemetry, online, active states
val CyberGold = Color(0xFFFFD700)          // FastPath & warning accents
val SuccessEmerald = Color(0xFF00E676)     // Link connected status
val ErrorCrimson = Color(0xFFFF5252)       // Critical alerts
val TextPrimary = Color(0xFFFFFFFF)        // High emphasis text
val TextSecondary = Color(0xFF9D9AA8)      // Muted labels
val TextMuted = Color(0xFF5C586E)          // Telemetry captions
```

### Visual Directives:
- **ZERO EMOJIS**: Strictly use `androidx.compose.material.icons` (Icons.Outlined, Icons.Filled).
- **One UI Geometry**: `RoundedCornerShape(22.dp)` for cards and dialogs.
- **Liquid Glass Navigation Bar**: Spring-animated capsule pill sliding on the X-axis behind active icon.
- **Arc Reactor / Holographic Particle Orb**: Custom Compose `Canvas` with rotating orbital rings, pulse energy core, and audio-reactive ripples.
- **HUD Telemetry Labels**: Monospace micro-badges (`SYS_LINK: ACTIVE`, `CORE: 60FPS`, `MEM: OK`).

---

## 6. Native Android Package & Directory Architecture

```
app/src/main/java/com/aura/mobile/
├── AuraApplication.kt                 // App context, notification channels, service init
├── MainActivity.kt                    // Jetpack Compose root & navigation host
├── data/
│   ├── api/
│   │   ├── AuraPcClient.kt            // OkHttp 4 client for PC FastAPI daemon
│   │   ├── GroqPlannerClient.kt       // Groq API client for tool calling
│   │   └── OpenRouterChatClient.kt    // OpenRouter / Gemini streaming client
│   ├── model/                         // ChatMessage, PcStats, ToolAction, FastPathIntent
│   └── repository/                    // AuraRepository, SettingsRepository
├── engine/
│   ├── FastPathEngine.kt              // Sub-millisecond deterministic intent parser
│   └── SpeechManager.kt               // Android SpeechRecognizer & TextToSpeech wrapper
├── service/
│   ├── AuraAccessibilityService.kt    // System tree scraping & dispatchGesture()
│   ├── AuraFloatingOverlayService.kt  // SYSTEM_ALERT_WINDOW floating orb & HUD
│   └── AuraForegroundDaemon.kt        // Persistent background service & wakelock
└── ui/
    ├── components/
    │   ├── ArcReactorOrb.kt           // Canvas-rendered holographic animated orb
    │   ├── LiquidBottomBar.kt         // Spring-animated sliding capsule nav bar
    │   ├── TelemetryCard.kt           // Cyberpunk glassmorphism card
    │   └── InputBar.kt                // Fluid message input with mic waveform
    ├── navigation/
    │   └── Screen.kt                  // Home, Chat, Automate, Settings
    ├── screens/
    │   ├── HomeScreen.kt              // Orb hero, status indicators, quick actions
    │   ├── ChatScreen.kt              // Streaming conversation & action cards
    │   ├── AutomateScreen.kt          // Accessibility status, Android shortcuts, PC tools
    │   └── SettingsScreen.kt          // Dual LLM keys, Tailscale IP, voice config
    └── theme/
        ├── Color.kt
        ├── Theme.kt
        └── Type.kt
```

---

## 7. Cloud CI/CD: `.github/workflows/build.yml`
```yaml
name: Build AURA Native APK
on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle
      - name: Grant execute permission for gradlew
        run: chmod +x gradlew
      - name: Build Debug APK
        run: ./gradlew assembleDebug --stacktrace
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: aura-mobile-debug
          path: app/build/outputs/apk/debug/app-debug.apk
```
