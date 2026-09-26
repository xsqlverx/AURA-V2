import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import type { OrbState } from '../../types';

interface OrbContainmentCradleProps {
  size: number;
  state: OrbState;
}

export function OrbContainmentCradle({ size, state }: OrbContainmentCradleProps) {
  const cradleSize = size * 1.5;
  const pulseScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    // State responsive containment dynamics
    if (state === 'listening') {
      pulseScale.value = withSpring(1.08);
      opacity.value = withTiming(1, { duration: 200 });
      rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
    } else if (state === 'thinking' || state === 'executing') {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 600 }), withTiming(0.96, { duration: 600 })),
        -1,
        true
      );
      opacity.value = withTiming(0.9, { duration: 200 });
      rotation.value = withRepeat(withTiming(360, { duration: 4000 }), -1, false);
    } else {
      // Idle breathing
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 3200 }), withTiming(0.98, { duration: 3200 })),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.85, { duration: 3200 }), withTiming(0.45, { duration: 3200 })),
        -1,
        true
      );
      rotation.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
    }
  }, [state]);

  const cradleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: opacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const isCyan = state === 'listening' || state === 'searching';
  const isGold = state === 'thinking' || state === 'executing';
  const primaryColor = isCyan ? Colors.cyan.primary : isGold ? Colors.gold.primary : Colors.purple.light;
  const glowColor = isCyan ? Colors.cyan.glowStrong : isGold ? Colors.gold.glow : Colors.purple.glowStrong;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { width: cradleSize, height: cradleSize },
        cradleStyle,
      ]}
    >
      {/* 4 Encompassing Corner Brackets with Telemetry Dots */}
      {/* Top Left */}
      <View style={[styles.cornerTL, { borderColor: primaryColor }]}>
        <View style={[styles.cornerDot, { backgroundColor: primaryColor }]} />
      </View>

      {/* Top Right */}
      <View style={[styles.cornerTR, { borderColor: primaryColor }]}>
        <View style={[styles.cornerDot, { backgroundColor: primaryColor }]} />
      </View>

      {/* Bottom Left */}
      <View style={[styles.cornerBL, { borderColor: primaryColor }]}>
        <View style={[styles.cornerDot, { backgroundColor: primaryColor }]} />
      </View>

      {/* Bottom Right */}
      <View style={[styles.cornerBR, { borderColor: primaryColor }]}>
        <View style={[styles.cornerDot, { backgroundColor: primaryColor }]} />
      </View>

      {/* Rotating Cybernetic Scope Dial */}
      <Animated.View
        style={[
          styles.scopeRing,
          {
            width: cradleSize * 0.9,
            height: cradleSize * 0.9,
            borderRadius: (cradleSize * 0.9) / 2,
            borderColor: 'rgba(106, 83, 153, 0.25)',
          },
          ringStyle,
        ]}
      >
        <View style={[styles.scopeTick, { top: -3, left: '48%', backgroundColor: primaryColor }]} />
        <View style={[styles.scopeTick, { bottom: -3, left: '48%', backgroundColor: primaryColor }]} />
        <View style={[styles.scopeTick, { left: -3, top: '48%', backgroundColor: primaryColor }]} />
        <View style={[styles.scopeTick, { right: -3, top: '48%', backgroundColor: primaryColor }]} />
      </Animated.View>

      {/* Outer Telemetry Bounds */}
      <View
        style={[
          styles.outerBounds,
          {
            width: cradleSize * 0.98,
            height: cradleSize * 0.98,
            borderColor: 'rgba(255, 255, 255, 0.06)',
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 22,
    height: 22,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 6,
  },
  cornerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: -2,
    left: -2,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  scopeRing: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTick: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  outerBounds: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 14,
  },
});
