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
import { useRouter } from 'expo-router';
import { useSettingsStore, FREE_MODELS } from '../../src/store/settingsStore';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    openrouterApiKey,
    llmModel,
    ttsEnabled,
    ttsSpeed,
    pcBackendUrl,
    setApiKey,
    setModel,
    setTtsEnabled,
    setTtsSpeed,
    setPcBackendUrl,
  } = useSettingsStore();

  const [localKey, setLocalKey] = useState(openrouterApiKey);
  const [localModel, setLocalModel] = useState(llmModel);
  const [localPcUrl, setLocalPcUrl] = useState(pcBackendUrl);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setLocalKey(openrouterApiKey);
    setLocalModel(llmModel);
    setLocalPcUrl(pcBackendUrl);
  }, [openrouterApiKey, llmModel, pcBackendUrl]);

  const saveKey = () => setApiKey(localKey);
  const saveModel = () => setModel(localModel);
  const savePcUrl = () => setPcBackendUrl(localPcUrl);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* AI Engine Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(0, 240, 255, 0.1)' }]}>
              <Text style={styles.cardIconText}>🧠</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>AI Engine</Text>
              <Text style={styles.cardSubtitle}>OpenRouter / OpenAI-compatible API</Text>
            </View>
          </View>

          {/* API Key */}
          <Text style={styles.fieldLabel}>API Key</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={localKey}
              onChangeText={setLocalKey}
              onBlur={saveKey}
              placeholder="sk-or-..."
              placeholderTextColor={Colors.text.dim}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowKey(!showKey)}>
              <Text style={styles.eyeIcon}>{showKey ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          {/* Model */}
          <Text style={styles.fieldLabel}>Model</Text>
          <TextInput
            style={styles.input}
            value={localModel}
            onChangeText={setLocalModel}
            onBlur={saveModel}
            placeholder="openrouter/free"
            placeholderTextColor={Colors.text.dim}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Free Models */}
          <Text style={styles.fieldLabel}>Free Models</Text>
          <View style={styles.chipRow}>
            {FREE_MODELS.map((model) => (
              <Pressable
                key={model.id}
                style={({ pressed }) => [
                  styles.chip,
                  localModel === model.id && styles.chipActive,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setLocalModel(model.id);
                  setModel(model.id);
                }}
              >
                <Text style={[styles.chipText, localModel === model.id && styles.chipTextActive]}>
                  {model.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* TTS Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(0, 240, 255, 0.1)' }]}>
              <Text style={styles.cardIconText}>🔊</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Voice</Text>
              <Text style={styles.cardSubtitle}>Text-to-speech on replies</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable TTS</Text>
            <Switch
              value={ttsEnabled}
              onValueChange={setTtsEnabled}
              trackColor={{ false: Colors.surface, true: Colors.cyan.glow }}
              thumbColor={ttsEnabled ? Colors.cyan.primary : Colors.text.dim}
            />
          </View>

          {ttsEnabled && (
            <View style={styles.sliderSection}>
              <Text style={styles.fieldLabel}>Speed: {ttsSpeed.toFixed(1)}x</Text>
              <View style={styles.speedRow}>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                  <Pressable
                    key={speed}
                    style={({ pressed }) => [
                      styles.speedBtn,
                      ttsSpeed === speed && styles.speedBtnActive,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setTtsSpeed(speed)}
                  >
                    <Text style={[styles.speedBtnText, ttsSpeed === speed && styles.speedBtnTextActive]}>
                      {speed}x
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* PC Connection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(0, 240, 255, 0.1)' }]}>
              <Text style={styles.cardIconText}>💻</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>PC Backend</Text>
              <Text style={styles.cardSubtitle}>Optional — for PC control features</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Backend URL</Text>
          <TextInput
            style={styles.input}
            value={localPcUrl}
            onChangeText={setLocalPcUrl}
            onBlur={savePcUrl}
            placeholder="http://192.168.1.X:8000"
            placeholderTextColor={Colors.text.dim}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* About Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(0, 240, 255, 0.1)' }]}>
              <Text style={styles.cardIconText}>ℹ</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>AURA Mobile</Text>
              <Text style={styles.cardSubtitle}>v2.0.0 — Neural Interface</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    height: 56,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    padding: Theme.spacing.sm,
    width: 40,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.cyan.primary,
  },
  headerTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  scroll: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
    gap: Theme.spacing.md,
  },

  card: {
    backgroundColor: 'rgba(17, 17, 24, 0.65)',
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
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
    fontSize: 11,
    color: Colors.text.dim,
    marginTop: 1,
  },

  fieldLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: 2,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    color: Colors.text.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  eyeBtn: {
    padding: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
  },
  eyeIcon: {
    fontSize: 16,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: Colors.cyan.glow,
    borderColor: Colors.cyan.primary,
  },
  chipText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: Colors.cyan.primary,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    color: Colors.text.primary,
  },

  sliderSection: {
    marginTop: 4,
  },
  speedRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
  },
  speedBtnActive: {
    backgroundColor: Colors.cyan.glow,
    borderColor: Colors.cyan.primary,
  },
  speedBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    color: Colors.text.secondary,
  },
  speedBtnTextActive: {
    color: Colors.cyan.primary,
  },
});
