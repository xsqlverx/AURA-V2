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
import { OrbContainmentCradle } from './OrbContainmentCradle';
import type { OrbState } from '../../types';

interface OrbProps {
  state: OrbState;
  onPress?: () => void;
  size?: number;
  showCradle?: boolean;
}

export function Orb({
  state,
  onPress,
  size = Theme.orb.size,
  showCradle = true,
}: OrbProps) {
  const config = getOrbConfig(state);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(config.glowIntensity);
  const coreScale = useSharedValue(1);
  const corePulse = useSharedValue(1);

  useEffect(() => {
    if (config.pulseSpeed === 0) {
      glowScale.value = 1;
      glowOpacity.value = config.glowIntensity;
      return;
    }

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: config.pulseSpeed }),
        withTiming(1.0, { duration: config.pulseSpeed })
      ),
      -1,
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(Math.min(config.glowIntensity * 1.5, 1), { duration: config.pulseSpeed }),
        withTiming(config.glowIntensity * 0.6, { duration: config.pulseSpeed })
      ),
      -1,
      false
    );

    corePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: config.pulseSpeed * 0.6 }),
        withTiming(0.94, { duration: config.pulseSpeed * 0.6 })
      ),
      -1,
      true
    );
  }, [state, config.pulseSpeed, config.glowIntensity]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const coreAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value * corePulse.value }],
  }));

  const handlePressIn = () => {
    coreScale.value = withSpring(0.88, Theme.animation.orbSpring);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handlePressOut = () => {
    coreScale.value = withSpring(1, Theme.animation.orbSpring);
    onPress?.();
  };

  const glowSize = size * 2.5;

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View style={[styles.container, { width: glowSize, height: glowSize }]}>
        {/* Layer 0: Encompassing Containment Cradle (Encompassing bounding box with corner dots) */}
        {showCradle && <OrbContainmentCradle size={size} state={state} />}

        {/* Layer 1: Ambient Plasma Glow */}
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

        {/* Layer 2: Rotating Orbital Ring Shells */}
        <OrbRings
          count={config.ringCount}
          color={config.ringColor || config.coreColor}
          size={size * 1.1}
          speed={config.ringSpeed}
        />

        {/* Layer 3: 3D Holographic Particle Swarm (Pure particles living in 3D orbit) */}
        <OrbParticles
          size={size * 1.4}
          color={config.coreColor}
          speed={config.pulseSpeed}
          count={26}
          mode={config.particleMode}
        />

        {/* Layer 4: Floating Central Photon Core */}
        <Animated.View style={[styles.coreWrapper, coreAnimStyle]}>
          <LinearGradient
            colors={[
              '#FFFFFF',
              config.coreColor,
              Colors.purple.dark,
              'rgba(10, 8, 16, 0.9)',
            ]}
            start={{ x: 0.3, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={[
              styles.photonCore,
              {
                width: size * 0.7,
                height: size * 0.7,
                borderRadius: (size * 0.7) / 2,
                shadowColor: config.coreColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 28,
                elevation: 20,
              },
            ]}
          />

          {/* Central Singularity Spark */}
          <View
            style={[
              styles.singularity,
              {
                width: size * 0.18,
                height: size * 0.18,
                borderRadius: (size * 0.18) / 2,
                backgroundColor: '#FFFFFF',
                shadowColor: Colors.cyan.primary,
                shadowOpacity: 1,
                shadowRadius: 10,
              },
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    opacity: 0.4,
  },
  coreWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photonCore: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  singularity: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
