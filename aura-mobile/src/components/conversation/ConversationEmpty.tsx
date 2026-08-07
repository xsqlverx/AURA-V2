import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import OrbContainer from '../OrbContainer';
import { text, glass, accent, semantic } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing, iconSize } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { duration } from '../../tokens/animation';
import { useWs } from '../../stores/wsStore';
import type { OrbState } from '../orb/OrbTypes';

const SUGGESTIONS = [
  'What can you help me with?',
  'Open Spotify and play my focus playlist',
  'What\'s my schedule today?',
  'Take a note: remember that I prefer dark mode',
  'Search the web for latest AI news',
  'Lock my PC and set a 5-minute break timer',
];

type Props = {
  onSuggestionTap: (text: string) => void;
  isLoaded: boolean;
};

export default function ConversationEmpty({ onSuggestionTap }: Props) {
  const wsState = useWs((s) => s.state);
  const wsConnected = useWs((s) => s.connected);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (wsConnected) {
      const timer = setTimeout(() => setShowSuggestions(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowSuggestions(false);
    }
  }, [wsConnected]);

  const orbState: OrbState = wsConnected ? wsState : 'disconnected';
  const statusText = !wsConnected
    ? 'Disconnected'
    : wsState === 'speaking'
      ? 'Speaking'
      : wsState === 'listening'
        ? 'Listening'
        : wsState === 'thinking'
          ? 'Thinking'
          : 'Connected';

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(duration.slow)} style={styles.orbSection}>
        <OrbContainer state={orbState} size="large" />
      </Animated.View>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: wsConnected ? semantic.success : semantic.error }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {showSuggestions && (
        <Animated.View entering={FadeInDown.duration(duration.slow).delay(200)} style={styles.suggestions}>
          <Text style={styles.suggestionsLabel}>Try asking</Text>
          {SUGGESTIONS.map((s, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.7 }]}
              onPress={() => onSuggestionTap(s)}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.space32,
    paddingBottom: 60,
  },
  orbSection: {
    marginBottom: spacing.space24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.space40,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    color: text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  suggestions: {
    width: '100%',
    gap: spacing.space8,
  },
  suggestionsLabel: {
    ...typography.caption,
    color: text.tertiary,
    marginBottom: spacing.space4,
    textAlign: 'center',
    letterSpacing: 1,
  },
  suggestionChip: {
    backgroundColor: glass.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.space16,
    alignItems: 'center',
  },
  suggestionText: {
    ...typography.bodySmall,
    color: text.secondary,
  },
});
