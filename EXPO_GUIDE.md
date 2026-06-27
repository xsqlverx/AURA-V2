# Expo SDK 56 — Aura's Mobile Companion Guide

> **Build Aura's mobile surface. One codebase. iOS + Android + Web.**

Aura's desktop HUD runs Next.js. Her mobile companion runs **Expo SDK 56** — the official framework for React Native. Same React 19, same TypeScript, same Zustand stores. Different render target.

This guide covers everything you need to know to build Aura's mobile UI with Expo SDK 56.

---

## 1. What Is Expo?

Expo is a framework on top of React Native that removes the native tooling headache. You write React/TypeScript, Expo handles the Xcode/Android Studio/Gradle/Metro bundler boilerplate.

**Workflows:**

| Workflow | What it is | When to use |
|----------|-----------|-------------|
| **Expo Go** | Sandboxed runtime app on your phone. Scan a QR code → instant dev. | Prototyping, quick iteration. Limited native modules. |
| **Development Build** | A custom native build you create once, then iterate JS only. | Real app development. Full native API access. Use this for Aura. |
| **Production Build** | EAS Build compiles final `.ipa` / `.aab` for stores. | Shipping to TestFlight / Play Store. |

**SDK 56 stack (what's in your `package.json`):**

```
expo          ~56.0.12     →  Core Expo runtime
react         19.2.3       →  React (same as Aura's desktop)
react-native  0.85.3       →  Native renderer
expo-router   ~56.2.11     →  File-based router (Aura's mobile navigation)
```

---

## 2. Getting Started

```bash
npx create-expo-app aura-mobile --template tabs
cd aura-mobile
npx expo start
```

This scaffolds an Expo Router + tab navigation template. Aura's widgets (Chat, Memory, Discord, Voice, Stats) map naturally to tabs.

**Project skeleton:**

```
aura-mobile/
├── app/                    ← File-based routes (Expo Router)
│   ├── _layout.tsx         ← Root layout (Stack navigator)
│   ├── (tabs)/             ← Tab group for Aura's widgets
│   │   ├── _layout.tsx     ← Tab bar config
│   │   ├── index.tsx       ← Chat widget (home tab)
│   │   ├── memory.tsx      ← Memory widget
│   │   ├── discord.tsx     ← Discord widget
│   │   ├── voice.tsx       ← Voice & Music widget
│   │   └── stats.tsx       ← System stats widget
│   ├── chat/[id].tsx       ← Dynamic route for individual conversations
│   └── settings/
│       └── index.tsx       ← Settings (API keys, preferences)
├── src/
│   ├── stores/             ← Zustand stores (ported from desktop)
│   ├── api/                ← REST + WebSocket client for Aura's backend
│   ├── components/         ← Reusable UI components (AuraOrb, WidgetCard, etc.)
│   ├── types/              ← TypeScript types (shared with desktop?)
│   └── hooks/              ← Custom hooks (useAuraWebSocket, useAuraOrbState)
├── assets/
├── app.json                ← Expo config (Aura's metadata, plugins, theme)
├── tsconfig.json
└── package.json
```

---

## 3. app.json — Aura's Config Hub

This is your `app.json`. It controls everything from Aura's display name to deep link schemes to native plugins.

```jsonc
{
  "expo": {
    "name": "Aura",
    "slug": "aura-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/aura-icon.png",
    "userInterfaceStyle": "dark",          // Aura is always dark mode
    "scheme": "aura",                       // Deep link: aura://chat/123
    "backgroundColor": "#0D1117",           // Aura's deep navy
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.aura.mobile",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Aura needs the mic to hear your voice commands.",
        "NSSpeechRecognitionUsageDescription": "Aura transcribes your speech locally."
      }
    },
    "android": {
      "package": "com.aura.mobile",
      "adaptiveIcon": {
        "backgroundColor": "#0D1117",
        "foregroundImage": "./assets/aura-adaptive-foreground.png"
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",       // Store Aura's API keys securely
      "expo-notifications",       // Aura's proactive push nudges
      "expo-av",                  // Voice recording + TTS playback
      [
        "expo-location",
        { "locationAlwaysAndWhenInUsePermission": "Aura uses your location for context-aware suggestions." }
      ]
    ]
  }
}
```

---

## 4. Expo Router — Aura's Mobile Navigation

Expo Router is **file-based**, just like Next.js. Every file in `app/` becomes a route. This replaces `next/router` on mobile.

### Layouts (Analogous to Next.js `layout.tsx`)

```tsx
// app/_layout.tsx — Root layout, wraps everything
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D1117' },
          headerTintColor: '#58A6FF',        // Aura's cyan accent
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#0D1117' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat/[id]"
          options={{ title: 'Conversation', presentation: 'card' }}
        />
        <Stack.Screen
          name="settings/index"
          options={{ title: 'Settings', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
```

### Tabs — Aura's Widget Switcher

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { AuraTabIcon } from '../../src/components/AuraTabIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1117',
          borderTopColor: '#21262D',
        },
        tabBarActiveTintColor: '#58A6FF',
        tabBarInactiveTintColor: '#484F58',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Chat', tabBarIcon: ({ color }) => <AuraTabIcon name="chat" color={color} /> }}
      />
      <Tabs.Screen
        name="memory"
        options={{ title: 'Memory', tabBarIcon: ({ color }) => <AuraTabIcon name="memory" color={color} /> }}
      />
      <Tabs.Screen
        name="discord"
        options={{ title: 'Discord', tabBarIcon: ({ color }) => <AuraTabIcon name="discord" color={color} /> }}
      />
      <Tabs.Screen
        name="voice"
        options={{ title: 'Voice', tabBarIcon: ({ color }) => <AuraTabIcon name="voice" color={color} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarIcon: ({ color }) => <AuraTabIcon name="stats" color={color} /> }}
      />
    </Tabs>
  );
}
```

### Dynamic Routes — Aura's Conversations

```
app/chat/[id].tsx  →  aura://chat/abc123
```

```tsx
// app/chat/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function ChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Fetch chat history from Aura's backend via REST
  return <ChatView conversationId={id} />;
}
```

### Key Router Hooks

| Hook | What it does | Aura use case |
|------|-------------|---------------|
| `useRouter()` | Imperative navigation — `push`, `replace`, `back`, `dismiss` | "Hey Aura, open settings" → `router.push('/settings')` |
| `useLocalSearchParams()` | URL params for the **focused** route | `chat/[id].tsx` → `const { id } = useLocalSearchParams()` |
| `useGlobalSearchParams()` | URL params regardless of focus | Analytics / background ops |
| `useFocusEffect(callback)` | Runs when screen gains focus (with cleanup on blur) | Refresh chat list when Aura's user returns to the tab |
| `usePathname()` | Current pathname | Highlight active widget |
| `useSegments()` | Array of path segments | Deep link parsing |
| `router.back()` | Go back in history | Dismiss modals |
| `router.dismissAll()` | Pop to root of the stack | "Go home" gesture |

### Deep Linking — Desktop ↔ Mobile Handoff

Expo Router handles deep links automatically via the `"scheme"` in `app.json`.

```
aura://chat/abc123          →  Opens app/navigates to ChatDetail
aura://memory               →  Opens Memory tab
aura://settings             →  Opens Settings modal
```

Aura's desktop HUD can trigger these links via:
- `expo-linking` on desktop → opens Aura's mobile app
- Universal links (iOS) / App Links (Android) for web-to-app

---

## 5. Mobile UI — Aura's Widgets, Natively

### Core React Native Components

Every Aura widget is built from these primitives:

| Component | Purpose | Aura Example |
|-----------|---------|--------------|
| `View` | Container, flexbox layout | Widget cards, row layouts |
| `Text` | Text display | Aura's responses, labels |
| `TextInput` | Text input | Chat message field, API key entry |
| `Pressable` | Touch handler with press states | Send button, settings toggles |
| `FlatList` | Performant scrollable list | Chat messages, memory entries, Discord messages |
| `ScrollView` | Scrollable content | Settings page, widget content |
| `SafeAreaView` | Respects notch + status bar | Root container for every screen |
| `Alert` | Native dialog | Confirmation prompts, error alerts |
| `ActivityIndicator` | Loading spinner | While Aura "thinks" |
| `Image` | Display images | Aura's avatar, memory attachments |

### Styling — Aura's Dark Theme

React Native uses `StyleSheet.create()` — no CSS, no Tailwind. You define styles as JavaScript objects.

```tsx
import { StyleSheet } from 'react-native';

export const auraTheme = StyleSheet.create({
  // Backgrounds
  bgPrimary:   { backgroundColor: '#0D1117' },   // Deep navy (Aura's base)
  bgSecondary: { backgroundColor: '#161B22' },   // Card background
  bgTertiary:  { backgroundColor: '#21262D' },   // Input fields, dividers

  // Text
  textPrimary:   { color: '#F0F6FC' },           // Primary text
  textSecondary: { color: '#8B949E' },           // Secondary / muted
  textAccent:    { color: '#58A6FF' },           // Aura's cyan accent

  // Accent colors
  accentCyan:   { color: '#58A6FF' },
  accentGreen:  { color: '#3FB950' },
  accentOrange: { color: '#D29922' },
  accentRed:    { color: '#F85149' },
  accentPurple: { color: '#BC8CFF' },

  // Layout
  flexCenter: { alignItems: 'center', justifyContent: 'center' },
  row:        { flexDirection: 'row', alignItems: 'center' },
  gap8:       { gap: 8 },
  gap16:      { gap: 16 },
  p16:        { padding: 16 },
  rounded:    { borderRadius: 12 },

  // Aura Orb states
  orbIdle:     { backgroundColor: '#3FB950', shadowColor: '#3FB950' },
  orbListening:{ backgroundColor: '#58A6FF', shadowColor: '#58A6FF' },
  orbThinking: { backgroundColor: '#BC8CFF', shadowColor: '#BC8CFF' },
  orbSpeaking: { backgroundColor: '#D29922', shadowColor: '#D29922' },
});
```

### Aura's Chat Widget — Full Example

```tsx
// app/(tabs)/index.tsx — Chat widget (Aura's primary interface)
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { auraTheme } from '../../src/theme';

type Message = {
  id: string;
  role: 'user' | 'aura';
  content: string;
  timestamp: number;
};

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    // Optimistic update — show user's message immediately
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Send to Aura's backend via REST
    const response = await fetch('http://AURA_BACKEND_IP:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await response.json();

    const auraMsg: Message = {
      id: data.id,
      role: 'aura',
      content: data.response,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, auraMsg]);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.role === 'user' ? styles.userBubble : styles.auraBubble,
    ]}>
      {item.role === 'aura' && (
        <Text style={styles.auraLabel}>Aura</Text>
      )}
      <Text style={item.role === 'user' ? styles.userText : styles.auraText}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aura is listening</Text>
              <Text style={styles.emptySubtext}>
                Type a message or tap the mic to speak
              </Text>
            </View>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message Aura..."
            placeholderTextColor="#484F58"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.sendBtnPressed,
              !input.trim() && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1F6FEB',
    borderBottomRightRadius: 4,
  },
  auraBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#161B22',
    borderBottomLeftRadius: 4,
  },
  auraLabel: {
    color: '#58A6FF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  userText: {
    color: '#F0F6FC',
    fontSize: 15,
  },
  auraText: {
    color: '#F0F6FC',
    fontSize: 15,
    lineHeight: 22,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyTitle: {
    color: '#8B949E',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#484F58',
    fontSize: 14,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262D',
    backgroundColor: '#0D1117',
  },
  input: {
    flex: 1,
    backgroundColor: '#161B22',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F0F6FC',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#58A6FF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendBtnPressed: { opacity: 0.7 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: {
    color: '#F0F6FC',
    fontSize: 15,
    fontWeight: '600',
  },
});
```

### Expo UI — Universal Native Components

SDK 56 introduces **Expo UI** (`@expo/ui`) — native primitives that render as Jetpack Compose on Android and SwiftUI on iOS. These are platform-native, not JS-rendered.

```bash
npx expo install @expo/ui
```

**Universal components** (same API on both platforms):

```tsx
import { Button, Switch, Text, TextInput, List } from '@expo/ui/universal';

// Aura's settings toggle
<Switch value={isListening} onValueChange={setIsListening} />

// Aura's action button
<Button variant="filled" onPress={handleSend}>
  Send to Aura
</Button>

// Aura's styled text
<Text variant="title" color="#58A6FF">Aura Memory</Text>

// Aura's settings list
<List>
  <List.Item title="API Keys" onPress={() => router.push('/settings')} />
  <List.Item title="Voice" subtitle="Configure TTS" />
  <List.Item title="About Aura" />
</List>
```

**Platform-native components:**

| Platform | Import | Components |
|----------|--------|------------|
| Android | `@expo/ui/jetpack-compose` | `Button`, `Card`, `LazyColumn`, `FloatingActionButton`, `NavigationBar`, `Chip`, `Switch`, `Slider`, `TextField`, `SearchBar`, `PullToRefreshBox`, `ModalBottomSheet`, `Badge` |
| iOS | `@expo/ui/swift-ui` | `Button`, `List`, `Toggle`, `Slider`, `TextField`, `DatePicker`, `TabView`, `BottomSheet`, `ProgressView`, `Label`, `Picker`, `SwipeActions` |
| Both | `@expo/ui/universal` | `Button`, `Switch`, `Text`, `TextInput`, `Slider`, `Column`, `Row`, `Spacer`, `Icon`, `BottomSheet`, `List`, `Collapsible` |

Expo UI is **available in Expo Go** as of SDK 56 — no dev build needed for prototyping.

### Icon Strategy

For tab bar icons and UI elements:

```tsx
// Option 1: Expo Router's built-in Icon (SDK 56)
import { Icon } from 'expo-router';
<Icon src={{ uri: 'chat' }} />   // SF Symbol on iOS, Material Symbol on Android

// Option 2: @expo/vector-icons (bundled with Expo)
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="chatbubble-ellipses" size={24} color="#58A6FF" />

// Option 3: Expo UI Universal Icon
import { Icon } from '@expo/ui/universal';
<Icon name="chat_bubble" />
```

---

## 6. Real-Time — Aura's WebSocket on Mobile

Aura's desktop HUD uses WebSocket for real-time orb state, speech status, and incoming messages. The mobile companion does the same.

```tsx
// src/hooks/useAuraWebSocket.ts
import { useEffect, useRef, useState } from 'react';

type AuraState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function useAuraWebSocket(url: string) {
  const [auraState, setAuraState] = useState<AuraState>('idle');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => console.log('[Aura WS] Connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'state') {
        setAuraState(data.state);  // 'idle' | 'listening' | 'thinking' | 'speaking'
      }

      if (data.type === 'transcript') {
        setLastMessage(data.text);  // Real-time speech transcript
      }
    };
    ws.onclose = () => console.log('[Aura WS] Disconnected');

    return () => ws.close();
  }, [url]);

  const send = (data: object) => {
    wsRef.current?.send(JSON.stringify(data));
  };

  return { auraState, lastMessage, send };
}
```

```tsx
// AuraOrb — visual state indicator (port from desktop HUD)
function AuraOrb({ state }: { state: AuraState }) {
  const orbColors = {
    idle:     '#3FB950',
    listening:'#58A6FF',
    thinking: '#BC8CFF',
    speaking: '#D29922',
  };

  return (
    <View style={[styles.orb, { backgroundColor: orbColors[state] }]}>
      <View style={[styles.orbPulse, { borderColor: orbColors[state] }]} />
    </View>
  );
}
```

---

## 7. Voice — Aura's Pipeline on Mobile

Aura's desktop uses `faster-whisper` + `openwakeword` locally. On mobile, you use Expo's audio APIs and send raw audio to Aura's backend.

```bash
npx expo install expo-av expo-speech
```

### Recording (Push-to-Talk)

```tsx
import { Audio } from 'expo-av';

const [recording, setRecording] = useState<Audio.Recording | null>(null);

async function startRecording() {
  await Audio.requestPermissionsAsync();
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  setRecording(recording);
}

async function stopRecording() {
  await recording?.stopAndUnloadAsync();
  const uri = recording?.getURI();

  // Send to Aura's backend for STT processing
  const formData = new FormData();
  formData.append('audio', { uri, type: 'audio/m4a', name: 'aura-mic' } as any);
  const response = await fetch('http://AURA_BACKEND:8000/stt', {
    method: 'POST',
    body: formData,
  });
  const { text } = await response.json();
  // text is now Aura's transcription → send to chat
}
```

### TTS Playback (Aura Speaks)

```tsx
import { Audio } from 'expo-av';

async function playAuraResponse(text: string) {
  // Option 1: Aura's backend generates TTS audio
  const response = await fetch('http://AURA_BACKEND:8000/tts', {
    method: 'POST',
    body: JSON.stringify({ text, voice: 'aura-default' }),
  });
  const { audioUrl } = await response.json();
  const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
  await sound.playAsync();

  // Option 2: Device-native TTS (fallback)
  // import * as Speech from 'expo-speech';
  // Speech.speak(text, { voice: 'com.apple.ttsbundle.siri_female_en-US_compact' });
}
```

---

## 8. Connecting to Aura's Backend

### REST API Client

```tsx
// src/api/aura.ts
const BASE_URL = 'http://AURA_BACKEND_IP:8000';  // Configurable

export const auraApi = {
  chat:      (msg: string)           => fetch(`${BASE_URL}/chat`, { method: 'POST', body: JSON.stringify({ message: msg }) }).then(r => r.json()),
  memory:    ()                      => fetch(`${BASE_URL}/memories`).then(r => r.json()),
  discord:   ()                      => fetch(`${BASE_URL}/discord/messages`).then(r => r.json()),
  stats:     ()                      => fetch(`${BASE_URL}/system/stats`).then(r => r.json()),
  voice:     (audio: FormData)       => fetch(`${BASE_URL}/stt`, { method: 'POST', body: audio }).then(r => r.json()),
  brief:     ()                      => fetch(`${BASE_URL}/briefing`).then(r => r.json()),
  tools:     (cmd: string)           => fetch(`${BASE_URL}/tools/execute`, { method: 'POST', body: JSON.stringify({ command: cmd }) }).then(r => r.json()),
  apiKey:    (provider: string)      => fetch(`${BASE_URL}/config/keys/${provider}`).then(r => r.json()),
};
```

### TanStack React Query (Same as Desktop)

```tsx
// You can port Aura's desktop TanStack Query usage directly
import { useQuery } from '@tanstack/react-query';

function useAuraMemory() {
  return useQuery({
    queryKey: ['aura', 'memory'],
    queryFn: () => auraApi.memory(),
    refetchInterval: 30_000,  // Poll every 30s like desktop
  });
}
```

### Secure Storage for Keys

Aura's API keys (OpenRouter, Groq) should never be in plaintext.

```tsx
import * as SecureStore from 'expo-secure-store';

// Save
await SecureStore.setItemAsync('openrouter_key', 'sk-or-...');

// Retrieve
const key = await SecureStore.getItemAsync('openrouter_key');

// Delete
await SecureStore.deleteItemAsync('openrouter_key');
```

---

## 9. Notifications — Aura's Proactive Engine on Mobile

When Aura's desktop background agent detects something important (CPU spike, scheduled reminder, Discord DM from a priority contact), it pushes a notification to the mobile companion.

```bash
npx expo install expo-notifications
```

```tsx
import * as Notifications from 'expo-notifications';

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Schedule a local notification (triggered by Aura's backend push)
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Aura',
    body: '⚠️ CPU at 92%. Should I run a cleanup?',
    data: { screen: '/stats', action: 'cleanup' },
  },
  trigger: null,  // Immediate
});

// Handle tap → navigate to relevant screen
Notifications.addNotificationResponseReceivedListener((response) => {
  const { screen } = response.notification.request.content.data;
  router.push(screen);
});
```

---

## 10. Device APIs Aura Uses

| API | Package | Aura Use Case |
|-----|---------|---------------|
| **Haptics** | `expo-haptics` | Buzz on mic press, message send confirmation |
| **Local Auth** | `expo-local-authentication` | Biometric lock for Aura's settings |
| **Sensors** | `expo-sensors` | Gyroscope drives AuraOrb parallax animation |
| **Location** | `expo-location` | Aura's context-aware suggestions ("you're at work") |
| **Battery** | `expo-battery` | Aura's proactive battery alerts |
| **Clipboard** | `expo-clipboard` | Aura reads clipboard for context |
| **Linking** | `expo-linking` | Deep link from desktop → open Aura mobile |
| **FileSystem** | `expo-file-system` | Download memories / attachments for offline |
| **BackgroundFetch** | `expo-background-fetch` | Aura's background proactive checks on mobile |

---

## 11. Expo UI — Platform-Native Widgets (Advanced)

For Aura's more complex widgets, you can use **platform-specific native UI** via Expo UI.

### Android — Jetpack Compose (Aura's Stats Widget)

```tsx
import { Column, Text, Row, Spacer, Card } from '@expo/ui/jetpack-compose';

export default function StatsWidget() {
  return (
    <Column padding={16} gap={16}>
      <Card>
        <Row gap={16}>
          <Column>
            <Text variant="label">CPU</Text>
            <Text variant="headline" color="#3FB950">32%</Text>
          </Column>
          <Spacer />
          <Column>
            <Text variant="label">RAM</Text>
            <Text variant="headline" color="#58A6FF">6.2 GB</Text>
          </Column>
        </Row>
      </Card>
    </Column>
  );
}
```

### iOS — SwiftUI (Aura's Memory View)

```tsx
import { List, Text, VStack, HStack, Toggle } from '@expo/ui/swift-ui';

export default function MemoryView() {
  return (
    <List>
      <VStack gap={8}>
        <Text variant="title">Memory Settings</Text>
        <HStack>
          <Text>Auto-save memories</Text>
          <Toggle value={autoSave} onValueChange={setAutoSave} />
        </HStack>
      </VStack>
    </List>
  );
}
```

---

## 12. Inline Native Modules (SDK 56)

For Aura-specific native features (e.g., a custom iOS widget, Android notification listener), SDK 56 lets you write Swift/Kotlin directly in your project without ejecting.

```
aura-mobile/
├── modules/
│   └── aura-native/
│       ├── index.ts
│       ├── src/
│       │   ├── AuraNativeModule.swift
│       │   └── AuraNativeModule.kt
│       └── expo-module.config.json
```

This is the escape hatch when Expo's SDK packages aren't enough. See: [Inline Modules Tutorial](https://docs.expo.dev/versions/v56.0.0/sdk/brownfield)

---

## 13. Build & Deploy

### Development (on your machine)

```bash
npx expo start               # Start dev server + QR code
npx expo start --ios         # Open iOS simulator
npx expo start --android     # Open Android emulator
```

### Development Builds (recommended for Aura)

```bash
npx expo run:ios             # Compile + install custom dev build
npx expo run:android         # Same for Android
```

Once the dev build is installed, you get hot-reload on JS changes without recompiling native code.

### Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build for stores
eas build --platform ios
eas build --platform android

# Submit
eas submit --platform ios
eas submit --platform android

# OTA Updates (fix bugs without app store review)
eas update --branch production --message "Fix Aura's chat rendering"
```

---

## 14. Key SDK 56 Breaking Changes (vs SDK 55)

| Change | What to do |
|--------|-----------|
| **Expo Router no longer re-exports `@react-navigation/*`** | Remove `@react-navigation/*` from `package.json`. Import everything from `expo-router`. Run the SDK 55→56 codemod. |
| **New Architecture only** (no Old Architecture fallback) | Ensure all native modules support New Architecture. `react-native-reanimated` v4+, `@shopify/flash-list` v4+ |
| **New Architecture only** > | `expo-camera` API changed — use `CameraView` not `Camera` |
| **Hermes v1 default** | Faster startup. Opt out via `expo-build-properties` if needed. |
| **Minimum Node.js 22.13** | Update your Node version. |
| **iOS 16.4+ / Android 7+** | Targets raised. Check device compatibility. |
| **AsyncStorage v2** | API surface changed slightly. Check imports. |

---

## 15. Project Checklist — Aura Mobile

```
[ ] npx create-expo-app aura-mobile --template tabs
[ ] Configure app.json (dark mode, plugins, deep link scheme)
[ ] Set up app/_layout.tsx with Aura's theme
[ ] Set up (tabs)/_layout.tsx with Aura's widget tabs
[ ] Create Zustand stores (port from desktop or deduped for mobile)
[ ] Create src/api/aura.ts — REST client for Aura's backend
[ ] Create src/hooks/useAuraWebSocket.ts — real-time orb state
[ ] Build Chat widget (app/(tabs)/index.tsx)
[ ] Build Memory widget
[ ] Build Discord widget
[ ] Build Voice widget (mic → Aura's STT → TTS playback)
[ ] Build Stats widget (poll Aura's system stats)
[ ] Build Settings screen (API keys, voice selection, about)
[ ] Implement AuraOrb component (state-reactive)
[ ] Wire up push notifications (expo-notifications)
[ ] Wire up deep linking (aura://...)
[ ] Test with Expo Go → iterate
[ ] Create dev build → full native API access
[ ] EAS Build → TestFlight / Play Store internal testing
```

---

## 16. Quick Reference — CLI Commands

```bash
npx create-expo-app <name>           # New project
npx create-expo-app <name> --template tabs   # With tab navigation

npx expo start                       # Dev server
npx expo start --ios                 # iOS simulator
npx expo start --android             # Android emulator
npx expo start --web                 # Web (for debugging)

npx expo install <package>           # Install Expo-compatible package
npx expo install --fix               # Fix version mismatches

npx expo run:ios                     # Build + run dev build (iOS)
npx expo run:android                 # Build + run dev build (Android)

npx expo doctor                      # Check project health
npx expo config                      # Show resolved config

eas build --platform ios             # Production build
eas build --platform android         # Production build
eas submit --platform ios            # Submit to App Store
eas update --branch production       # OTA update
```

---

## 17. Reference — Key Docs

| Topic | URL |
|-------|-----|
| Expo SDK 56 Reference | https://docs.expo.dev/versions/v56.0.0/ |
| Expo Router | https://docs.expo.dev/versions/v56.0.0/sdk/router/ |
| Expo UI | https://docs.expo.dev/versions/v56.0.0/sdk/ui/ |
| EAS Build | https://docs.expo.dev/build/introduction/ |
| Expo Notifications | https://docs.expo.dev/versions/v56.0.0/sdk/notifications/ |
| Expo AV (Audio) | https://docs.expo.dev/versions/v56.0.0/sdk/audio/ |
| SecureStore | https://docs.expo.dev/versions/v56.0.0/sdk/securestore/ |
| SDK 56 Changelog | https://expo.dev/changelog/sdk-56 |
| SDK 55→56 Migration | https://expo.dev/blog/upgrading-to-sdk-56 |

---

*Aura's mobile companion — built with Expo SDK 56, React Native 0.85, React 19.2. One codebase. iOS + Android. Aura's HUD, now in your pocket.*
