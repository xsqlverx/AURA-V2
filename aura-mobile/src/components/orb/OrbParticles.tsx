import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useAnimatedOpacity } from './OrbAnimations';
import type { StateConfig } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
};

const EASE = Easing.inOut(Easing.ease);

// ── Orbital (speaking, thinking, updating) ────────────────────────────────

function OrbitalParticle({ index, total, coreRadius, color, speed }: {
  index: number; total: number; coreRadius: number; color: string; speed: number;
}) {
  const size = 3 + (index % 2);
  const angle = useSharedValue((index / total) * 360);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    const dur = 4000 / Math.max(speed, 0.3);
    angle.value = withRepeat(
      withTiming(angle.value + 360, { duration: dur, easing: Easing.linear }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: dur / 2, easing: EASE }),
        withTiming(0.8, { duration: dur / 2, easing: EASE })
      ),
      -1,
      true
    );
  }, [speed]);

  const style = useAnimatedStyle(() => {
    const rad = ((angle.value % 360) * Math.PI) / 180;
    const r = coreRadius * 1.5;
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
      style={[styles.particle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

// ── Converge (searching) ──────────────────────────────────────────────────

function ConvergingParticle({ index, total, coreRadius, color, speed }: {
  index: number; total: number; coreRadius: number; color: string; speed: number;
}) {
  const size = 3;
  const radius = useSharedValue(coreRadius * 2);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    const outward = coreRadius * (2 + Math.random());
    const inward = coreRadius * 0.3;
    const dur = 2000 / Math.max(speed, 0.3);
    const delay = index * 200;

    radius.value = withDelay(delay, withRepeat(
      withSequence(withTiming(outward, { duration: dur, easing: EASE }), withTiming(inward, { duration: dur * 2, easing: EASE })),
      -1, true
    ));
    opacity.value = withRepeat(
      withSequence(withTiming(0.2, { duration: dur, easing: EASE }), withTiming(0.9, { duration: dur * 2, easing: EASE })),
      -1, true
    );
  }, [speed]);

  const style = useAnimatedStyle(() => {
    const origAngle = (index / total) * 360;
    const rad = (origAngle * Math.PI) / 180;
    return {
      transform: [{ translateX: Math.cos(rad) * radius.value - size / 2 }, { translateY: Math.sin(rad) * radius.value - size / 2 }],
      opacity: opacity.value,
    };
  });

  return <Animated.View style={[styles.particle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

// ── Scatter (error, success) ──────────────────────────────────────────────

function ScatteringParticle({ index, total, coreRadius, color }: {
  index: number; total: number; coreRadius: number; color: string;
}) {
  const size = 3;
  const radius = useSharedValue(coreRadius * 0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const maxR = coreRadius * (3 + Math.random() * 2);
    const dur = 600 + Math.random() * 400;
    radius.value = withRepeat(
      withSequence(withTiming(maxR, { duration: dur, easing: EASE }), withTiming(coreRadius * 0.5, { duration: dur * 2, easing: EASE })),
      -1, true
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.9, { duration: dur * 0.3, easing: EASE }), withTiming(0, { duration: dur * 0.7, easing: EASE })),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const angle = (index / total) * 360;
    const rad = (angle * Math.PI) / 180;
    return {
      transform: [{ translateX: Math.cos(rad) * radius.value - size / 2 }, { translateY: Math.sin(rad) * radius.value - size / 2 }],
      opacity: opacity.value,
    };
  });

  return <Animated.View style={[styles.particle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

// ── Fragments (memory_retrieval) ──────────────────────────────────────────

function FragmentParticle({ index, total, coreRadius, color }: {
  index: number; total: number; coreRadius: number; color: string;
}) {
  const size = 4;
  const radius = useSharedValue(coreRadius * 2);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const dur = 1500 + Math.random() * 1000;
    const delay = index * 150;
    radius.value = withDelay(delay, withRepeat(
      withSequence(withTiming(coreRadius * (2.5 + Math.random()), { duration: dur, easing: EASE }), withTiming(coreRadius * 0.2, { duration: dur * 1.5, easing: EASE })),
      -1, true
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(withTiming(0.3, { duration: dur * 0.3, easing: EASE }), withTiming(0.9, { duration: dur * 0.7, easing: EASE })),
      -1, true
    ));
  }, []);

  const style = useAnimatedStyle(() => {
    const angle = (index / total) * 360 + 15;
    const rad = (angle * Math.PI) / 180;
    return {
      transform: [{ translateX: Math.cos(rad) * radius.value - size / 2 }, { translateY: Math.sin(rad) * radius.value - size / 2 }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[styles.particle, {
        width: size, height: size,
        backgroundColor: color,
        borderRadius: index % 2 === 0 ? 1 : size / 2,
      }, style]}
    />
  );
}

// ── Hexagonal (executing) ─────────────────────────────────────────────────

function HexagonalParticle({ index, total, coreRadius, color }: {
  index: number; total: number; coreRadius: number; color: string;
}) {
  const size = 2.5;
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 400, easing: EASE }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => {
    const angle = (index / total) * 360 + 30;
    const rad = (angle * Math.PI) / 180;
    const r = coreRadius * 1.8;
    return {
      transform: [{ translateX: Math.cos(rad) * r - size / 2 }, { translateY: Math.sin(rad) * r - size / 2 }],
      opacity: opacity.value,
    };
  });

  return <Animated.View style={[styles.particle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

// ── Particle Router ───────────────────────────────────────────────────────

export default function OrbParticles({ size, config }: Props) {
  const { opacityStyle } = useAnimatedOpacity(config.particlesActive, 300);
  const coreRadius = size * 0.35;

  if (!config.particlesActive || config.particleType === 'none') return null;

  const { particleType, particleCount, particleColor, floatSpeed } = config;
  const particles = Array.from({ length: particleCount });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, opacityStyle]} pointerEvents="none">
      {particles.map((_, i) => {
        switch (particleType) {
          case 'orbit':
            return <OrbitalParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} speed={floatSpeed} />;
          case 'converge':
            return <ConvergingParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} speed={floatSpeed} />;
          case 'scatter':
            return <ScatteringParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} />;
          case 'fragments':
            return <FragmentParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} />;
          case 'hexagonal':
            return <HexagonalParticle key={i} index={i} total={particleCount} coreRadius={coreRadius} color={particleColor} />;
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
