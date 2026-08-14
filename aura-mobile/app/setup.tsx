import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings, DEFAULT_BACKEND_URL } from '../src/stores/settingsStore';
import { getHealth } from '../src/api/aura';
import { colors, spacing, radius, typography } from '../src/theme';
import GlassCard from '../src/components/GlassCard';
import GlassButton from '../src/components/GlassButton';
import GlassInput from '../src/components/GlassInput';

export default function SetupScreen() {
  const [url, setUrl] = useState('http://');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('');
  const { save } = useSettings();
  const router = useRouter();

  const handleTestAndSave = async () => {
    if (!url.trim()) return;
    setTesting(true);
    setStatus('Connecting...');
    try {
      await save(url.trim(), key.trim() || 'testkey123');
      const data = await getHealth();
      if (data.status === 'ok') {
        setStatus('Connected!');
        setTimeout(() => router.replace('/'), 500);
      } else {
        setStatus('Unexpected response');
      }
    } catch (e: any) {
      setStatus(`Failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = () => {
    save(url.trim() || DEFAULT_BACKEND_URL, key.trim() || 'testkey123');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.hero}>
          <Text style={styles.orb}>◎</Text>
          <Text style={styles.title}>Welcome to Aura</Text>
          <Text style={styles.subtitle}>
            Connect to your PC running AURA{'\n'}over Tailscale VPN
          </Text>
        </View>

        <GlassCard>
          <Text style={styles.label}>Backend URL</Text>
          <GlassInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://100.x.x.x:8000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>API Key</Text>
          <GlassInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="testkey123"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <GlassButton variant="primary" onPress={handleTestAndSave} disabled={testing} style={{ marginTop: spacing.lg }}>
            {testing ? 'Connecting...' : 'Connect'}
          </GlassButton>

          {status ? (
            <Text style={[styles.status, status === 'Connected!' ? styles.ok : styles.err]}>
              {status}
            </Text>
          ) : null}

          <GlassButton variant="ghost" onPress={handleSkip} style={{ marginTop: spacing.sm }}>
            Skip for now
          </GlassButton>
        </GlassCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  inner: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  orb: { fontSize: 64, color: colors.primary, marginBottom: spacing.lg },
  title: { ...typography.headlineLg, color: colors.onSurface, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.onSurface, textAlign: 'center', lineHeight: 22 },
  label: { ...typography.labelSm, color: colors.onSurface, marginBottom: spacing.sm },
  input: {},
  status: { textAlign: 'center', marginTop: spacing.md, fontSize: 14 },
  ok: { color: colors.tertiary },
  err: { color: colors.error },
});
