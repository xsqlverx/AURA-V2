# Expo Guide

> A practical, project-agnostic guide to building mobile apps with Expo and React Native.

Expo is a framework built on top of React Native that helps you build, test, and ship iOS, Android, and web apps with less native setup. It gives you a fast path from idea to running app without needing to manage Xcode, Android Studio, and Gradle manually for every iteration.

This guide is written to be reusable for any Expo app, not just a single project.

---

## 1. What Expo Is

Expo bundles the React Native toolchain and common platform features into a developer-friendly workflow.

Key benefits:

- Fast setup with a single command
- Built-in development server and hot reload
- Easy access to native APIs through Expo SDK packages
- Strong support for Expo Router, EAS Build, OTA updates, and testing

Typical workflows:

- Expo Go for quick prototyping
- Development build for full native access
- Production build with EAS for app store distribution

---

## 2. Getting Started

Create a new project:

```bash
npx create-expo-app my-app
cd my-app
npx expo start
```

For a tabbed app:

```bash
npx create-expo-app my-app --template tabs
```

A typical Expo project looks like this:

```text
my-app/
├── app/                 # Expo Router screens and layouts
├── assets/              # Images, icons, fonts
├── src/                 # App logic, components, hooks, stores
├── app.json             # Expo config
├── package.json
└── tsconfig.json
```

---

## 3. Project Configuration

The main Expo configuration lives in app.json.

Example:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "ios": {
      "bundleIdentifier": "com.example.myapp"
    },
    "android": {
      "package": "com.example.myapp"
    }
  }
}
```

Common configuration areas:

- App name and slug
- Splash screen and icon
- Deep linking scheme
- Permissions and native plugin settings
- Build metadata for EAS

---

## 4. Routing with Expo Router

Expo Router uses a file-based routing system. Each file inside the app directory becomes a route.

Example:

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
```

```tsx
// app/index.tsx
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome</Text>
    </View>
  );
}
```

Useful navigation APIs:

- router.push("/settings")
- router.back()
- useRouter()
- useLocalSearchParams()

---

## 5. Building UI

Expo apps use React Native components, not web DOM elements.

Common primitives:

- View for layout
- Text for labels
- TextInput for forms
- Pressable for touch interactions
- FlatList for long lists
- ScrollView for scrollable content
- SafeAreaView for notches and status bars

Example:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ExampleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Expo</Text>
      <Pressable style={styles.button} onPress={() => console.log("Pressed")}>
        <Text style={styles.buttonText}>Tap me</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, marginBottom: 16 },
  button: { padding: 12, backgroundColor: "#2563eb", borderRadius: 8 },
  buttonText: { color: "white" },
});
```

---

## 6. Styling

React Native styling uses JavaScript objects or StyleSheet.create().

```tsx
import { StyleSheet, Text, View } from "react-native";

export default function StyledScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>Styled content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  text: {
    fontSize: 16,
    color: "#111827",
  },
});
```

Popular styling tools:

- StyleSheet for local styles
- React Native Paper for UI components
- NativeWind for Tailwind-like styling
- Expo UI for platform-native primitives

---

## 7. State, Data, and Networking

Expo apps usually use a state management approach such as:

- React state and context
- Zustand
- Redux Toolkit
- TanStack Query for server data

Example fetch request:

```tsx
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function DataScreen() {
  const [data, setData] = useState<string>("Loading...");

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/todos/1")
      .then((res) => res.json())
      .then((json) => setData(json.title));
  }, []);

  return (
    <View>
      <Text>{data}</Text>
    </View>
  );
}
```

---

## 8. Working with Native Features

Expo makes native APIs available through packages.

Common examples:

- expo-location for location services
- expo-notifications for push notifications
- expo-av for audio and video
- expo-secure-store for secure local storage
- expo-camera for camera access
- expo-sensors for device sensors

Install packages with:

```bash
npx expo install expo-location
```

---

## 9. Testing and Debugging

Useful commands:

```bash
npx expo start
npx expo start --ios
npx expo start --android
npx expo start --web
```

Useful debugging tools:

- Expo Go for rapid iteration
- React DevTools
- Flipper or developer tools
- Console logs and breakpoints

Before shipping, run:

```bash
npx expo doctor
```

---

## 10. Building and Publishing

For local development:

```bash
npx expo start
```

For a development build:

```bash
npx expo run:ios
npx expo run:android
```

For production builds with EAS:

```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

EAS also supports OTA updates:

```bash
eas update --branch production --message "Fix a bug"
```

---

## 11. Recommended Project Structure

A clean layout for most Expo apps:

```text
src/
├── components/
├── screens/
├── hooks/
├── stores/
├── services/
├── theme/
└── utils/
```

This keeps UI, business logic, and platform integrations easier to maintain as the app grows.

---

## 12. Common Gotchas

- Keep Expo SDK versions aligned across packages
- Use Expo-compatible packages instead of plain React Native packages when possible
- Test on both iOS and Android early
- Rebuild after adding native modules
- Check app.json and app.config.ts carefully when changing app metadata

---

## 13. Useful References

- Expo documentation: https://docs.expo.dev/
- Expo Router: https://docs.expo.dev/router/introduction/
- EAS Build: https://docs.expo.dev/build/introduction/
- Expo SDK packages: https://docs.expo.dev/versions/latest/

---

This guide is intentionally general so it can be reused for any Expo-based mobile application, whether it is a simple prototype, a consumer app, or a more complex product.
