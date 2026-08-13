import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useAnimatedOpacity } from './OrbAnimations';
import type { StateConfig } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
  reduced: boolean;
};

const EASE = Easing.inOut(Easing.ease);
const IDLE_LOOP = 11000;

// ── Drift (idle, success) — 6–10 sparse particles, 8–14s loops ────────────

function DriftParticle({ index, total, coreRadius, color, speed }: {
  index: number; total: number; coreRadius: number; color: string; speed: number;
}) {
  const seed = useRef({ angle: Math.random() * 360, radius: 1.3 + Math.random() * 0.9, dur: IDLE_LOOP * (0.8 + Math.random() * 0.4) });
  const angle = useSharedValue(seed.current.angle);
  const radius = useSharedValue(seed.current.radius);
  const opacity = useSharedValue(0.25 + Math.random() * 0.25);

  useEffect(() => {
    const dur = seed.current.dur / Math.max(speed, 0.3);
    angle.value = withRepeat(withTiming(angle.value + 360, { duration: dur, easing: Easing.linear }), -1, false);
    radius.value = withRepeat(
      withSequence(
        withTiming(seed.current.radius * 0.85, { duration: dur / 2, easing: EASE }),
        withTiming(seed.current.radius * 1.1, { duration: dur / 2, easing: EASE })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: dur / 2, easing: EASE }),
        withTiming(0.2, { duration: dur / 2, easing: EASE })
      ),
      -1,
      true
    );
  }, [speed]);

  const style = useAnimatedStyle(() => {
    const rad = ((angle.value % 360) * Math.PI) / 180;
    const r = coreRadius * radius.value;
    const size = 2.5;
    return {
      transform: [
        { translateX: Math.cos(rad) * r - size / 2 },
        { translateY: Math.sin(rad) * r - size / 2 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[styles.particle, { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: color }, style]}
    />
  );
}

// ── Orbit (thinking, executing, speaking) — steady ring traversal ─────────

function OrbitParticle({ index, total, coreRadius, color, speed }: {
  index: number; total: number; coreRadius: number; color: string; speed: number;
}) {
  const seed = useRef({ angle: (index / total) * 360, r: 1.5 + (index % 2) * 0.2 });
  const angle = useSharedValue(seed.current.angle);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    const dur = IDLE_LOOP / Math.max(speed, 0.3);
    angle.value = withRepeat(withTiming(angle.value + 360, { duration: dur, easing: Easing.linear }), -1, false);
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: dur / 2, easing: EASE }),
        withTiming(0.25, { duration: dur / 2, easing: EASE })
      ),
      -1,
      true
    );
  }, [speed]);

  const style = useAnimatedStyle(() => {
    const rad = ((angle.value % 360) * Math.PI) / 180;
    const r = coreRadius * seed.current.r;
    const size = 3;
    return {
      transform: [
        { translateX: Math.cos(rad) * r - size / 2 },
        { translateY: Math.sin(rad) * r - size / 2 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[styles.particle, { width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }, style]}
    />
  );
}

// ── Converge (searching) — traversal: sweep in, then out ──────────────────

function ConvergeParticle({ index, total, coreRadius, color, speed }: {
  index: number; total: number; coreRadius: number; color: string; speed: number;
}) {
  const seed = useRef({ angle: (index / total) * 360 + Math.random() * 60, dur: 9000 });
  const radius = useSharedValue(coreRadius * 1.6);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const dur = seed.current.dur / Math.max(speed, 0.3);
    radius.value = withRepeat(
      withSequence(
        withTiming(coreRadius * 0.4, { duration: dur * 0.6, easing: EASE }),
        withTiming(coreRadius * 2.1, { duration: dur * 0.8, easing: EASE })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: dur * 0.6, easing: EASE }),
        withTiming(0.15, { duration: dur * 0.8, easing: EASE })
      ),
      -1,
      true
    );
  }, [speed]);

  const style = useAnimatedStyle(() => {
    const rad = (seed.current.angle * Math.PI) / 180;
    const size = 3;
    return {
      transform: [
        { translateX: Math.cos(rad) * radius.value - size / 2 },
        { translateY: Math.sin(rad) * radius.value - size / 2 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[styles.particle, { width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }, style]}
    />
  );
}

export default function OrbParticles({ size, config, reduced }: Props) {
  const { opacityStyle } = useAnimatedOpacity(config.particlesActive && !reduced, 300);
  const coreRadius = size * 0.35;

  if (reduced || !config.particlesActive || config.particleType === 'none') return null;

  const { particleType, particleCount, particleColor, particleSpeed } = config;
  const particles = Array.from({ length: particleCount });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, opacityStyle]} pointerEvents="none">
      {particles.map((_, i) => {
        switch (particleType) {
          case 'drift':
            return <DriftParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} speed={particleSpeed} />;
          case 'orbit':
            return <OrbitParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} speed={particleSpeed} />;
          case 'converge':
            return <ConvergeParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} speed={particleSpeed} />;
          default:
            return null;
        }
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
