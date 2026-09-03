import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { getOrbConfig } from './OrbStateMachine';
import { OrbParticles } from './OrbParticles';
import { OrbRings } from './OrbRings';
import type { OrbState } from '../../types';

interface OrbProps {
  state: OrbState;
  onPress?: () => void;
  size?: number;
}

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, r + amount);
  const ng = Math.min(255, g + amount);
  const nb = Math.min(255, b + amount);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

export function Orb({ state, onPress, size = Theme.orb.size }: OrbProps) {
  const config = getOrbConfig(state);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(config.glowIntensity);
  const orbScale = useSharedValue(1);
  const coreOpacity = useSharedValue(1);

  useEffect(() => {
    if (config.pulseSpeed === 0) {
      glowScale.value = 1;
      glowOpacity.value = config.glowIntensity;
      return;
    }

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: config.pulseSpeed }),
        withTiming(1.0, { duration: config.pulseSpeed })
      ),
      -1, false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(config.glowIntensity * 1.5, { duration: config.pulseSpeed }),
        withTiming(config.glowIntensity * 0.6, { duration: config.pulseSpeed })
      ),
      -1, false
    );
  }, [state, config.pulseSpeed, config.glowIntensity]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: config.haloVisible ? withRepeat(
      withSequence(
        withTiming(0.3, { duration: 2000 }),
        withTiming(0.1, { duration: 2000 })
      ),
      -1, false
    ) : 0,
  }));

  const handlePressIn = () => {
    orbScale.value = withSpring(0.92, Theme.animation.orbSpring);
  };

  const handlePressOut = () => {
    orbScale.value = withSpring(1, Theme.animation.orbSpring);
    onPress?.();
  };

  const glowSize = size * 2.5;
  const lightColor = lightenColor(config.coreColor, 60);

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View style={[styles.container, { width: glowSize, height: glowSize }]}>
        {/* Layer 1: Halo */}
        {config.haloVisible && (
          <Animated.View
            style={[
              styles.halo,
              {
                width: glowSize * 1.2,
                height: glowSize * 1.2,
                borderRadius: glowSize * 0.6,
                backgroundColor: config.glowColor,
              },
              haloStyle,
            ]}
          />
        )}

        {/* Layer 2: Glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: config.glowColor,
            },
            glowStyle,
          ]}
        />

        {/* Layer 3: Rings */}
        <OrbRings
          count={config.ringCount}
          color={config.coreColor}
          size={size}
          speed={config.ringSpeed}
        />

        {/* Layer 4: Particles */}
        <OrbParticles
          count={config.particleCount}
          mode={config.particleMode}
          color={config.coreColor}
          size={size}
          speed={config.pulseSpeed}
        />

        {/* Layer 5: Core */}
        <Animated.View style={[styles.orbWrapper, orbStyle]}>
          <LinearGradient
            colors={[lightColor, config.coreColor, config.glowColor]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[
              styles.orb,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                shadowColor: config.coreColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 12,
              },
            ]}
          />
        </Animated.View>

        {/* Inner highlight */}
        <View
          style={[
            styles.innerHighlight,
            {
              width: size * 0.5,
              height: size * 0.5,
              borderRadius: size * 0.25,
              top: (glowSize - size * 0.5) / 2 - size * 0.12,
              left: (glowSize - size * 0.5) / 2 + size * 0.08,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    opacity: 0.15,
  },
  glow: {
    position: 'absolute',
    opacity: 0.3,
  },
  orbWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {},
  innerHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
