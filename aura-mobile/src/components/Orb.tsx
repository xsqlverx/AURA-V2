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
  idle:         { duration: 1500, spread: 0.4, color1: '#0A1A2A', color2: '#0F2A4A' },
  listening:    { duration: 1000, spread: 0.6, color1: '#0A2A3A', color2: '#005F7F' },
  thinking:     { duration: 600,  spread: 0.8, color1: '#1A0A3A', color2: '#5A3FBF' },
  speaking:     { duration: 400,  spread: 1.0, color1: '#005F7F', color2: '#00F2FF' },
};

export default function Orb({ active = false, orState, size = 80 }: OrbProps) {
  const state = orState ?? (active ? 'thinking' : 'idle');
  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;

  const pulse = useSharedValue(0);
  const stateTransition = useSharedValue(0);
  const prevStateRef = useMemo(() => ({ current: 'idle' }), []);

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
    const borderOpacity = 0.06 + pulse.value * 0.14;
    return {
      transform: [{ scale }],
      borderColor: `rgba(0,242,255,${borderOpacity})`,
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
    borderColor: 'rgba(0,242,255,0.08)',
  },
  core: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
