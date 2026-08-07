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
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GlanceProvider } from '../src/components/glances';
import { AmbientProvider, AmbientEventWiring, AmbientContextUpdater } from '../src/ambient';
import { DesktopPresenceProvider } from '../src/desktop';
import { useSettings } from '../src/stores/settingsStore';
import { useWs } from '../src/stores/wsStore';
import { useAuth } from '../src/stores/authStore';
import BootSequence from '../src/components/BootSequence';
import LockScreen from '../src/components/LockScreen';
import { colors } from '../src/theme';

const PLACEHOLDER = 'http://100.100.100.100:8000';

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const { load, isLoaded, backendUrl } = useSettings();
  const { locked, init: initAuth } = useAuth();
  const wsConnect = useWs((s) => s.connect);
  const wsDisconnect = useWs((s) => s.disconnect);
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);

  // Init settings + auth
  useEffect(() => {
    load();
    initAuth();
  }, []);

  // Re-lock on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        useAuth.getState().lock();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // Redirect to setup if needed
  useEffect(() => {
    if (!isLoaded) return;
    if (backendUrl === PLACEHOLDER && segments[0] !== 'setup') {
      router.replace('/setup');
    }
  }, [isLoaded, backendUrl]);

  // WebSocket
  useEffect(() => {
    if (isLoaded && backendUrl && backendUrl !== PLACEHOLDER) {
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
    <ThemeProvider>
      <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
        <StatusBar style="light" />
        <NavigationBar style="light" />

        {/* Boot sequence overlay */}
        {!booted && <BootSequence onComplete={() => setBooted(true)} />}

        {/* Auth lock overlay */}
        {booted && locked && <LockScreen />}

        {/* Main app */}
        {showContent && (
          <AmbientProvider>
            <DesktopPresenceProvider>
            <GlanceProvider>
              <AmbientContextUpdater />
              <AmbientEventWiring />
              <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.bgDeep },
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: colors.bgDeep },
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
  );
}
