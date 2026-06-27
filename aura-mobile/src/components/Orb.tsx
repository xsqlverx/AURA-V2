import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../theme';
import type { OrbState } from '../stores/wsStore';

type OrbProps = {
  active?: boolean;
  orState?: OrbState;
  size?: number;
};

const STATE_CONFIG = {
  disconnected: { duration: 2500, spread: 0.3, color1: '#3A1A1A', color2: '#6B1F1F' },
  idle:         { duration: 1500, spread: 0.4, color1: '#1A3A5C', color2: '#1F4F7B' },
  listening:    { duration: 1000, spread: 0.6, color1: '#1A4F6B', color2: '#1F6FEB' },
  thinking:     { duration: 600,  spread: 0.8, color1: '#2A1A6B', color2: '#4F6FEB' },
  speaking:     { duration: 400,  spread: 1.0, color1: '#1F6FEB', color2: '#58A6FF' },
};

export default function Orb({ active = false, orState, size = 80 }: OrbProps) {
  const state = orState ?? (active ? 'thinking' : 'idle');
  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;

  const pulse = useSharedValue(0);
  const stateTransition = useSharedValue(0);
  const prevStateRef = useMemo(() => ({ current: 'idle' }), []);

  // Pulse loop — speed changes with state
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [state]);

  // Smooth state transition
  useEffect(() => {
    stateTransition.value = withTiming(1, { duration: 300 });
    prevStateRef.current = state;
  }, [state]);

  const coreStyle = useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.15 * config.spread;
    return {
      transform: [{ scale }],
      backgroundColor: interpolateColor(
        pulse.value,
        [0, 1],
        [config.color1, config.color2]
      ),
    };
  });

  const ringStyle = (multiplier: number) => useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.3 * config.spread * multiplier;
    const opacity = interpolateColor(
      pulse.value,
      [0, 1],
      [config.color1.replace(')', ',0.06)').replace(/rgb\(\d+,\d+,\d+\)/, `rgba(88,166,255,0.06)`),
       config.color2.replace(')', ',0.2)').replace(/rgb\(\d+,\d+,\d+\)/, `rgba(88,166,255,0.2)`)]
    );
    return {
      transform: [{ scale }],
      borderColor: opacity,
    };
  });

  const r1 = ringStyle(1);
  const r2 = ringStyle(1.3);
  const r3 = ringStyle(1.7);

  const half = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[styles.ring, { width: size * 2.2, height: size * 2.2, borderRadius: size * 1.1 }, r3]}
      />
      <Animated.View
        style={[styles.ring, { width: size * 1.7, height: size * 1.7, borderRadius: half * 1.7 }, r2]}
      />
      <Animated.View
        style={[styles.ring, { width: size * 1.3, height: size * 1.3, borderRadius: half * 1.3 }, r1]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
          },
          coreStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(88,166,255,0.08)',
  },
  core: {
    shadowColor: colors.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
