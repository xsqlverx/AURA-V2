import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography } from '../theme';

const STATUS_LINES = [
  { label: 'Neural Link', status: 'ESTABLISHED', color: colors.primary },
  { label: 'System Cores', status: 'NOMINAL', color: colors.primary },
  { label: 'HUD Interface', status: 'ONLINE', color: colors.primary },
  { label: 'Quantum Sync', status: 'STABLE', color: colors.primary },
];

type Props = {
  onComplete: () => void;
};

export default function BootSequence({ onComplete }: Props) {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const title = 'AURA v2.0';

  const dotOpacity = useRef(new Animated.Value(0)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => { setPhase(3); setShowStatus(true); }, 3200);
    const t4 = setTimeout(() => { setPhase(4); }, 5200);
    const t5 = setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onComplete());
    }, 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  useEffect(() => {
    if (phase === 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 2) {
      Animated.timing(ringsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      let i = 0;
      const iv = setInterval(() => {
        if (i < title.length) { setTyped(title.slice(0, i + 1)); i++; }
        else clearInterval(iv);
      }, 60);
      return () => clearInterval(iv);
    }
  }, [phase]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {phase >= 1 && (
        <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
      )}

      {phase >= 2 && (
        <Animated.View style={[styles.ringsContainer, { opacity: ringsOpacity }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.ring, { width: 80 + i * 40, height: 80 + i * 40 }]} />
          ))}
          <View style={styles.centerDot} />
        </Animated.View>
      )}

      {phase >= 2 && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {typed}<Text style={styles.cursor}>|</Text>
          </Text>
        </View>
      )}

      {phase >= 3 && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>QUANTUM NEURAL INTERFACE</Text>
        </View>
      )}

      {showStatus && (
        <View style={styles.statusContainer}>
          {STATUS_LINES.map((line, i) => (
            <StatusLine key={line.label} label={line.label} status={line.status} color={line.color} delay={i * 120} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function StatusLine({ label, status, color, delay }: {
  label: string; status: string; color: string; delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusDots}> ...... </Text>
      <Text style={[styles.statusValue, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  ringsContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  titleContainer: {
    position: 'absolute',
    bottom: '40%',
  },
  title: {
    ...typography.displayLg,
    fontSize: 28,
    color: colors.primary,
  },
  cursor: {
    color: colors.primary,
    opacity: 0.7,
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: '34%',
  },
  subtitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontSize: 11,
    letterSpacing: 6,
  },
  statusContainer: {
    position: 'absolute',
    bottom: '22%',
    gap: 6,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.mono,
    color: colors.onSurface,
    width: 100,
    textAlign: 'right',
  },
  statusDots: {
    ...typography.mono,
    color: colors.onSurface,
  },
  statusValue: {
    ...typography.mono,
    fontWeight: '700',
  },
});
