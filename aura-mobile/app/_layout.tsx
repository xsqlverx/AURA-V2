import { useState, useEffect, useRef } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GlanceProvider } from '../src/components/glances';
import { AmbientProvider, AmbientEventWiring, AmbientContextUpdater } from '../src/ambient';
import { DesktopPresenceProvider } from '../src/desktop';
import { useSettings, isConfigured } from '../src/stores/settingsStore';
import { LOCK_MODE_MS } from '../src/stores/settingsStore';
import { useWs } from '../src/stores/wsStore';
import { useAuth } from '../src/stores/authStore';
import BootSequence from '../src/components/BootSequence';
import LockScreen from '../src/components/LockScreen';
import ConnectionBanner from '../src/components/ConnectionBanner';
import AmbientBackground from '../src/components/AmbientBackground';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const { load, isLoaded, backendUrl, lockMode } = useSettings();
  const { locked, init: initAuth } = useAuth();
  const wsConnect = useWs((s) => s.connect);
  const wsDisconnect = useWs((s) => s.disconnect);
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init settings + auth
  useEffect(() => {
    load();
    initAuth();
  }, []);

  // Configurable auto-lock on background. Lock fires only after the configured
  // delay from the moment the app actually left the foreground (or immediately
  // for "exit"), so transient permission dialogs no longer slam the lock.
  useEffect(() => {
    const clearLockTimer = () => {
      if (lockTimer.current) {
        clearTimeout(lockTimer.current);
        lockTimer.current = null;
      }
    };

    const sub = AppState.addEventListener('change', (next) => {
      appState.current = next;

      if (next === 'active') {
        // User came back before the timeout — cancel pending lock
        clearLockTimer();
        return;
      }

      if (next === 'inactive' || next === 'background') {
        // Left the foreground. Schedule the lock after the configured delay.
        clearLockTimer();
        useAuth.getState().lockEnabled && (lockTimer.current = setTimeout(() => {
          if (appState.current !== 'active') useAuth.getState().lock();
        }, LOCK_MODE_MS[lockMode] ?? LOCK_MODE_MS.exit));
      }
    });

    return () => {
      sub.remove();
      clearLockTimer();
    };
  }, [lockMode]);

  // Redirect to setup if needed
  useEffect(() => {
    if (!isLoaded) return;
    if (!isConfigured(backendUrl) && segments[0] !== 'setup') {
      router.replace('/setup');
    }
  }, [isLoaded, backendUrl]);

  // WebSocket
  useEffect(() => {
    if (isLoaded && isConfigured(backendUrl)) {
      wsConnect(backendUrl);
    }
    return () => { wsDisconnect(); };
  }, [isLoaded, backendUrl]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Mount app content once booted + not locked
  const showContent = booted && !locked;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
        <StatusBar style="light" />
        <NavigationBar style="light" />

        {/* Screen-level ambient lighting */}
        <AmbientBackground />

        {/* Boot sequence overlay */}
        {!booted && <BootSequence onComplete={() => setBooted(true)} />}

        {/* Auth lock overlay */}
        {booted && locked && <LockScreen />}

        {/* Connection status banner — flashing red when backend unreachable */}
        {showContent && <ConnectionBanner />}

        {/* Main app */}
        {showContent && (
          <AmbientProvider>
            <DesktopPresenceProvider>
            <GlanceProvider>
              <AmbientContextUpdater />
              <AmbientEventWiring />
              <Stack
              screenOptions={{
                headerStyle: { backgroundColor: 'transparent' },
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="security"
                options={{ title: 'Security' }}
              />
              <Stack.Screen
                name="setup"
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
            </Stack>
          </GlanceProvider>
            </DesktopPresenceProvider>
          </AmbientProvider>
        )}
      </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
