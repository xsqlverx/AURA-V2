import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { BootSequence } from '../src/components/effects/BootSequence';
import { useSettingsStore } from '../src/store/settingsStore';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  if (!booted) {
    return (
      <>
        <StatusBar style="light" />
        <BootSequence onComplete={() => setBooted(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(drawer)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
