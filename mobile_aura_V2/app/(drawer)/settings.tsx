import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettingsStore, PRESET_MODELS, type LLMProvider } from '../../src/store/settingsStore';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { TopHudBar } from '../../src/components/navigation/TopHudBar';
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { Toast } from '../../src/components/shared/Toast';
import { checkPcConnection } from '../../src/api/client';
import { speak } from '../../src/services/tts';

const PROVIDERS: { id: LLMProvider; name: string; icon: string; freeInfo: string }[] = [
  { id: 'groq', name: 'Groq', icon: '⚡', freeInfo: 'Ultra-fast 70B' },
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', freeInfo: 'Generous free tier' },
  { id: 'nvidia', name: 'Nvidia NIM', icon: '🟢', freeInfo: 'Nemotron & Llama' },
  { id: 'cerebras', name: 'Cerebras', icon: '🚀', freeInfo: 'Wafer speed' },
  { id: 'custom', name: 'Custom URL', icon: '🛠️', freeInfo: 'Local / OpenAI API' },
];

export default function SettingsScreen() {
  const {
    activeProvider,
    llmModel,
    groqApiKey,
    openrouterApiKey,
    nvidiaApiKey,
    cerebrasApiKey,
    customEndpointUrl,
    customApiKey,
    ttsEnabled,
    ttsSpeed,
    voiceGender,
    pcBackendUrl,
    mobileApiKey,
    setActiveProvider,
    setModel,
    setGroqApiKey,
    setOpenrouterApiKey,
    setNvidiaApiKey,
    setCerebrasApiKey,
    setCustomConfig,
    setTtsEnabled,
    setTtsSpeed,
    setVoiceGender,
    setPcBackendUrl,
  } = useSettingsStore();

  const [localGroqKey, setLocalGroqKey] = useState(groqApiKey);
  const [localOrKey, setLocalOrKey] = useState(openrouterApiKey);
  const [localNvidiaKey, setLocalNvidiaKey] = useState(nvidiaApiKey);
  const [localCerebrasKey, setLocalCerebrasKey] = useState(cerebrasApiKey);
  const [localCustomUrl, setLocalCustomUrl] = useState(customEndpointUrl);
  const [localCustomKey, setLocalCustomKey] = useState(customApiKey);
  const [localPcUrl, setLocalPcUrl] = useState(pcBackendUrl);
  const [showKeys, setShowKeys] = useState(false);
  const [isTestingPc, setIsTestingPc] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'error' | 'info' | 'success' });

  useEffect(() => {
    setLocalGroqKey(groqApiKey);
    setLocalOrKey(openrouterApiKey);
    setLocalNvidiaKey(nvidiaApiKey);
    setLocalCerebrasKey(cerebrasApiKey);
    setLocalCustomUrl(customEndpointUrl);
    setLocalCustomKey(customApiKey);
    setLocalPcUrl(pcBackendUrl);
  }, [
    groqApiKey,
    openrouterApiKey,
    nvidiaApiKey,
    cerebrasApiKey,
    customEndpointUrl,
    customApiKey,
    pcBackendUrl,
  ]);

  const showToast = (message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleTestVoice = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast('Testing AURA voice stream...', 'info');
      await speak('Neural voice pipeline active. All systems functioning smoothly, Kenaz.');
    } catch {
      showToast('Speech test failed', 'error');
    }
  };

  const handleTestPc = async () => {
    setIsTestingPc(true);
    setPcBackendUrl(localPcUrl);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const isOnline = await checkPcConnection();
      if (isOnline) {
        showToast('PC Backend link verified: ONLINE', 'success');
      } else {
        showToast('PC unreachable. Check IP address & port 8000', 'error');
      }
    } catch {
      showToast('Connection test error', 'error');
    } finally {
      setIsTestingPc(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <TopHudBar title="SETTINGS" subtitle="SYSTEM CONFIG MATRIX" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* AI LLM Brain Matrix */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(106, 83, 153, 0.2)' }]}>
              <Text style={styles.cardIcon}>🧠</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Intelligence Core</Text>
              <Text style={styles.cardSubtitle}>Multi-Provider LLM Routing</Text>
            </View>
          </View>

          {/* Provider Selection Tabs */}
          <Text style={styles.fieldLabel}>ACTIVE PROVIDER</Text>
          <View style={styles.providerGrid}>
            {PROVIDERS.map((p) => {
              const isSelected = activeProvider === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.providerCard, isSelected && styles.providerCardActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setActiveProvider(p.id);
                  }}
                >
                  <Text style={styles.providerIcon}>{p.icon}</Text>
                  <Text style={[styles.providerName, isSelected && styles.providerNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={styles.providerSub} numberOfLines={1}>{p.freeInfo}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Active Provider Key Inputs */}
          {activeProvider === 'groq' && (
            <View style={styles.keySection}>
              <Text style={styles.fieldLabel}>GROQ API KEY</Text>
              <TextInput
                style={styles.input}
                value={localGroqKey}
                onChangeText={setLocalGroqKey}
                onBlur={() => setGroqApiKey(localGroqKey)}
                placeholder="gsk_..."
                placeholderTextColor={Colors.text.dim}
                secureTextEntry={!showKeys}
                autoCapitalize="none"
              />
            </View>
          )}

          {activeProvider === 'openrouter' && (
            <View style={styles.keySection}>
              <Text style={styles.fieldLabel}>OPENROUTER API KEY</Text>
              <TextInput
                style={styles.input}
                value={localOrKey}
                onChangeText={setLocalOrKey}
                onBlur={() => setOpenrouterApiKey(localOrKey)}
                placeholder="sk-or-v1-..."
                placeholderTextColor={Colors.text.dim}
                secureTextEntry={!showKeys}
                autoCapitalize="none"
              />
            </View>
          )}

          {activeProvider === 'nvidia' && (
            <View style={styles.keySection}>
              <Text style={styles.fieldLabel}>NVIDIA NIM API KEY</Text>
              <TextInput
                style={styles.input}
                value={localNvidiaKey}
                onChangeText={setLocalNvidiaKey}
                onBlur={() => setNvidiaApiKey(localNvidiaKey)}
                placeholder="nvapi-..."
                placeholderTextColor={Colors.text.dim}
                secureTextEntry={!showKeys}
                autoCapitalize="none"
              />
            </View>
          )}

          {activeProvider === 'cerebras' && (
            <View style={styles.keySection}>
              <Text style={styles.fieldLabel}>CEREBRAS API KEY</Text>
              <TextInput
                style={styles.input}
                value={localCerebrasKey}
                onChangeText={setLocalCerebrasKey}
                onBlur={() => setCerebrasApiKey(localCerebrasKey)}
                placeholder="csk-..."
                placeholderTextColor={Colors.text.dim}
                secureTextEntry={!showKeys}
                autoCapitalize="none"
              />
            </View>
          )}

          {activeProvider === 'custom' && (
            <View style={styles.keySection}>
              <Text style={styles.fieldLabel}>CUSTOM ENDPOINT URL</Text>
              <TextInput
                style={styles.input}
                value={localCustomUrl}
                onChangeText={setLocalCustomUrl}
                onBlur={() => setCustomConfig(localCustomUrl, localCustomKey)}
                placeholder="https://your-endpoint/v1/chat/completions"
                placeholderTextColor={Colors.text.dim}
                autoCapitalize="none"
              />
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>CUSTOM API KEY (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                value={localCustomKey}
                onChangeText={setLocalCustomKey}
                onBlur={() => setCustomConfig(localCustomUrl, localCustomKey)}
                placeholder="Bearer key..."
                placeholderTextColor={Colors.text.dim}
                secureTextEntry={!showKeys}
                autoCapitalize="none"
              />
            </View>
          )}

          <Pressable style={styles.showKeyBtn} onPress={() => setShowKeys(!showKeys)}>
            <Text style={styles.showKeyText}>{showKeys ? '🙈 Hide API Keys' : '👁 Show API Keys'}</Text>
          </Pressable>

          {/* Model Presets */}
          <Text style={styles.fieldLabel}>AVAILABLE PRESET MODELS</Text>
          <View style={styles.modelList}>
            {PRESET_MODELS.filter(
              (m) => activeProvider === 'custom' || m.provider === activeProvider
            ).map((model) => {
              const isCurrent = llmModel === model.id;
              return (
                <Pressable
                  key={model.id}
                  style={[styles.modelItem, isCurrent && styles.modelItemActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setModel(model.id);
                  }}
                >
                  <View style={styles.modelInfo}>
                    <View style={styles.modelHeaderRow}>
                      <Text style={[styles.modelTitle, isCurrent && { color: Colors.cyan.primary }]}>
                        {model.name}
                      </Text>
                      {model.isFree && (
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeBadgeText}>FREE TIER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modelDesc}>{model.description}</Text>
                  </View>
                  {isCurrent && <Text style={styles.checkIcon}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Voice & Neural Synthesis */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
              <Text style={styles.cardIcon}>🔊</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Voice Synthesis</Text>
              <Text style={styles.cardSubtitle}>Neural Audio Streaming Engine</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Voice Response Enabled</Text>
            <Switch
              value={ttsEnabled}
              onValueChange={setTtsEnabled}
              trackColor={{ false: Colors.surface, true: Colors.purple.primary }}
              thumbColor={ttsEnabled ? Colors.cyan.primary : Colors.text.dim}
            />
          </View>

          {ttsEnabled && (
            <>
              <Text style={styles.fieldLabel}>VOICE PROFILE</Text>
              <View style={styles.genderRow}>
                <Pressable
                  style={[styles.genderBtn, voiceGender === 'female' && styles.genderBtnActive]}
                  onPress={() => setVoiceGender('female')}
                >
                  <Text style={styles.genderText}>🌸 Ava / Scarlett (Warm Neural)</Text>
                </Pressable>
                <Pressable
                  style={[styles.genderBtn, voiceGender === 'male' && styles.genderBtnActive]}
                  onPress={() => setVoiceGender('male')}
                >
                  <Text style={styles.genderText}>🤖 JARVIS / Guy (Synthetic)</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>SPEECH RATE: {ttsSpeed.toFixed(1)}x</Text>
              <View style={styles.speedRow}>
                {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                  <Pressable
                    key={speed}
                    style={[styles.speedBtn, ttsSpeed === speed && styles.speedBtnActive]}
                    onPress={() => setTtsSpeed(speed)}
                  >
                    <Text
                      style={[
                        styles.speedText,
                        ttsSpeed === speed && { color: Colors.cyan.primary, fontWeight: '700' },
                      ]}
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.testVoiceBtn} onPress={handleTestVoice}>
                <Text style={styles.testVoiceText}>▶ TEST VOICE SYNTHESIS</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* PC Backend Bridge */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Text style={styles.cardIcon}>💻</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Desktop Companion Link</Text>
              <Text style={styles.cardSubtitle}>Windows AURA Daemon (Port 8000)</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>PC IP / ENDPOINT URL</Text>
          <TextInput
            style={styles.input}
            value={localPcUrl}
            onChangeText={setLocalPcUrl}
            onBlur={() => setPcBackendUrl(localPcUrl)}
            placeholder="http://192.168.1.X:8000"
            placeholderTextColor={Colors.text.dim}
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.testPcBtn, isTestingPc && { opacity: 0.6 }]}
            onPress={handleTestPc}
            disabled={isTestingPc}
          >
            <Text style={styles.testPcText}>{isTestingPc ? 'PINGING...' : '⚡ TEST PC LINK'}</Text>
          </Pressable>
        </View>

        {/* Device Information */}
        <View style={styles.card}>
          <Text style={styles.infoTitle}>AURA MOBILE MATRIX</Text>
          <Text style={styles.infoDetail}>Hardware: Samsung Galaxy F15 // One UI</Text>
          <Text style={styles.infoDetail}>Architecture: React Native 0.86.3 // Expo SDK 57</Text>
          <Text style={styles.infoDetail}>On-Device Routing: Needle SLM Engine</Text>
          <Text style={styles.infoDetail}>Build: v2.0.0 (Phase 1 Complete)</Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <BottomTabBar />

      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast({ visible: false, message: '', type: 'info' })}
        type={toast.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 16,
    gap: 14,
  },

  card: {
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 18,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cardSubtitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.text.dim,
    marginTop: 1,
  },

  fieldLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.text.secondary,
    letterSpacing: 1,
    marginTop: 4,
  },

  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  providerCardActive: {
    backgroundColor: 'rgba(106, 83, 153, 0.22)',
    borderColor: Colors.purple.primary,
  },
  providerIcon: {
    fontSize: 16,
  },
  providerName: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  providerNameActive: {
    color: Colors.text.primary,
  },
  providerSub: {
    fontSize: 9.5,
    color: Colors.text.dim,
  },

  keySection: {
    marginTop: 4,
    gap: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.primary,
  },
  showKeyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  showKeyText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.purple.light,
  },

  modelList: {
    gap: 6,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    padding: 10,
  },
  modelItemActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderColor: Colors.cyan.dim,
  },
  modelInfo: {
    flex: 1,
    gap: 2,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8,
    fontWeight: '700',
    color: Colors.green.bright,
  },
  modelDesc: {
    fontSize: 10,
    color: Colors.text.dim,
  },
  checkIcon: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 14,
    color: Colors.cyan.primary,
    fontWeight: '700',
    marginLeft: 8,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.primary,
  },

  genderRow: {
    flexDirection: 'column',
    gap: 6,
  },
  genderBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  genderBtnActive: {
    backgroundColor: 'rgba(106, 83, 153, 0.25)',
    borderColor: Colors.purple.primary,
  },
  genderText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    color: Colors.text.primary,
  },

  speedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  speedBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: Colors.cyan.primary,
  },
  speedText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    color: Colors.text.secondary,
  },

  testVoiceBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: Colors.cyan.dim,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 6,
  },
  testVoiceText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.cyan.bright,
    letterSpacing: 1,
  },

  testPcBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: Colors.green.dim,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 4,
  },
  testPcText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.green.bright,
    letterSpacing: 1,
  },

  infoTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.purple.light,
    letterSpacing: 1,
  },
  infoDetail: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.text.dim,
  },
});
