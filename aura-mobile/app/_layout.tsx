import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSettings } from '../src/stores/settingsStore';
import { useWs } from '../src/stores/wsStore';

const PLACEHOLDER = 'http://100.100.100.100:8000';

export default function RootLayout() {
  const { load, isLoaded, backendUrl } = useSettings();
  const wsConnect = useWs((s) => s.connect);
  const wsDisconnect = useWs((s) => s.disconnect);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (backendUrl === PLACEHOLDER && segments[0] !== 'setup') {
      router.replace('/setup');
    }
  }, [isLoaded, backendUrl]);

  useEffect(() => {
    if (isLoaded && backendUrl && backendUrl !== PLACEHOLDER) {
      wsConnect(backendUrl);
    }
    return () => { wsDisconnect(); };
  }, [isLoaded, backendUrl]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D1117' },
          headerTintColor: '#58A6FF',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#0D1117' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings/index"
          options={{ title: 'Settings', presentation: 'modal' }}
        />
        <Stack.Screen
          name="setup"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="notes"
          options={{ title: 'Notes', headerShown: true }}
        />
        <Stack.Screen
          name="files"
          options={{ title: 'Files', headerShown: true }}
        />
        <Stack.Screen
          name="processes"
          options={{ title: 'Processes', headerShown: true }}
        />
      </Stack>
    </>
  );
}
