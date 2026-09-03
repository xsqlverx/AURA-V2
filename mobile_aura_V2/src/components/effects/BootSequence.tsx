import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

interface BootSequenceProps {
  onComplete: () => void;
}

const CHECKS = [
  'Neural Link',
  'Tool Engine',
  'Memory Core',
  'Voice Pipeline',
  'PC Bridge',
];

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [completedChecks, setCompletedChecks] = useState<number>(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [checksVisible, setChecksVisible] = useState(false);

  const reactorScale = useSharedValue(0);
  const reactorOpacity = useSharedValue(0);
  const reactorGlowOpacity = useSharedValue(0.3);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const greetingOpacity = useSharedValue(0);

  useEffect(() => {
    reactorOpacity.value = withTiming(1, { duration: 600 });
    reactorScale.value = withSequence(
      withTiming(1.3, { duration: 400 }),
      withTiming(1, { duration: 200 })
    );

    reactorGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200 }),
        withTiming(0.3, { duration: 1200 })
      ),
      -1, false
    );

    titleOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    titleY.value = withDelay(700, withTiming(0, { duration: 400 }));
    subtitleOpacity.value = withDelay(1000, withTiming(1, { duration: 300 }));

    setTimeout(() => setChecksVisible(true), 1100);

    CHECKS.forEach((_, i) => {
      setTimeout(() => {
        setCompletedChecks(i + 1);
      }, 1400 + i * 400);
    });

    setTimeout(() => {
      setShowGreeting(true);
      greetingOpacity.value = withTiming(1, { duration: 500 });
    }, 1400 + CHECKS.length * 400 + 300);

    setTimeout(() => {
      onComplete();
    }, 1400 + CHECKS.length * 400 + 2000);
  }, []);

  const reactorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reactorScale.value }],
    opacity: reactorOpacity.value,
  }));

  const reactorGlowStyle = useAnimatedStyle(() => ({
    opacity: reactorGlowOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.reactorArea}>
        <Animated.View style={[styles.reactorGlow, reactorGlowStyle]} />
        <Animated.View style={[styles.reactor, reactorStyle]}>
          <View style={styles.reactorInner} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.titleBlock, titleStyle]}>
        <Text style={styles.title}>AURA</Text>
        <Text style={styles.subtitle}>SYSTEMS</Text>
      </Animated.View>

      <Animated.Text style={[styles.version, subtitleStyle]}>
        v2.0.0
      </Animated.Text>

      {checksVisible && (
        <View style={styles.checks}>
          {CHECKS.map((name, i) => {
            const done = i < completedChecks;
            return (
              <View key={name} style={styles.checkRow}>
                <Text style={[styles.checkIcon, { color: done ? Colors.green.primary : Colors.text.dim }]}>
                  {done ? '✓' : '○'}
                </Text>
                <Text style={[styles.checkName, { color: done ? Colors.text.primary : Colors.text.dim }]}>
                  {name}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {showGreeting && (
        <Animated.View style={[styles.greeting, greetingStyle]}>
          <Text style={styles.greetingText}>Good evening, Kenaz.</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactorArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  reactorGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.cyan.glowStrong,
  },
  reactor: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.cyan.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  reactorInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.cyan.primary,
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  titleBlock: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 12,
    color: Colors.cyan.primary,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    letterSpacing: 8,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  version: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.text.dim,
    marginTop: 8,
  },
  checks: {
    marginTop: 32,
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  checkName: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
  },
  greeting: {
    marginTop: 40,
  },
  greetingText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    color: Colors.text.primary,
    fontStyle: 'italic',
  },
});
