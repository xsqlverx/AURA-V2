import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSettings } from '../../src/stores/settingsStore';
import { isConfigured } from '../../src/stores/settingsStore';
import { LOCK_MODE_LABELS, LockMode } from '../../src/stores/settingsStore';
import { LLM_PROVIDERS, DEFAULT_LLM_MODEL, LlmProviderId } from '../../src/stores/settingsStore';
import { getHealth } from '../../src/api/aura';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import GlassButton from '../../src/components/GlassButton';
import GlassInput from '../../src/components/GlassInput';

const LOCK_MODES: LockMode[] = ['exit', '30s', '60s', '120s', '300s'];

export default function SettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation<DrawerNavigationProp<{}>>();
  const { backendUrl, apiKey, lockMode, llmApiKey, llmProvider, llmModel, save, setLockMode, saveLlm } = useSettings();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [llmKey, setLlmKey] = useState('');
  const [llmProviderId, setLlmProviderId] = useState<LlmProviderId>('openrouter');
  const [llmModelName, setLlmModelName] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setUrl(backendUrl);
    setKey(apiKey);
    setLlmKey(llmApiKey);
    setLlmProviderId(llmProvider);
    setLlmModelName(llmModel);
  }, [backendUrl, apiKey, llmApiKey, llmProvider, llmModel]);

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

  const handleSaveLlm = async () => {
    if (!llmKey.trim()) { Alert.alert('Error', 'LLM API key is required'); return; }
    const providerId = LLM_PROVIDERS.some((p) => p.id === llmProviderId) ? llmProviderId : 'openrouter';
    const model = llmModelName.trim() || DEFAULT_LLM_MODEL[providerId];
    await saveLlm(llmKey.trim(), providerId, model);
    Alert.alert('Saved', 'Independent brain configured');
  };

  const isConfiguredFlag = isConfigured(backendUrl);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <MaterialIcons name="menu" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {!isConfiguredFlag && (
          <GlassCard glow="cyan" style={styles.banner}>
            <View style={styles.bannerRow}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
              <Text style={styles.bannerText}>
                Backend not configured. Enter your Tailscale IP below.
              </Text>
            </View>
          </GlassCard>
        )}

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <MaterialIcons name="dns" size={14} color={colors.onSurfaceMuted} />
            <Text style={styles.label}>Backend URL</Text>
          </View>
          <GlassInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://100.x.x.x:8000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>Your PC's Tailscale IP followed by :8000</Text>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <MaterialIcons name="key" size={14} color={colors.onSurfaceMuted} />
            <Text style={styles.label}>API Key</Text>
          </View>
          <GlassInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="testkey123"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>Must match MOBILE_API_KEY in .env.local</Text>
        </View>

        <View style={styles.buttons}>
          <GlassButton variant="secondary" onPress={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test'}
          </GlassButton>
          <GlassButton variant="primary" onPress={handleSave}>
            Save
          </GlassButton>
        </View>

        {statusMsg ? (
          <GlassCard
            style={[
              styles.statusBanner,
              status === 'ok' ? { borderColor: colors.tertiary + '30' } : status === 'err' ? { borderColor: colors.error + '30' } : undefined,
            ]}
          >
            <View style={styles.statusRow}>
              <MaterialIcons
                name={status === 'ok' ? 'check-circle' : status === 'err' ? 'error' : 'info'}
                size={16}
                color={status === 'ok' ? colors.tertiary : status === 'err' ? colors.error : colors.onSurface}
              />
              <Text style={[
                styles.statusText,
                { color: status === 'ok' ? colors.tertiary : status === 'err' ? colors.error : colors.onSurface },
              ]}>
                {statusMsg}
              </Text>
            </View>
          </GlassCard>
        ) : null}

        <View style={styles.sectionHeader}>
          <MaterialIcons name="psychology" size={16} color={colors.primary} />
          <Text style={styles.sectionLabel}>INDEPENDENT BRAIN</Text>
        </View>
        <GlassCard>
          <View style={styles.lockSectionHeader}>
            <MaterialIcons name="memory" size={16} color={colors.primary} />
            <Text style={styles.lockSectionLabel}>OFFLINE LLM (PC OFF)</Text>
          </View>
          <Text style={styles.lockHint}>
            Add your own LLM API key so AURA can reply without your PC running. Uses your on-phone memory mirror for context.
          </Text>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <MaterialIcons name="storage" size={14} color={colors.onSurfaceMuted} />
              <Text style={styles.label}>Provider</Text>
            </View>
            <View style={styles.providerChips}>
              {LLM_PROVIDERS.map((p) => {
                const active = llmProviderId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setLlmProviderId(p.id);
                      if (!llmModelName.trim()) setLlmModelName(DEFAULT_LLM_MODEL[p.id]);
                    }}
                    style={({ pressed }) => [
                      styles.lockChip,
                      active && styles.lockChipActive,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[styles.lockChipText, active && styles.lockChipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <MaterialIcons name="key" size={14} color={colors.onSurfaceMuted} />
              <Text style={styles.label}>LLM API Key</Text>
            </View>
            <GlassInput
              style={styles.input}
              value={llmKey}
              onChangeText={setLlmKey}
              placeholder="sk-..."
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              OpenRouter or Groq key. Only stored on this device.
            </Text>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <MaterialIcons name="smart-toy" size={14} color={colors.onSurfaceMuted} />
              <Text style={styles.label}>Model</Text>
            </View>
            <GlassInput
              style={styles.input}
              value={llmModelName}
              onChangeText={setLlmModelName}
              placeholder={DEFAULT_LLM_MODEL[llmProviderId]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttons}>
            <GlassButton variant="primary" onPress={handleSaveLlm}>
              Save Brain
            </GlassButton>
          </View>
        </GlassCard>

        <View style={styles.sectionHeader}>
          <MaterialIcons name="lock" size={16} color={colors.primary} />
          <Text style={styles.sectionLabel}>SECURITY & PRIVACY</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.securityRow, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/security')}
        >
          <View style={styles.securityLeft}>
            <MaterialIcons name="fingerprint" size={20} color={colors.primary} />
            <View>
              <Text style={styles.securityTitle}>Screen Lock</Text>
              <Text style={styles.securitySub}>Fingerprint or PIN authentication</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={colors.onSurface} />
        </Pressable>

        <GlassCard>
          <View style={styles.lockSectionHeader}>
            <MaterialIcons name="timer" size={16} color={colors.primary} />
            <Text style={styles.lockSectionLabel}>AUTO-LOCK AFTER</Text>
          </View>
          <View style={styles.lockChips}>
            {LOCK_MODES.map((mode) => {
              const active = lockMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setLockMode(mode)}
                  style={({ pressed }) => [
                    styles.lockChip,
                    active && styles.lockChipActive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.lockChipText, active && styles.lockChipTextActive]}>
                    {LOCK_MODE_LABELS[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.lockHint}>
            App locks after this time away instead of instantly. "On exit" locks right away.
          </Text>
        </GlassCard>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 28,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: radius.input,
    backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  banner: {},
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerText: { color: colors.onSurface, fontSize: 12, lineHeight: 18, flex: 1 },
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...typography.labelSm, color: colors.onSurface },
  input: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  hint: { color: colors.onSurface, fontSize: 11 },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  statusBanner: {},
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  sectionLabel: { ...typography.labelMd, color: colors.primary },
  securityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.glassBg, borderRadius: radius.card,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder,
  },
  securityLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  securityTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  securitySub: { ...typography.labelSm, color: colors.onSurface, marginTop: 2 },
  lockSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  lockSectionLabel: { ...typography.labelMd, color: colors.primary },
  providerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lockChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lockChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
  },
  lockChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '1A',
  },
  lockChipText: { ...typography.labelSm, color: colors.onSurface },
  lockChipTextActive: { color: colors.primary, fontWeight: '700' },
  lockHint: { ...typography.labelSm, color: colors.onSurfaceMuted, marginTop: spacing.sm, lineHeight: 16 },
});
