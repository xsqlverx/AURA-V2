import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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
  delay: number;
}

function FloatingParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(particle.opacity);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-40, { duration: particle.duration }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(particle.opacity * 0.3, { duration: particle.duration * 1.2 }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

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
        },
        style,
      ]}
    />
  );
}

export function ParticleBackground() {
  const particles = useMemo(() => {
    const items: Particle[] = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.05,
        duration: Math.random() * 3000 + 4000,
        delay: Math.random() * 2000,
      });
    }
    return items;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <FloatingParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    backgroundColor: Colors.cyan.primary,
  },
});
