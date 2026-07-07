import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated,
} from 'react-native';
import { useAuth } from '../stores/authStore';
import { colors, spacing, radius, typography } from '../theme';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';
import GlassInput from './GlassInput';

export default function LockScreen() {
  const { authenticate, verifyPin, lockEnabled } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [tryingBio, setTryingBio] = useState(true);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (tryingBio && lockEnabled) {
      const t = setTimeout(async () => {
        const ok = await authenticate();
        if (!ok) setUsePin(true);
        setTryingBio(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [tryingBio, lockEnabled]);

  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    const ok = await verifyPin(pin);
    if (ok) {
      useAuth.setState({ locked: false });
    } else {
      setError('Incorrect PIN');
      setPin('');
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleBioRetry = async () => {
    setTryingBio(true);
    setUsePin(false);
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.lockIcon}>
        <Text style={styles.lockSymbol}>⨀</Text>
      </View>
      <Text style={styles.title}>Aura</Text>
      <Text style={styles.subtitle}>Authentication Required</Text>

      {!usePin ? (
        <View style={styles.bioStatus}>
          <Text style={styles.bioText}>Authenticating...</Text>
        </View>
      ) : (
        <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: '100%', alignItems: 'center' }}>
          <Text style={styles.pinPrompt}>Enter PIN</Text>
          <GlassInput
            ref={inputRef}
            style={styles.pinInput}
            value={pin}
            onChangeText={(t) => { setPin(t); setError(''); if (t.length >= 4) setTimeout(() => handlePinSubmit(), 50); }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
            placeholder="• • • •"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.pinGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.pinKey, pressed && { opacity: 0.85 }, key === '' && styles.pinKeyEmpty]}
                onPress={() => {
                  if (key === '⌫') { setPin((p) => p.slice(0, -1)); setError(''); }
                  else if (typeof key === 'number') {
                    const next = pin + key;
                    setPin(next);
                    setError('');
                    if (next.length >= 4) setTimeout(() => handlePinSubmit(), 100);
                  }
                }}
                disabled={key === ''}
              >
                <Text style={[styles.pinKeyText, key === '⌫' && { fontSize: 18 }]}>
                  {key === '⌫' ? '⌫' : key}
                </Text>
              </Pressable>
            ))}
          </View>

          <GlassButton variant="ghost" onPress={handleBioRetry} style={{ marginTop: spacing.lg }}>
            Use Fingerprint Instead
          </GlassButton>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bgDeep,
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl,
  },
  lockIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,242,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)',
    marginBottom: spacing.lg,
  },
  lockSymbol: { color: colors.primary, fontSize: 32 },
  title: { ...typography.headlineLg, color: colors.onSurface, fontSize: 26, letterSpacing: 2 },
  subtitle: { ...typography.bodyMd, color: colors.onSurface, marginTop: 6, marginBottom: 40 },
  bioStatus: { alignItems: 'center' },
  bioText: { ...typography.mono, color: colors.onSurface },
  pinPrompt: { ...typography.labelSm, color: colors.primary, marginBottom: spacing.md },
  pinInput: { fontSize: 28, letterSpacing: 12, textAlign: 'center', width: 180, marginBottom: spacing.sm },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.xs },
  pinGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 240, marginTop: spacing.lg, gap: 6,
  },
  pinKey: {
    width: 72, height: 56, borderRadius: radius.card,
    backgroundColor: colors.glassBg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  pinKeyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
  pinKeyText: { ...typography.headlineMd, color: colors.onSurface },
});
