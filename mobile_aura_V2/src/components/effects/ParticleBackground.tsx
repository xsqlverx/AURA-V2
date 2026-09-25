import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  color: string;
  isStar: boolean;
}

function StarParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(particle.opacity);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-35, { duration: particle.duration }),
        withTiming(0, { duration: particle.duration })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(particle.opacity * 1.8, { duration: particle.duration * 0.5 }),
        withTiming(particle.opacity * 0.3, { duration: particle.duration * 0.5 })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: particle.duration * 0.6 }),
        withTiming(0.8, { duration: particle.duration * 0.4 })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (particle.isStar) {
    return (
      <Animated.View
        style={[
          styles.starContainer,
          {
            left: particle.x,
            top: particle.y,
            width: particle.size * 2,
            height: particle.size * 2,
          },
          style,
        ]}
      >
        <View style={[styles.starH, { backgroundColor: particle.color, width: particle.size * 2, height: 1.5 }]} />
        <View style={[styles.starV, { backgroundColor: particle.color, height: particle.size * 2, width: 1.5 }]} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

export function ParticleBackground() {
  const particles = useMemo(() => {
    const items: Particle[] = [];
    const count = 28;

    const palette = [
      Colors.purple.soft,
      Colors.purple.vibrant,
      Colors.cyan.bright,
      Colors.cyan.primary,
      Colors.gold.bright,
    ];

    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: Math.random() * 2.5 + 1.2,
        opacity: Math.random() * 0.35 + 0.1,
        duration: Math.random() * 3500 + 4500,
        color: palette[i % palette.length],
        isStar: i % 4 === 0,
      });
    }
    return items;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Background radial gradient simulation */}
      <View style={styles.nebulaGlow} />
      {particles.map((p) => (
        <StarParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  nebulaGlow: {
    position: 'absolute',
    top: -100,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_HEIGHT * 0.45,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(106, 83, 153, 0.08)',
  },
  particle: {
    position: 'absolute',
  },
  starContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starH: {
    position: 'absolute',
  },
  starV: {
    position: 'absolute',
  },
});
