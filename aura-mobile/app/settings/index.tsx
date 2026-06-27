import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useSettings } from '../../src/stores/settingsStore';
import { getHealth } from '../../src/api/aura';
import { colors } from '../../src/theme';

export default function SettingsScreen() {
  const { backendUrl, apiKey, save } = useSettings();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setUrl(backendUrl);
    setKey(apiKey);
  }, [backendUrl, apiKey]);

  const handleSave = async () => {
    if (!url.trim()) { Alert.alert('Error', 'Backend URL is required'); return; }
    await save(url.trim(), key.trim());
    Alert.alert('Saved', 'Settings updated');
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus('idle');
    setStatusMsg('Testing...');
    try {
      await save(url.trim(), key.trim());
      const data = await getHealth();
      if (data.status === 'ok') {
        setStatus('ok');
        setStatusMsg('Connected!');
      } else {
        setStatus('err');
        setStatusMsg('Unexpected response');
      }
    } catch (e: any) {
      setStatus('err');
      setStatusMsg(e.message || 'Failed');
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = backendUrl !== 'http://100.100.100.100:8000';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!isConfigured && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Your backend is not configured yet. Enter your Tailscale IP below.
            </Text>
          </View>
        )}

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
        <Text style={styles.hint}>Your PC's Tailscale IP followed by :8000</Text>

        <Text style={[styles.label, { marginTop: 24 }]}>API Key</Text>
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
        <Text style={styles.hint}>Must match MOBILE_API_KEY in .env.local</Text>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.testBtn, pressed && { opacity: 0.7 }]}
            onPress={handleTest}
            disabled={testing}
          >
            <Text style={styles.btnText}>{testing ? 'Testing...' : 'Test'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.saveBtn, pressed && { opacity: 0.7 }]}
            onPress={handleSave}
          >
            <Text style={[styles.btnText, { color: '#fff' }]}>Save</Text>
          </Pressable>
        </View>

        {statusMsg ? (
          <View style={[styles.statusBanner, status === 'ok' ? styles.ok : status === 'err' ? styles.err : styles.idle]}>
            <Text style={[styles.statusText, status === 'ok' ? styles.okText : status === 'err' ? styles.errText : styles.idleText]}>
              {status === 'ok' ? '✓ ' : status === 'err' ? '✕ ' : ''}{statusMsg}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, flex: 1 },
  banner: {
    backgroundColor: '#1A2332',
    borderRadius: 12, padding: 14, marginBottom: 24,
    borderWidth: 1, borderColor: colors.accentCyan + '40',
  },
  bannerText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: colors.bgSecondary, color: colors.textPrimary,
    borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 32 },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  testBtn: { backgroundColor: colors.bgTertiary },
  saveBtn: { backgroundColor: colors.accentCyan },
  btnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  statusBanner: {
    marginTop: 16, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  ok: { backgroundColor: colors.accentGreen + '15' },
  err: { backgroundColor: colors.accentRed + '15' },
  idle: { backgroundColor: colors.bgTertiary },
  statusText: { fontSize: 14, fontWeight: '500' },
  okText: { color: colors.accentGreen },
  errText: { color: colors.accentRed },
  idleText: { color: colors.textSecondary },
});
