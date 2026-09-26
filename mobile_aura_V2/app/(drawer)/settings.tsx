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
import { Ionicons } from '@expo/vector-icons';
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

const PROVIDERS: { id: LLMProvider; name: string; iconName: keyof typeof Ionicons.glyphMap; freeInfo: string }[] = [
  { id: 'groq', name: 'Groq', iconName: 'flash-outline', freeInfo: 'Ultra-fast 70B' },
  { id: 'openrouter', name: 'OpenRouter', iconName: 'globe-outline', freeInfo: 'Generous free tier' },
  { id: 'nvidia', name: 'Nvidia NIM', iconName: 'hardware-chip-outline', freeInfo: 'Nemotron & Llama' },
  { id: 'cerebras', name: 'Cerebras', iconName: 'rocket-outline', freeInfo: 'Wafer speed' },
  { id: 'custom', name: 'Custom URL', iconName: 'construct-outline', freeInfo: 'Local / OpenAI API' },
];

export default function SettingsScreen() {
  const {
    toolProvider,
    toolModel,
    chatProvider,
    chatModel,
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
    setToolProvider,
    setToolModel,
    setChatProvider,
    setChatModel,
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
        {/* 1. Tool Execution Engine Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
              <Ionicons name="flash-outline" size={20} color={Colors.cyan.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Tool & Action Planner Engine</Text>
              <Text style={styles.cardSubtitle}>Sub-second execution for device tools & plans</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>TOOL PROVIDER</Text>
          <View style={styles.providerGrid}>
            {PROVIDERS.map((p) => {
              const isSelected = toolProvider === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.providerCard, isSelected && styles.providerCardActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setToolProvider(p.id);
                  }}
                >
                  <Ionicons
                    name={p.iconName}
                    size={16}
                    color={isSelected ? Colors.cyan.primary : Colors.text.dim}
                  />
                  <Text style={[styles.providerName, isSelected && styles.providerNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={styles.providerSub} numberOfLines={1}>{p.freeInfo}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Conversational Brain Engine Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(106, 83, 153, 0.2)' }]}>
              <Ionicons name="chatbubbles-outline" size={20} color={Colors.purple.light} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Conversational Chat Brain</Text>
              <Text style={styles.cardSubtitle}>Dialogue & general reasoning provider</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>CHAT PROVIDER</Text>
          <View style={styles.providerGrid}>
            {PROVIDERS.map((p) => {
              const isSelected = chatProvider === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.providerCard, isSelected && styles.providerCardActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setChatProvider(p.id);
                  }}
                >
                  <Ionicons
                    name={p.iconName}
                    size={16}
                    color={isSelected ? Colors.purple.light : Colors.text.dim}
                  />
                  <Text style={[styles.providerName, isSelected && styles.providerNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={styles.providerSub} numberOfLines={1}>{p.freeInfo}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. API Keys Management Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.12)' }]}>
              <Ionicons name="key-outline" size={20} color={Colors.gold.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>API Keys & Endpoints</Text>
              <Text style={styles.cardSubtitle}>Configure authentication for active providers</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>GROQ API KEY (Recommended for Tools)</Text>
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

          <Pressable style={styles.showKeyBtn} onPress={() => setShowKeys(!showKeys)}>
            <Ionicons name={showKeys ? 'eye-off-outline' : 'eye-outline'} size={14} color={Colors.purple.light} />
            <Text style={styles.showKeyText}>{showKeys ? 'Hide Keys' : 'Show Keys'}</Text>
          </Pressable>
        </View>

        {/* 4. Voice & Neural Audio */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
              <Ionicons name="volume-high-outline" size={20} color={Colors.cyan.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Voice Synthesis</Text>
              <Text style={styles.cardSubtitle}>Instant speech streaming & pitch calibration</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Voice Output Enabled</Text>
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
                  <Text style={styles.genderText}>Ava / Scarlett (Warm Neural)</Text>
                </Pressable>
                <Pressable
                  style={[styles.genderBtn, voiceGender === 'male' && styles.genderBtnActive]}
                  onPress={() => setVoiceGender('male')}
                >
                  <Text style={styles.genderText}>JARVIS / Guy (Synthetic)</Text>
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
                <Ionicons name="play-outline" size={14} color={Colors.cyan.bright} />
                <Text style={styles.testVoiceText}>TEST INSTANT SPEECH</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* 5. PC Backend Link */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="desktop-outline" size={20} color={Colors.green.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Desktop Companion Link</Text>
              <Text style={styles.cardSubtitle}>Windows AURA Daemon (Port 8000)</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>PC IP / BACKEND ENDPOINT</Text>
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
            <Ionicons name="pulse-outline" size={14} color={Colors.green.bright} />
            <Text style={styles.testPcText}>{isTestingPc ? 'PINGING...' : 'TEST PC LINK'}</Text>
          </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  showKeyText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.purple.light,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: Colors.cyan.dim,
    borderRadius: 10,
    paddingVertical: 9,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: Colors.green.dim,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 4,
  },
  testPcText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.green.bright,
    letterSpacing: 1,
  },
});
