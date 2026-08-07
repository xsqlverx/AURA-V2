# AURA Mobile — Information Architecture & User Experience Redesign

> This document is a complete rethinking of how users experience AURA.
> Visual design, colors, typography, and animations are out of scope — they are solved.
> This document addresses only product architecture, mental models, navigation, and interaction flow.

---

## Table of Contents

1. [Critique of Current Architecture](#1-critique-of-current-architecture)
2. [New Mental Model](#2-new-mental-model)
3. [Navigation Redesign](#3-navigation-redesign)
4. [Feature Belonging](#4-feature-belonging)
5. [First-Launch Journey](#5-first-launch-journey)
6. [Contextual Intelligence](#6-contextual-intelligence)
7. [Ambient Experiences](#7-ambient-experiences)
8. [Future Scalability](#8-future-scalability)

---

## 1. Critique of Current Architecture

### The Toolbox Problem

The current app exposes backend capabilities as a flat list of screens:

```
Home  →  Chat  →  Memory  →  Actions  →  Notes  →  Files  →  Stats  →  Processes  →  Settings
```

This is a **toolbox**. Each screen is a different tool. The user must:
1. Know which tool they need
2. Navigate to it
3. Use it
4. Navigate back
5. Go to a different tool

This forces the user to mentally map their desire ("I wonder what my desktop is doing") to a screen name ("Stats"). It treats the AI daemon as a collection of utilities rather than a unified intelligence.

### The Menu Mentality

The drawer navigation says "here are your options." It implicitly trains the user that AURA is something you browse through, not something you converse with. The menu is the primary interface, and conversation is just one item in the list. This is backwards for an AI product.

### Three Critical Failures

**Failure 1: Chat is demoted to equal status with tools.**
Chat should be the warp and weft of the experience. Instead, it is one tile among seven on the home screen and one item in the drawer. A new user sees a dashboard before they see any conversation. The message is: "AURA is a control panel with a chat feature."

**Failure 2: Actions is a dumping ground.**
"Actions" is not a coherent concept. It is a collection of unrelated backend capabilities (weather, power, volume, clipboard, news, apps) that share no common user intent. The name "Actions" reveals the problem — it is named after what the backend can do, not what the user wants to accomplish.

**Failure 3: Features are isolated from context.**
Memory lives on a separate screen from chat. But memory is what informs chat responses. Process list lives on a separate screen from stats. But processes and stats are both "desktop health." Notes live separately from files. But both are "desktop content." The architecture reflects the backend's service boundaries, not the user's mental model.

### The Mental Model Forced on Users

Users must think: "I need to find the right screen."

The correct mental model should be: "I ask AURA, and it handles everything else."

Every time a user opens a screen instead of asking AURA to handle it, the app has failed. The ideal user journey is:
- "What's happening on my desktop?" → answered in chat, with a stats card inline
- "Open that file" → done from chat
- "What do you remember about X?" → recalled in chat
- "Set volume to 40%" → done from chat

The screens exist only for **browsing and monitoring** — for when the user wants to scan rather than ask.

---

## 2. New Mental Model

### The Glance Model

AURA should present itself as a single intelligence with two interaction modes:

**Primary mode: Conversation.**
The user talks to AURA. AURA responds. Responses may include rich inline content (stats cards, memory references, file thumbnails, confirmation toasts). Everything that can be done in a screen should be doable through conversation. The conversation is the CLI of the intelligence.

**Secondary mode: Glances.**
Sometimes the user wants to scan information rather than ask for it. Glances are focused, single-purpose views that appear as overlays on top of the conversation. They are not destinations — they are temporary lenses into a specific aspect of the daemon.

A Glance is:
- Accessed by a single gesture from any screen
- Shows one type of information (stats, files, processes, memory)
- Disappears when dismissed or when the user starts typing
- Never has its own navigation — it is a floating card, not a screen

This replaces the drawer. The user no longer navigates to a "settings page" or a "stats page." They glance at settings. They glance at stats. Then they return to conversation.

### The Three Audiences

| Audience | Behavior | Primary Mode | Glance Usage |
|----------|----------|-------------|--------------|
| **Visitor** | First week, exploring | Conversation | Discover glances through AURA suggestions |
| **Daily user** | Multiple sessions/day | Conversation | Occasional glance at stats, memory |
| **Power user** | Heavy desktop interaction | Conversation + commands | Frequent glances at files, processes, clipboard |

The architecture serves all three without changing. Visitors are guided by AURA's proactivity. Daily users converse and glance when needed. Power users memorize the glance gestures and use them as shortcuts.

### Design Tenets for Information Architecture

1. **Everything starts with conversation.** Every screen, every feature, every tool — the user should arrive there through conversation or through a gesture that feels like extending conversation, not leaving it.

2. **No destinations.** Screens are not places you "go to." They are overlays, glances, inline cards, and contextual sheets. The only constant context is the conversation thread.

3. **The daemon is always visible.** Whether through the Orb, through connection status, or through ambient stats, the user should never feel like they are using a local app. They are always reaching into a remote machine.

4. **Proactivity reduces navigation.** Each time the app surfaces the right feature at the right time, the user does not need to find it. Proactivity is a navigation strategy, not a feature.

5. **Three-tap maximum.** Any feature should be accessible within three gestures from the home state. If it takes more, it should either be restructured or brought inline.

---

## 3. Navigation Redesign

### Eliminate the Drawer

The drawer is eliminated as the primary navigation mechanism. It survives only as an **app-level settings panel** (connection, security, about) accessible via a two-finger swipe from the left edge — a deliberate gesture that casual users will not discover until they need it.

**Rationale:**
- The drawer presents a menu of destinations. Destinations imply "going to" a place. This fights the glance model.
- The drawer is hidden. Users must know it exists and remember to swipe. This fails discoverability.
- The drawer forces content behind a gesture. Every navigation is a cognitive load.

### Replace with Two Navigation Gestures

**Gesture 1: Swipe down from Orb → Glance Tray.**
A carousel of glance cards. The user swipes horizontally between them. Each card is a single feature view (stats, files, processes, memory search). Releasing on a card expands it to fullscreen. Flicking up dismisses it.

This replaces: Home screen dashboard, Stats screen, Processes screen, Files screen (as a standalone view).

**Gesture 2: Swipe from right edge → Context Panel.**
A panel that shows what AURA is currently aware of. This is dynamic content — it changes based on what the user is doing:
- During conversation: shows recent memory references, relevant notes
- During command execution: shows execution progress
- While idle: shows ambient desktop state
- After a file operation: shows recent files

This replaces: Nothing that currently exists. This is new — ambient awareness surfaced as an interactive panel.

### Screen Restructuring

| Current Screen | New Status | Why |
|---------------|-----------|-----|
| Home | **Eliminated** | The home was a dashboard that competed with chat. Its function (quick access, overview) is absorbed by the Glance Tray and by conversation. |
| Chat | **Promoted to root** | Chat becomes the primary screen. It is what the user sees when they open the app. The Orb is embedded at the top. Empty state shows suggestions. |
| Actions | **Eliminated** | Its pieces are redistributed. Power controls → contextual commands ("lock desktop" typed or spoken). Volume → media glance. Clipboard → inline card. News → ambient glance. Quick launch → conversation command or glance. |
| Memory | **Glance + inline** | Memory is surfaced in two ways: as a glance (browse all) and as inline references in conversation (AURA cites memories in responses). The standalone screen is eliminated. |
| Notes | **Glance + inline** | Notes are a glance for browsing. In conversation, AURA can read, create, and edit notes through natural language. |
| Files | **Glance only** | File browsing is a glance. File operations (open, delete) are done through conversation. No standalone screen. |
| Stats | **Glance + ambient** | Stats are the default glance card. Also shown as an ambient footer on the conversation screen (compact mode). |
| Processes | **Glance only** | Process viewing is a glance. Killing processes is done through conversation. No standalone screen. |
| Settings | **Back-of-house only** | Settings moves behind the two-finger drawer gesture. It is connection, security, and about — things users rarely need. All other "settings" should be controllable through conversation (e.g., "switch to fast mode"). |
| Security | **Moved into settings** | Security was a sub-screen of settings. It stays as a section within the settings panel. |
| Setup | **Replaced** | Replaced by a conversational onboarding flow (see section 5). |
| Files | (standalone) → **Eliminated as screen** | See Files above. |

### Resulting Navigation Architecture

```
App opens → Chat (primary)
  ├── Swipe down from Orb → Glance Tray
  │   ├── Stats (default)
  │   ├── Memory
  │   ├── Notes
  │   ├── Files
  │   ├── Processes
  │   └── Media (now playing + volume)
  ├── Swipe right edge → Context Panel (dynamic)
  ├── Two-finger swipe left → Settings (rare)
  ├── Backend features through conversation
  └── Backend features through inline cards
```

The user never "goes to" a feature. They either:
1. **Ask** AURA (conversation)
2. **Glance** at it (quick overlay)
3. **Discover** it (surfaced in context panel)
4. **Configure** it (settings, as a last resort)

### Justification

**Why eliminate Home?** The home screen is an unnecessary indirection. It exists only because the drawer needs a default route. In the glance model, the "overview" is provided by the Orb (which is always visible) and by the Glance Tray (which shows stats by default). Removing Home removes the decision "should I go Home or Chat?" — there is only Chat.

**Why eliminate Actions?** Actions is not a coherent destination. It is a collection of features that share no user intent. Distributing its pieces into contextual surfaces means the user encounters each capability at the right moment, not as a list in a scroll view.

**Why keep Settings back-of-house?** Settings are about connection, security, and configuration — they are meta-features. The user should be configuring through conversation ("AURA, change your voice to Kokoro"), not through forms. Settings exists only for the features that cannot be conversational (PIN setup, biometric enrollment, server URL).

**Why add Context Panel?** The current app has no way for the user to understand what AURA is currently aware of. The Context Panel solves this by showing the daemon's current state of mind — what it is attending to, what it has recently done, what it knows about the current conversation.

---

## 4. Feature Belonging

Every backend feature maps to exactly one surface. The mapping is determined by **user intent**:

| Backend Feature | Primary Surface | Secondary Surface | Rationale |
|----------------|----------------|------------------|-----------|
| Chat / streaming | Conversation | — | This is the core interaction. Nothing else needed. |
| Memory (CRUD) | Conversation (inline) | Glance (browse) | Memory informs conversation. AURA cites memories inline. Browsing is secondary. |
| Notes / Vault | Conversation (commands) | Glance (browse) | Users should create and retrieve notes through conversation. Browsing is secondary. |
| File list | Conversation (commands) | Glance (browse) | "Show my desktop files" returns an inline list. Browsing is for exploration. |
| File open | Conversation | — | "Open that file" — a command. |
| Stats (CPU/RAM/disk/battery) | Glance (default view) | Ambient (compact footer) | Stats are for monitoring. They belong in a glance that the user can check quickly. The ambient footer provides glanceable health. |
| Process list | Glance | Conversation (kill commands) | Browse in a glance. Kill through conversation. |
| Process kill | Conversation | — | A conversation command with confirmation. |
| Volume | Conversation | Glance (media card) | "Set volume to 50%" is the primary interaction. The media glance shows current level. |
| Mute | Conversation | Glance | Toggle through conversation or glance. |
| Now Playing | Ambient | Glance (media card) | Shown in the ambient area automatically when media is detected. |
| Media control | Conversation | Glance | Next/prev/play-pause through conversation or the glance card. |
| App launch | Conversation | — | "Launch Spotify." A command, not a browse operation. |
| System lock | Conversation (command) | — | A command with single-tap action. |
| System sleep | Conversation (command) | — | A command. |
| System shutdown | Conversation (command) | Glance (with confirmation) | A destructive command with confirmation. Also accessible in the stats glance. |
| System restart | Conversation (command) | Glance (with confirmation) | Same as shutdown. |
| Cancel shutdown | Conversation (command) | — | A command. |
| Clipboard copy | Conversation (command) | — | "Copy this to my desktop." A command. |
| Clipboard paste | Conversation (command) | — | "Paste from my desktop." A command. |
| Weather | Ambient | Conversation | Shown in the ambient area when relevant. Can be asked directly. |
| News | Ambient (headline) | Glance (full) | One headline shown in ambient. Full list in a glance card. |
| Web search | Conversation | — | "Search the web for..." — inherently conversational. |
| Daily briefing | Conversation (surfaced) | — | AURA presents the briefing proactively. It is a conversation, not a document. |
| Voice options | Conversation | Settings | "Switch to a different voice" — conversational. Voice list in settings as reference. |
| Discord friends | Conversation | — | "Who's online on Discord?" — conversational. |
| Input (type/key/hotkey) | Conversation | — | "Type 'hello' on my desktop." A command. |
| STT (speech-to-text) | Conversation | — | Voice input is part of the conversation interface. |
| Connection management | Settings | — | Rarely needed. Belongs in the back-of-house settings panel. |
| API key / URL | Settings | — | Configuration, not interaction. Belongs in settings. |
| Security / PIN | Settings | — | Security configuration. Settings. |

### Grouping by User Intent

When we group features by what the user is actually trying to do, three clusters emerge:

#### Cluster A: "What's happening?"
- Stats (CPU, RAM, disk, battery, uptime)
- Process list
- Now Playing
- Weather
- News headlines
- Connection status

**Surface:** Ambience + Glance Tray (stats card)
**User need:** I want to check on things without interrupting my flow.

#### Cluster B: "Do something on my desktop."
- Volume / mute
- Media control
- App launch
- System power (lock, sleep, shutdown, restart)
- Clipboard (copy, paste)
- Input (type, key, hotkey)
- File open
- Process kill

**Surface:** Conversation
**User need:** I want my desktop to do something. I tell AURA.

#### Cluster C: "What do you know?"
- Memory (recall, store, update, delete)
- Notes / Vault (create, read, delete)
- File list (browsing)
- Web search

**Surface:** Conversation + Glance Tray + Inline Citations
**User need:** I want to access information AURA has stored or can find.

---

## 5. First-Launch Journey

### Phase 0: Install
The user installs from the Play Store or side loads the APK. No account creation. No email. No sign-up. The first tap opens the app.

### Phase 1: Boot (2 seconds)
The boot sequence plays. The status lines are not generic — they are checking real conditions:
- "Neural Link" → checking if Tailscale is running
- "System Cores" → detecting device capabilities
- "HUD Interface" → verifying local assets

If boot fails at any point, the failed step is highlighted with a retry option. No generic error.

### Phase 2: Connection (first launch)
The user sees the Orb with a pulsing "awaiting connection" state. Below it, a single question:

> **"What's your desktop's Tailscale IP?"**

No form. No URL field. No API key. The user types their Tailscale IP naturally. AURA detects this is an IP and:
1. Tests the connection silently
2. If it fails: "Can't reach that address. Make sure AURA is running on your desktop and both devices are on Tailscale."
3. If it succeeds: "Found your desktop. One more thing — let me authenticate."

The API key is auto-detected from the backend's default. The user never needs to enter it unless they changed it on the backend. In that case, AURA prompts: "Your desktop requires a custom API key. It's in your .env.local file."

**Key principle:** The setup conversation feels like a conversation, not a configuration form. The user types free-form responses. AURA interprets them.

### Phase 3: First Conversation
After connection, AURA says:

> **"Connected to AURA v2.0. Your desktop is healthy — 12% CPU, 6.2GB RAM free.**
> 
> **I'm here to help you monitor, control, and interact with your desktop remotely.**
> 
> **Try asking me something like:**
> • "What's running on my desktop?"
> • "Open Spotify"
> • "Remember that I'm working on the Jones project"
> • "Show me my system stats"
> 
> **Or just tap the mic and speak."**

This is the first conversation. It establishes the mental model: AURA is a conversational interface to your desktop.

### Phase 4: First Glance
After the first conversation, AURA shows a subtle hint:

> *Swipe down from the orb to see your system stats at a glance*

This introduces the glance mechanic. The user tries it and discovers they can check stats without leaving conversation.

### Phase 5: First Week (Discovery)

**Day 1:** AURA focuses on conversation. Suggests simple commands ("try asking me to open something").
**Day 2:** Introduces memory. When the user says something worth remembering, AURA asks: "Should I remember that?"
**Day 3:** Introduces notes. "You can ask me to save notes to your vault. Try: 'save a note about the API design.'"
**Day 4:** Introduces proactivity. "I noticed your CPU was high last night. Want me to alert you next time?" 
**Day 5+:** User settles into patterns. AURA adapts to their usage.

### Phase 6: Power User

The user has internalized the mental model. They:
- Use conversation for everything
- Glance at stats automatically (muscle memory)
- Use the Context Panel to see what AURA is tracking
- Rarely visit Settings
- Receive proactive suggestions that are relevant because AURA has learned their patterns

### Phase 7: Re-engagement

If the user has been away for more than 48 hours:
- First reconnect: "Welcome back. You missed 4 notable events while you were away."
- After 7 days: "It's been a week. Your desktop has installed 3 updates since your last visit."
- After 30 days: Backend connection may have changed. Prompt to re-verify connection.

---

## 6. Contextual Intelligence

### What It Means

Contextual intelligence means the app surfaces the right feature at the right time without the user asking. It is not random suggestions. It is the system understanding the user's current state and offering relevant capabilities.

### Trigger → Surface Mapping

#### Desktop State Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| CPU > 80% | Ambient (stats area) | Stats card glows amber. AURA says nothing unless asked. |
| CPU > 95% | Proactive notification | "Your CPU is at 96%. Want me to check what's running?" → leads to process glance |
| RAM < 20% free | Ambient | RAM bar shifts color. Subtle. |
| Battery < 20% (desktop) | Proactive card | "Your desktop battery is low (14%). Should I put it to sleep?" |
| Battery plugged/unplugged | Ambient | Brief icon change. No interruption. |
| New process launched (user-defined) | Context Panel | Appears in "Recent Activity" section. |
| Process crashed | Proactive toast | "Spotify stopped responding. Restart it?" |
| Large download detected | Context Panel | Shows in ambient activity. |

#### Media Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| Music starts playing | Ambient | Now Playing card appears automatically in the ambient area. |
| Track changes | Ambient | Card updates without animation (no visual disruption). |
| Playback pauses > 5 min | Ambient | Card fades to dim state. |
| Playback stops | Ambient | Card disappears after 30 seconds. |
| Volume changes externally | Ambient | Volume bar in media card updates. |

#### Memory Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| Conversation topic matches memory | Inline citation | Related memory appears as a purple-tinted citation at the bottom of AURA's response. |
| User asks "remember..." | Conversation | AURA confirms and stores. Shows a brief confirmation. |
| User asks about something stored | Conversation | AURA retrieves and cites. Shows memory source. |
| Memory count milestone (50, 100, 500) | Proactive (non-intrusive) | "You have 50 memories. Want to review or archive?" |
| Redundant memory detected | Conversation | "You already have a similar memory: [preview]. Should I replace it or keep both?" |

#### Clipboard Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| Text copied on desktop | Context Panel | "Copied to desktop clipboard: [preview]" |
| User copies text on phone | Conversation prompt | "Copy this to your desktop clipboard?" (appears near the selected text) |
| Clipboard has stale content (> 1 hr) | None | Ignored. No action. |

#### Time-Based Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| First open of day | Proactive briefing | "Good morning. CPU 23%, 2 notes updated since yesterday, 1 new memory." |
| First open of week | Proactive briefing (extended) | Weekly summary with stats, notable events, memory count. |
| Late-night session (> 11pm) | Ambient | Interface dims slightly. AURA responses use warmer tone. |
| User inactive > 30s while on chat | Ambient | Orb returns to idle. No proactive action. |
| User inactive > 2 min app-wide | Ambient | Screen dims to reduced-glow state. On return, brief reconnect animation. |

#### Session-Based Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| User asks 3+ stat questions in a row | Suggestion | "I notice you're checking stats frequently. Want me to show them in the quick glance?" |
| User asks 5+ file operations in a row | Suggestion | "You're working with files a lot. The file glance might be faster — swipe down from the orb." |
| User repeats same command | Suggestion | "I noticed you've opened Spotify three times today. Want me to add a one-tap shortcut?" |
| User corrects AURA's memory | Adaptation | AURA adjusts its understanding. Confirms: "Updated. I'll remember that." |

#### Connection Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| Connection lost | Full-screen transition | Orb transitions to disconnected state. Ambient content freezes (last known state remains, greyed out). Toast: "Connection lost. AURA will reconnect automatically." |
| Connection regained | Recovery animation | Orb transitions through amber → green. Ambient content refreshes. Brief toast: "Reconnected." |
| Reconnect fails > 3 attempts | Guidance | "Can't reach your desktop. Check that AURA is running and both devices are on Tailscale." |

#### Setup / Configuration Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| First-time user completes setup | Conversation | AURA sends its first message (see Phase 3). |
| User changes backend URL | Settings + confirmation | Settings updates. AURA confirms: "Connected to new backend. Everything OK?" |
| Backend version mismatch | Warning in settings | "Your backend is running v1.5 but this app expects v2.0. Some features may not work." |
| App updated (new version) | Brief onboarding | "AURA Mobile updated to 2.1. Here's what's new: [2-3 bullet points]." |

#### Environmental Triggers

| Trigger | Surface | AURA Behavior |
|---------|---------|---------------|
| Weather changes significantly | Ambient | Weather card updates. No notification. |
| Severe weather alert | Proactive card | "Weather alert: heavy rain in your area for the next 2 hours." |
| News contains relevant topic | Ambient headline | Headline updates. If user has asked about this topic before, subtle highlight. |
| User's location changes (future) | Ambient | Weather updates. Timezone-adjusted suggestions. |

---

## 7. Ambient Experiences

### What "Ambient" Means

Ambient content is information that exists on the periphery of the user's attention. It is always present but never demanding. The user can look at it or ignore it freely.

### Ambient Zones

**Zone 1: The Orb (always visible)**
The Orb is the most prominent ambient element. Its state communicates:
- Connected/disconnected (color)
- Active/idle (pulse speed)
- Thinking/speaking (intensity)

The user should be able to understand the daemon's state from across the room.

**Zone 2: The Connection Indicator (persistent, minimal)**
A subtle indicator (dot + latency) at the top edge of the screen. It is always present but never draws attention during normal use. It only becomes noticeable when it changes (connection lost, reconnected).

**Zone 3: The Ambient Footer (visible on home conversation)**
A compact strip at the bottom of the conversation screen showing:
- CPU usage (compact bar)
- RAM usage (compact bar)
- Now Playing (if active)
- Connection status

This replaces the need for a stats screen. The user glances at the footer, absorbs the information, and continues typing.

**Zone 4: The Context Panel (hidden, accessible via gesture)**
The right-edge panel shows what AURA is currently aware of. This is dynamic ambient information — it changes as the daemon's state changes. The user checks it when they want to know "what is AURA thinking about right now?"

### Behavior While Idle

When the user has not interacted for 30 seconds:
- Orb returns to idle state (slow breathing)
- Ambient footer remains visible but dims slightly
- No proactive actions
- Heartbeat ping to backend every 15 seconds to maintain connection
- If the user returns (touches screen), content brightens, Orb responds

### Behavior While Disconnected

- Orb shows disconnected state (dim red, minimal pulse)
- Ambient content freezes — last known stats remain visible but greyed out
- Chat is disabled. A placeholder message: "Reconnecting..." with a manual "Retry" option.
- If reconnection succeeds, the screen unfreezes naturally (see reconnection sequence)
- If the user wants to leave the app, they can. The background reconnect timer continues.

### Behavior While Reconnecting

- Orb transitions from red → amber → green (600ms sequence)
- Frozen ambient content gradually unfreezes (stats refresh, now playing reloads)
- Chat placeholder message transitions: "Found your desktop" → "Connected" → disappears
- Any commands the user typed while disconnected are replayed
- AURA sends a brief reconnection summary if anything notable changed

### Behavior While Syncing

When AURA is catching up after reconnection (loading memory, refreshing state):
- Orb shows a brief "syncing" state (medium pulse, cyan tint)
- Content appears progressively — cached data first, fresh data as it arrives
- Chat is available immediately (no need to wait for sync)
- A background indicator shows sync progress (compact, no blocking)

### Behavior While Executing Commands

For command execution (launch app, shutdown, file operation):
- Orb enters executing state (single sharp pulse, sustained glow)
- A subtle inline confirmation appears in chat: "Launching Spotify..."
- When complete: "Spotify is now running on your desktop."
- For long-running operations (> 5s): intermediate updates "Still waiting for Spotify..."

### Behavior While Loading Content

For glance content loading:
- Skeleton loaders matching the glance card layout
- Each section loads independently — stats card loads first (smallest payload), memory loads last (vector search)
- No blocking overlays. The user can dismiss the glance before it finishes loading. Loading continues in background.

### Behavior on Error

Generic error handling:
- Inline in conversation: the response card shows an error state (subtle red tint, error message, retry button)
- No full-screen errors. No modals. The conversation thread is never interrupted.
- For glance errors: the glance card shows an error state. The rest of the tray remains functional.

---

## 8. Future Scalability

### Architecture Stress Test

Imagine AURA gains 10x more capabilities. The current architecture (drawer + screens) would collapse under the weight — 30+ menu items, scrolling navigation, buried features.

The glance model, by contrast, scales because it does not rely on navigation for discoverability. Features are surfaced contextually, not listed hierarchically.

### Where Future Features Fit

| Future Feature | Surface | Why This Surface |
|---------------|---------|-----------------|
| Camera feed from desktop | Ambient / Glance | Ambient when motion detected. Glance for live view. |
| Desktop microphone monitoring | Context Panel | Appears in context when noise/speech detected. |
| File search (full-text) | Conversation | "Find the file that mentions the budget." |
| Multi-desktop support | Settings + Conversation | Settings for adding desktops. Conversation for switching: "Switch to my work desktop." |
| Desktop notifications relay | Context Panel | Appears in context panel. User can dismiss or act on them. |
| Scheduled commands | Conversation | "Remind me to shut down at midnight." AURA handles scheduling. |
| AI image generation | Conversation | "Generate an icon for my project." Returns inline image card. |
| Desktop screen recording | Glance | A glance card with live thumbnail. Start/stop via conversation. |
| Smart home control | Conversation | "Turn off the lights." Inline confirmation. |
| Calendar integration | Conversation + Ambient | "What's my next meeting?" in conversation. Next meeting shown in ambient. |
| Email summary | Proactive | AURA offers: "You have 12 unread emails. Want a summary?" |
| Custom automation scripts | Conversation + Glance | "Run my weekly backup script." Glance for managing saved scripts. |
| Multiple AI personas | Conversation | "Talk to my coding assistant persona." AURA switches context. |
| Desktop notifications relay | Context Panel | Surface notifications from desktop apps. |
| Collaborative features | Conversation | "Share this memory with my partner's AURA." |
| Offline cache | None (transparent) | Content loads from cache immediately, refreshes in background. |

### Avoiding Menu Bloat

The glance model has a natural defense against bloat: glance cards compete for space in the tray. As more glances are added, default visibility decreases. Glances should be:

1. **Sorted by usage frequency.** The glance tray adapts. Frequently used glances migrate to the front. Rarely used ones fall to the back.
2. **Eliminable.** Users can remove glances they never use. A "customize tray" option in settings.
3. **Groupable.** Related glances (all desktop health: stats, processes, disk) can be collapsed under a single parent card.
4. **Contextually promoted.** A glance for "desktop camera" only appears when motion is detected. It is not in the tray by default.

### The 7-Glance Ceiling

The Glance Tray should never hold more than 7 items. If new glances push the count beyond 7, an older glance must be either:
- Made context-only (appears only when triggered)
- Merged into an existing glance
- Removed

This constraint forces thoughtful design. Not every feature deserves a glance. Features that are purely conversational (app launch, volume, system power) never become glances.

### Conversation as the Overflow Valve

Any future capability that does not fit as a glance or ambient element belongs in conversation. The conversation interface has no upper bound on capability. It is text. Text scales infinitely.

This is the ultimate safety valve: if a feature is too niche for a glance and too rare for ambient, it lives as a conversation command. The user discovers it through suggestion, through exploration, or through need.

### The Three-Layer Scale

```
Layer 1: Conversation (infinite capacity)
  - All commands
  - All queries
  - All confirmations
  - All responses

Layer 2: Glances (max 7, usage-ranked)
  - Quick browsing
  - Data monitoring
  - Status checks

Layer 3: Ambient (automatic, contextual)
  - System state
  - Media state
  - Connection state
  - Relevant notifications
```

Future features fill from Layer 1 first (conversation). If usage data shows a feature is accessed frequently as a conversation command, it graduates to a glance. If a glance becomes essential enough to show without being requested, it becomes an ambient element.

This creates a natural feature lifecycle:

```
Conversation command
  → Frequent enough → Glance card
    → Always relevant → Ambient element
      → No longer needed → Deprecated
```

---

*This document is the product architecture specification. It supersedes all previous navigation and screen structure decisions. Implementation must conform to the glance model described here.*
