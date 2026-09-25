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
import * as Haptics from 'expo-haptics';
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
  try {
    if (!hex.startsWith('#') || hex.length < 7) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, r + amount);
    const ng = Math.min(255, g + amount);
    const nb = Math.min(255, b + amount);
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  } catch {
    return hex;
  }
}

export function Orb({ state, onPress, size = Theme.orb.size }: OrbProps) {
  const config = getOrbConfig(state);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(config.glowIntensity);
  const orbScale = useSharedValue(1);
  const ringRotation = useSharedValue(0);

  useEffect(() => {
    if (config.pulseSpeed === 0) {
      glowScale.value = 1;
      glowOpacity.value = config.glowIntensity;
      return;
    }

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: config.pulseSpeed }),
        withTiming(1.0, { duration: config.pulseSpeed })
      ),
      -1,
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(Math.min(config.glowIntensity * 1.4, 1), { duration: config.pulseSpeed }),
        withTiming(config.glowIntensity * 0.7, { duration: config.pulseSpeed })
      ),
      -1,
      false
    );

    ringRotation.value = withRepeat(
      withTiming(360, { duration: config.ringSpeed || 6000 }),
      -1,
      false
    );
  }, [state, config.pulseSpeed, config.glowIntensity, config.ringSpeed]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: config.haloVisible
      ? withRepeat(
          withSequence(
            withTiming(0.4, { duration: 1800 }),
            withTiming(0.15, { duration: 1800 })
          ),
          -1,
          false
        )
      : 0,
  }));

  const handlePressIn = () => {
    orbScale.value = withSpring(0.9, Theme.animation.orbSpring);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handlePressOut = () => {
    orbScale.value = withSpring(1, Theme.animation.orbSpring);
    onPress?.();
  };

  const glowSize = size * 2.4;
  const lightColor = lightenColor(config.coreColor, 50);

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View style={[styles.container, { width: glowSize, height: glowSize }]}>
        {/* Layer 1: Ambient Halo */}
        {config.haloVisible && (
          <Animated.View
            style={[
              styles.halo,
              {
                width: glowSize * 1.15,
                height: glowSize * 1.15,
                borderRadius: (glowSize * 1.15) / 2,
                backgroundColor: config.glowColor,
              },
              haloStyle,
            ]}
          />
        )}

        {/* Layer 2: Core Glow Matrix */}
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

        {/* Layer 3: Rotating Orbital Rings */}
        <OrbRings
          count={config.ringCount}
          color={config.ringColor || config.coreColor}
          size={size}
          speed={config.ringSpeed}
        />

        {/* Layer 4: Floating / Orbiting Energy Particles */}
        <OrbParticles
          count={config.particleCount}
          mode={config.particleMode === 'pulse' ? 'orbit' : config.particleMode}
          color={config.particleColor || config.coreColor}
          size={size}
          speed={config.pulseSpeed}
        />

        {/* Layer 5: Holographic Sphere Core */}
        <Animated.View style={[styles.orbWrapper, orbStyle]}>
          <LinearGradient
            colors={[
              lightColor,
              config.coreColor,
              Colors.purple.dark,
              '#050308',
            ]}
            start={{ x: 0.25, y: 0.1 }}
            end={{ x: 0.85, y: 0.95 }}
            style={[
              styles.orb,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.25)',
                shadowColor: config.coreColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 24,
                elevation: 16,
              },
            ]}
          />
        </Animated.View>

        {/* Layer 6: Glass Reflection Arc */}
        <View
          style={[
            styles.innerHighlight,
            {
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: (size * 0.45) / 2,
              top: (glowSize - size) / 2 + size * 0.08,
              left: (glowSize - size) / 2 + size * 0.12,
            },
          ]}
        />

        {/* Layer 7: Cyber Energy Dot in Center */}
        <View
          style={[
            styles.centerSpark,
            {
              width: size * 0.14,
              height: size * 0.14,
              borderRadius: (size * 0.14) / 2,
              backgroundColor: '#FFFFFF',
              shadowColor: Colors.cyan.primary,
              shadowOpacity: 1,
              shadowRadius: 8,
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
    opacity: 0.18,
  },
  glow: {
    position: 'absolute',
    opacity: 0.35,
  },
  orbWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {},
  innerHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  centerSpark: {
    position: 'absolute',
    opacity: 0.85,
  },
});
