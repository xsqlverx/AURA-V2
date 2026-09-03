import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Orb } from '../../src/components/orb/Orb';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';

const SUGGESTIONS = [
  { label: 'Chat', icon: '◎', route: '/chat' },
  { label: 'Desktop Status', icon: '📊', route: '/desktop' },
  { label: 'Notes', icon: '📋', route: '/notes' },
  { label: 'Settings', icon: '⚙', route: '/settings' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { orbState, pcConnected } = useAppStore();

  const time = new Date().getHours();
  let greeting = 'Good evening';
  if (time >= 5 && time < 12) greeting = 'Good morning';
  else if (time >= 12 && time < 17) greeting = 'Good afternoon';

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Orb Section */}
          <View style={styles.orbSection}>
            <Orb state={orbState} size={120} />
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: pcConnected ? Colors.green.primary : Colors.text.dim }]} />
              <Text style={styles.statusText}>
                {pcConnected ? 'PC ONLINE' : 'PC OFFLINE'}
              </Text>
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingLight}>{greeting},</Text>
            <Text style={styles.greetingBold}>Kenaz.</Text>
            <Text style={styles.question}>How can I help you?</Text>
          </View>

          {/* Suggestions */}
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsLabel}>SUGGESTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.label}
                  style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push(s.route as any)}
                >
                  <Text style={styles.suggestionIcon}>{s.icon}</Text>
                  <Text style={styles.suggestionText}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  orbSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.text.secondary,
  },
  greetingSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  greetingLight: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 28,
    fontWeight: '300',
    color: Colors.text.secondary,
    letterSpacing: -1,
  },
  greetingBold: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 32,
    fontWeight: '700',
    color: Colors.cyan.primary,
    letterSpacing: -1,
    marginTop: 2,
  },
  question: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    color: Colors.text.dim,
    marginTop: 8,
  },
  suggestionsSection: {
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  suggestionsLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.dim,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  suggestionsScroll: {
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  suggestionIcon: {
    fontSize: 14,
  },
  suggestionText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});
