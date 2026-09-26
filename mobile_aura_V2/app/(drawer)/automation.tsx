import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { TopHudBar } from '../../src/components/navigation/TopHudBar';
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { Toast } from '../../src/components/shared/Toast';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { sendToPc, speakOnPc } from '../../src/api/client';
import { executeMobileCapability } from '../../src/capabilities/mobileExecutor';

type Segment = 'phone' | 'pc';

const PRANK_PRESETS = [
  'Step away from my computer right now.',
  'Intruder alert detected. Taking security snapshot.',
  'Hands off the keyboard, Kenaz is watching.',
  'Self-destruct sequence initiated in 10 seconds.',
  'Warning: Unauthorized access recorded.',
];

interface PhoneShortcutItem {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  app?: string;
  capability?: string;
  desc: string;
}

const PHONE_SHORTCUTS: PhoneShortcutItem[] = [
  { id: 'whatsapp', label: 'WhatsApp', iconName: 'logo-whatsapp', app: 'com.whatsapp', desc: 'Chat & voice matrix' },
  { id: 'instagram', label: 'Instagram', iconName: 'logo-instagram', app: 'com.instagram.android', desc: 'Social media stream' },
  { id: 'youtube', label: 'YouTube', iconName: 'logo-youtube', app: 'com.google.android.youtube', desc: 'Video & audio search' },
  { id: 'camera_front', label: 'Front Camera', iconName: 'camera-reverse-outline', capability: 'camera_front', desc: 'Selfie viewfinder' },
  { id: 'settings', label: 'System Settings', iconName: 'settings-outline', capability: 'open_settings', desc: 'Android parameters' },
  { id: 'battery', label: 'Battery Telemetry', iconName: 'battery-charging-outline', capability: 'get_battery_level', desc: 'Power diagnostics' },
  { id: 'wifi', label: 'Network Matrix', iconName: 'wifi-outline', capability: 'get_wifi_status', desc: 'WiFi connectivity' },
  { id: 'dialer', label: 'Phone Dialer', iconName: 'call-outline', capability: 'make_call', desc: 'Voice telecommunications' },
];

export default function AutomationScreen() {
  const [segment, setSegment] = useState<Segment>('phone');
  const [prankText, setPrankText] = useState('');
  const [isSendingPrank, setIsSendingPrank] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'error' | 'info' | 'success' });

  const { pcConnected } = useAppStore();

  const showToast = (message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handlePrankSend = async (customPhrase?: string) => {
    const textToSend = customPhrase || prankText.trim();
    if (!textToSend) {
      showToast('Enter a message to speak on PC', 'error');
      return;
    }

    if (!pcConnected) {
      showToast('PC is offline. Check backend link in Settings.', 'error');
      return;
    }

    setIsSendingPrank(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const success = await speakOnPc(textToSend);
    setIsSendingPrank(false);

    if (success) {
      showToast(`AURA speaking on PC: "${textToSend.slice(0, 30)}..."`, 'success');
      setPrankText('');
    } else {
      showToast('Failed to trigger PC voice synthesis', 'error');
    }
  };

  const handlePcAction = async (actionName: string, tool: string, params: Record<string, unknown> = {}) => {
    if (!pcConnected) {
      showToast('PC is offline. Link in Settings.', 'error');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`Dispatching ${actionName}...`, 'info');
      await sendToPc(tool, params);
      showToast(`${actionName} executed successfully`, 'success');
    } catch (e) {
      showToast(`Failed to execute ${actionName}`, 'error');
    }
  };

  const handlePhoneShortcut = async (shortcut: PhoneShortcutItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (shortcut.app) {
        await executeMobileCapability('open_app', { package: shortcut.app });
        showToast(`Launching ${shortcut.label}`, 'success');
      } else if (shortcut.capability) {
        const res = await executeMobileCapability(shortcut.capability as any, {});
        showToast(res.message, res.success ? 'success' : 'info');
      }
    } catch {
      showToast(`Could not trigger ${shortcut.label}`, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <TopHudBar title="AUTOMATION" subtitle="TASK & ACTION HUB" />

      {/* Segmented Switcher */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentBtn, segment === 'phone' && styles.segmentBtnActive]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setSegment('phone');
          }}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={16}
            color={segment === 'phone' ? Colors.cyan.primary : Colors.text.dim}
          />
          <Text style={[styles.segmentText, segment === 'phone' && styles.segmentTextActive]}>
            PHONE AGENT
          </Text>
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, segment === 'pc' && styles.segmentBtnActive]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setSegment('pc');
          }}
        >
          <Ionicons
            name="desktop-outline"
            size={16}
            color={segment === 'pc' ? Colors.purple.light : Colors.text.dim}
          />
          <Text style={[styles.segmentText, segment === 'pc' && styles.segmentTextActive]}>
            PC ACTIONS
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {segment === 'phone' ? (
          <>
            {/* Accessibility Core Status Banner */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
                  <Ionicons name="scan-outline" size={20} color={Colors.cyan.primary} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Accessibility Screen Engine</Text>
                  <Text style={styles.cardSubtitle}>Autonomous UI reading & coordinate interaction</Text>
                </View>
              </View>

              <View style={styles.serviceStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: Colors.cyan.primary }]} />
                <Text style={styles.serviceStatusText}>ENGINE ARMED // ONE UI READY</Text>
              </View>

              <Text style={styles.serviceDesc}>
                AURA parses active screen nodes, calculates touch coordinates, and automates multi-step app flows via native Android Accessibility Service.
              </Text>
            </View>

            {/* Quick Phone Automations */}
            <Text style={styles.sectionHeader}>ON-DEVICE SHORTCUTS</Text>
            <View style={styles.grid}>
              {PHONE_SHORTCUTS.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}
                  onPress={() => handlePhoneShortcut(s)}
                >
                  <View style={styles.gridIconWrap}>
                    <Ionicons name={s.iconName} size={20} color={Colors.cyan.primary} />
                  </View>
                  <Text style={styles.gridLabel}>{s.label}</Text>
                  <Text style={styles.gridDesc} numberOfLines={1}>{s.desc}</Text>
                </Pressable>
              ))}
            </View>

            {/* Recent Tasks Stream */}
            <Text style={styles.sectionHeader}>TASK AUDIT STREAM</Text>
            <View style={styles.card}>
              <View style={styles.taskRow}>
                <View style={[styles.taskBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={[styles.taskBadgeText, { color: Colors.green.bright }]}>COMPLETED</Text>
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>FastPath Intent Parsed</Text>
                  <Text style={styles.taskTime}>Zero LLM Latency Engine</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.taskRow}>
                <View style={[styles.taskBadge, { backgroundColor: 'rgba(106, 83, 153, 0.2)' }]}>
                  <Text style={[styles.taskBadgeText, { color: Colors.purple.light }]}>INITIALIZED</Text>
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>Neural Core Synced</Text>
                  <Text style={styles.taskTime}>Boot Sequence · Standalone</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Speak on PC (The Prank Tool) */}
            <View style={[styles.card, styles.prankCard]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(157, 101, 255, 0.15)' }]}>
                  <Ionicons name="volume-high-outline" size={20} color={Colors.purple.light} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Speak Through PC</Text>
                  <Text style={styles.cardSubtitle}>Broadcast voice synthesis via PC speakers</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.prankInput}
                  placeholder="Type words for AURA to speak through PC..."
                  placeholderTextColor={Colors.text.dim}
                  value={prankText}
                  onChangeText={setPrankText}
                  multiline={false}
                  onSubmitEditing={() => handlePrankSend()}
                />
                <Pressable
                  style={[styles.prankSendBtn, isSendingPrank && { opacity: 0.5 }]}
                  onPress={() => handlePrankSend()}
                  disabled={isSendingPrank}
                >
                  <Text style={styles.prankSendBtnText}>SPEAK</Text>
                </Pressable>
              </View>

              <Text style={styles.presetLabel}>QUICK PRANK BROADCASTS</Text>
              <View style={styles.presetWrap}>
                {PRANK_PRESETS.map((preset, idx) => (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [styles.presetChip, pressed && { opacity: 0.7 }]}
                    onPress={() => handlePrankSend(preset)}
                  >
                    <Text style={styles.presetText} numberOfLines={1}>{preset}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* PC Remote Quick Actions */}
            <Text style={styles.sectionHeader}>DESKTOP REMOTE ACTIONS</Text>
            <View style={styles.grid}>
              <Pressable
                style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}
                onPress={() => handlePcAction('Lock PC', 'lock_pc')}
              >
                <View style={styles.gridIconWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.cyan.primary} />
                </View>
                <Text style={styles.gridLabel}>Lock PC</Text>
                <Text style={styles.gridDesc}>Instant desktop lock</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}
                onPress={() => handlePcAction('Sleep PC', 'sleep_pc')}
              >
                <View style={styles.gridIconWrap}>
                  <Ionicons name="moon-outline" size={20} color={Colors.cyan.primary} />
                </View>
                <Text style={styles.gridLabel}>Sleep PC</Text>
                <Text style={styles.gridDesc}>Low power suspend</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}
                onPress={() => handlePcAction('Toggle Media', 'play_pause')}
              >
                <View style={styles.gridIconWrap}>
                  <Ionicons name="play-outline" size={20} color={Colors.cyan.primary} />
                </View>
                <Text style={styles.gridLabel}>Media Play/Pause</Text>
                <Text style={styles.gridDesc}>Global media session</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}
                onPress={() => handlePcAction('Mute Audio', 'mute_audio')}
              >
                <View style={styles.gridIconWrap}>
                  <Ionicons name="volume-mute-outline" size={20} color={Colors.cyan.primary} />
                </View>
                <Text style={styles.gridLabel}>Mute / Unmute</Text>
                <Text style={styles.gridDesc}>PC Master Volume</Text>
              </Pressable>
            </View>
          </>
        )}

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
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: 'rgba(8, 8, 12, 0.75)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(106, 83, 153, 0.25)',
    borderColor: Colors.purple.primary,
  },
  segmentText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.dim,
    letterSpacing: 0.8,
  },
  segmentTextActive: {
    color: Colors.text.primary,
  },

  card: {
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  prankCard: {
    borderColor: 'rgba(106, 83, 153, 0.45)',
    shadowColor: Colors.purple.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginTop: 2,
  },

  serviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serviceStatusText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.cyan.bright,
    letterSpacing: 0.8,
  },
  serviceDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },

  sectionHeader: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.text.dim,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  gridIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  gridDesc: {
    fontSize: 10,
    color: Colors.text.dim,
  },

  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  prankInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.primary,
  },
  prankSendBtn: {
    backgroundColor: Colors.purple.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prankSendBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  presetLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.purple.soft,
    letterSpacing: 1,
    marginTop: 6,
  },
  presetWrap: {
    flexDirection: 'column',
    gap: 6,
  },
  presetChip: {
    backgroundColor: 'rgba(106, 83, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(106, 83, 153, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10.5,
    color: Colors.text.primary,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskBadgeText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    fontWeight: '700',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  taskTime: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    color: Colors.text.dim,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
