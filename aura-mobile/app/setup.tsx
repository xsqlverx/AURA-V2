import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '../src/stores/settingsStore';
import { getHealth } from '../src/api/aura';
import { colors } from '../src/theme';

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
    save(url.trim() || 'http://100.100.100.100:8000', key.trim() || 'testkey123');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.orb}>◎</Text>
          <Text style={styles.title}>Welcome to Aura</Text>
          <Text style={styles.subtitle}>
            Connect to your PC running AURA{'\n'}over Tailscale VPN
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Backend URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://100.x.x.x:8000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={[styles.label, { marginTop: 20 }]}>API Key</Text>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="testkey123"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <Pressable
            style={({ pressed }) => [styles.btn, styles.connectBtn, pressed && { opacity: 0.8 }]}
            onPress={handleTestAndSave}
            disabled={testing}
          >
            <Text style={styles.btnText}>
              {testing ? 'Connecting...' : 'Connect'}
            </Text>
          </Pressable>

          {status ? (
            <Text style={[styles.status, status === 'Connected!' ? styles.ok : styles.err]}>
              {status}
            </Text>
          ) : null}

          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 48 },
  orb: { fontSize: 64, color: colors.accentCyan, marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  form: {},
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectBtn: { backgroundColor: colors.accentCyan },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  status: { textAlign: 'center', marginTop: 12, fontSize: 14 },
  ok: { color: colors.accentGreen },
  err: { color: colors.accentRed },
  skipBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
