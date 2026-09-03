import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface OrbParticlesProps {
  count: number;
  mode: 'orbit' | 'drift' | 'converge' | 'none';
  color: string;
  size: number;
  speed: number;
}

interface Particle {
  x: any;
  y: any;
  opacity: any;
  scale: any;
}

function SingleParticle({
  particle,
  color,
  dotSize,
}: {
  particle: Particle;
  color: string;
  dotSize: number;
}) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    left: particle.x.value,
    top: particle.y.value,
    opacity: particle.opacity.value,
    transform: [{ scale: particle.scale.value }],
  }));

  return <Animated.View style={style} />;
}

export function OrbParticles({ count, mode, color, size, speed }: OrbParticlesProps) {
  const particles: Particle[] = [];
  const center = size / 2;

  for (let i = 0; i < count; i++) {
    const x = useSharedValue(center);
    const y = useSharedValue(center);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0);

    useEffect(() => {
      if (mode === 'none') {
        opacity.value = 0;
        return;
      }

      const angle = (i / count) * Math.PI * 2;
      const radius = size * 0.35;
      const delay = i * (speed / count);

      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withTiming(1, { duration: 300 });

      if (mode === 'orbit') {
        const targetX = center + Math.cos(angle) * radius;
        const targetY = center + Math.sin(angle) * radius;
        x.value = targetX;
        y.value = targetY;

        x.value = withRepeat(
          withTiming(center + Math.cos(angle + Math.PI * 2) * radius, {
            duration: speed,
            easing: Easing.linear,
          }),
          -1, false
        );
        y.value = withRepeat(
          withTiming(center + Math.sin(angle + Math.PI * 2) * radius, {
            duration: speed,
            easing: Easing.linear,
          }),
          -1, false
        );
      } else if (mode === 'drift') {
        const driftRadius = radius * 0.6;
        const startX = center + Math.cos(angle) * (radius * 0.3);
        const startY = center + Math.sin(angle) * (radius * 0.3);
        x.value = startX;
        y.value = startY;

        x.value = withRepeat(
          withSequence(
            withTiming(startX + Math.cos(angle) * driftRadius, { duration: speed * 0.7 }),
            withTiming(startX, { duration: speed * 0.3 })
          ),
          -1, false
        );
        y.value = withRepeat(
          withSequence(
            withTiming(startY + Math.sin(angle) * driftRadius, { duration: speed * 0.7 }),
            withTiming(startY, { duration: speed * 0.3 })
          ),
          -1, false
        );
      } else if (mode === 'converge') {
        const outerX = center + Math.cos(angle) * radius;
        const outerY = center + Math.sin(angle) * radius;

        x.value = outerX;
        y.value = outerY;

        x.value = withRepeat(
          withSequence(
            withTiming(center + Math.cos(angle) * radius * 0.2, { duration: speed * 0.6 }),
            withTiming(outerX, { duration: speed * 0.4 })
          ),
          -1, false
        );
        y.value = withRepeat(
          withSequence(
            withTiming(center + Math.sin(angle) * radius * 0.2, { duration: speed * 0.6 }),
            withTiming(outerY, { duration: speed * 0.4 })
          ),
          -1, false
        );
      }
    }, [mode, i, count, size, speed]);

    particles.push({ x, y, opacity, scale });
  }

  if (mode === 'none') return null;

  return (
    <View style={styles.container}>
      {particles.map((p, i) => (
        <SingleParticle key={i} particle={p} color={color} dotSize={4} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
