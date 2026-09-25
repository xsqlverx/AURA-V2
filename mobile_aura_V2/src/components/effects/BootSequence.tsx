import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { Orb } from '../orb/Orb';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BootSequenceProps {
  onComplete: () => void;
}

const SYSTEM_MODULES = [
  { id: '01', name: 'NEURAL MATRIX', status: 'SYNCHRONIZED' },
  { id: '02', name: 'HYBRID LLM CORE', status: 'ONLINE' },
  { id: '03', name: 'ACCESSIBILITY ENGINE', status: 'ARMED' },
  { id: '04', name: 'OVERLAY SUBSYSTEM', status: 'STANDBY' },
  { id: '05', name: 'VOICE SYNTHESIS', status: 'READY' },
];

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [completedSteps, setCompletedSteps] = useState<number>(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [showFinalOrb, setShowFinalOrb] = useState(false);
  const completedRef = useRef(false);

  // Animation values
  const sparkScale = useSharedValue(0);
  const sparkOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0);
  const ring1Rotate = useSharedValue(0);
  const ring2Scale = useSharedValue(0);
  const ring2Rotate = useSharedValue(0);
  const hudLinesOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleLetterSpacing = useSharedValue(20);
  const greetingOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(15);
  const bypassOpacity = useSharedValue(0);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onComplete();
  };

  useEffect(() => {
    // Initial spark ignition (0ms - 500ms)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    sparkOpacity.value = withTiming(1, { duration: 350 });
    sparkScale.value = withSequence(
      withTiming(1.6, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withTiming(1.0, { duration: 200 })
    );

    // Energy rings expansion (400ms - 1000ms)
    ring1Scale.value = withDelay(400, withSpring(1, Theme.animation.spring));
    ring1Rotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    ring2Scale.value = withDelay(550, withSpring(1.25, Theme.animation.spring));
    ring2Rotate.value = withRepeat(
      withTiming(-360, { duration: 11000, easing: Easing.linear }),
      -1,
      false
    );

    hudLinesOpacity.value = withDelay(600, withTiming(0.7, { duration: 400 }));

    // Title reveal (700ms)
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    titleLetterSpacing.value = withDelay(
      700,
      withTiming(10, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // Show bypass hint
    bypassOpacity.value = withDelay(1000, withTiming(0.6, { duration: 400 }));

    // Start system checks cascade (1000ms - 2200ms)
    const timerModules = setTimeout(() => setShowModules(true), 1000);

    SYSTEM_MODULES.forEach((_, i) => {
      setTimeout(() => {
        setCompletedSteps(i + 1);
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }, 1200 + i * 280);
    });

    // Materialize final orb (2600ms)
    const timerOrb = setTimeout(() => {
      setShowFinalOrb(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }, 2600);

    // Greeting (2800ms)
    const timerGreeting = setTimeout(() => {
      setShowGreeting(true);
      greetingOpacity.value = withTiming(1, { duration: 400 });
      greetingTranslateY.value = withTiming(0, { duration: 400 });
    }, 2850);

    // Auto complete (4000ms)
    const timerComplete = setTimeout(() => {
      finish();
    }, 4100);

    return () => {
      clearTimeout(timerModules);
      clearTimeout(timerOrb);
      clearTimeout(timerGreeting);
      clearTimeout(timerComplete);
    };
  }, []);

  const sparkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkScale.value }],
    opacity: sparkOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [
      { scale: ring1Scale.value },
      { rotate: `${ring1Rotate.value}deg` },
    ],
    opacity: ring1Scale.value > 0 ? 0.8 : 0,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [
      { scale: ring2Scale.value },
      { rotate: `${ring2Rotate.value}deg` },
    ],
    opacity: ring2Scale.value > 0 ? 0.5 : 0,
  }));

  const hudLinesStyle = useAnimatedStyle(() => ({
    opacity: hudLinesOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    letterSpacing: titleLetterSpacing.value,
  }));

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));

  const bypassStyle = useAnimatedStyle(() => ({
    opacity: bypassOpacity.value,
  }));

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Pressable style={styles.container} onPress={finish}>
      {/* Background Reticle / Grid */}
      <Animated.View style={[styles.hudGrid, hudLinesStyle]}>
        <View style={styles.reticleCornerTL} />
        <View style={styles.reticleCornerTR} />
        <View style={styles.reticleCornerBL} />
        <View style={styles.reticleCornerBR} />
        <View style={styles.horizontalLine} />
        <View style={styles.verticalLine} />
        <Text style={styles.telemetryTagTL}>SEC_LVL // ROOT</Text>
        <Text style={styles.telemetryTagTR}>NEURAL_SYS // ONLINE</Text>
      </Animated.View>

      {/* Arc Reactor Core Animation */}
      <View style={styles.reactorContainer}>
        {showFinalOrb ? (
          <Orb state="idle" size={90} />
        ) : (
          <>
            {/* Outer Segmented Ring */}
            <Animated.View style={[styles.outerRing, ring2Style]}>
              <View style={[styles.ringSegment, { top: 0, left: '46%' }]} />
              <View style={[styles.ringSegment, { bottom: 0, left: '46%' }]} />
              <View style={[styles.ringSegment, { left: 0, top: '46%' }]} />
              <View style={[styles.ringSegment, { right: 0, top: '46%' }]} />
            </Animated.View>

            {/* Inner Cyber Ring */}
            <Animated.View style={[styles.innerRing, ring1Style]} />

            {/* Central Arc Reactor Spark */}
            <Animated.View style={[styles.sparkCore, sparkStyle]}>
              <View style={styles.sparkCenter} />
            </Animated.View>
          </>
        )}
      </View>

      {/* Wordmark & Subtitle */}
      <View style={styles.titleContainer}>
        <Animated.Text style={[styles.title, titleStyle]}>AURA</Animated.Text>
        <Text style={styles.subtitle}>NEURAL COPILOT // V2.0</Text>
      </View>

      {/* Module Diagnostics Cascade */}
      {showModules && (
        <View style={styles.moduleBox}>
          {SYSTEM_MODULES.map((mod, i) => {
            const isDone = i < completedSteps;
            return (
              <View key={mod.id} style={styles.moduleRow}>
                <Text
                  style={[
                    styles.moduleIcon,
                    { color: isDone ? Colors.cyan.primary : Colors.text.dim },
                  ]}
                >
                  {isDone ? '⬡' : '⬡'}
                </Text>
                <Text
                  style={[
                    styles.moduleName,
                    { color: isDone ? Colors.text.primary : Colors.text.dim },
                  ]}
                >
                  {mod.name}
                </Text>
                <View style={styles.dotLeader} />
                <Text
                  style={[
                    styles.moduleStatus,
                    {
                      color: isDone
                        ? isDone && i === 0
                          ? Colors.purple.light
                          : Colors.cyan.primary
                        : Colors.text.dim,
                    },
                  ]}
                >
                  {isDone ? mod.status : 'INITIALIZING'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Greeting Banner */}
      {showGreeting && (
        <Animated.View style={[styles.greetingWrapper, greetingStyle]}>
          <Text style={styles.greetingGreeting}>{getTimeGreeting()}, Kenaz.</Text>
          <Text style={styles.greetingSub}>Neural interface established.</Text>
        </Animated.View>
      )}

      {/* Bypass Action Button */}
      <Animated.View style={[styles.bypassContainer, bypassStyle]}>
        <Text style={styles.bypassText}>[ TAP ANYWHERE TO BYPASS ]</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hudGrid: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  reticleCornerTL: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.purple.primary,
  },
  reticleCornerTR: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.purple.primary,
  },
  reticleCornerBL: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.cyan.dim,
  },
  reticleCornerBR: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.cyan.dim,
  },
  horizontalLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(106, 83, 153, 0.08)',
  },
  verticalLine: {
    position: 'absolute',
    left: '50%',
    top: 60,
    bottom: 60,
    width: 1,
    backgroundColor: 'rgba(106, 83, 153, 0.08)',
  },
  telemetryTagTL: {
    position: 'absolute',
    top: 48,
    left: 30,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    color: Colors.purple.soft,
    letterSpacing: 1.5,
  },
  telemetryTagTR: {
    position: 'absolute',
    top: 48,
    right: 30,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    color: Colors.cyan.dim,
    letterSpacing: 1.5,
  },

  reactorContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.45)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSegment: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: Colors.cyan.primary,
    borderRadius: 4,
  },
  innerRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.purple.primary,
    shadowColor: Colors.purple.vibrant,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
  sparkCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.purple.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  sparkCenter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 10,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 34,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    textShadowColor: Colors.purple.glowStrong,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    letterSpacing: 4,
    color: Colors.cyan.primary,
    marginTop: 6,
    textTransform: 'uppercase',
  },

  moduleBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 20,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleIcon: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
  },
  moduleName: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dotLeader: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  moduleStatus: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  greetingWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  greetingGreeting: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  greetingSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  bypassContainer: {
    position: 'absolute',
    bottom: 36,
  },
  bypassText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.text.dim,
  },
});
