import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { text, glass, semantic, accent } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing } from '../../tokens/spacing';
import { duration } from '../../tokens/animation';
import { STATE_LABELS } from '../orb/OrbTypes';
import type { OrbState } from '../orb/OrbTypes';

type Props = {
  orbState: OrbState;
  connected: boolean;
};

function getStateColor(state: OrbState, connected: boolean): string {
  if (!connected) return semantic.error;
  switch (state) {
    case 'listening': return accent.cyan;
    case 'thinking': return semantic.warning;
    case 'speaking': return accent.cyan;
    default: return semantic.success;
  }
}

const ACTIVE_STATES: OrbState[] = ['listening', 'thinking', 'speaking', 'searching', 'executing'];

export default function PresenceBar({ orbState, connected }: Props) {
  const label = connected ? STATE_LABELS[orbState] : 'Disconnected';
  const color = getStateColor(orbState, connected);
  const pulse = useSharedValue(1);

  const isActive = connected && ACTIVE_STATES.includes(orbState);

  useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isActive]);

  const rDotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(duration.slow).delay(300)}
      style={styles.container}
    >
      <View style={styles.item}>
        <Animated.View style={[styles.dot, { backgroundColor: color }, rDotStyle]} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>

      {connected && (
        <View style={styles.item}>
          <View style={styles.divider} />
          <Text style={styles.subtle}>Desktop Online</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: glass.border,
    marginRight: 8,
  },
  subtle: {
    ...typography.caption,
    color: text.secondary,
    letterSpacing: 0.5,
  },
});
