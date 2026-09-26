import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Orb } from '../../src/components/orb/Orb';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { TopHudBar } from '../../src/components/navigation/TopHudBar';
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore, PRESET_MODELS } from '../../src/store/settingsStore';
import { checkPcConnection } from '../../src/api/client';
import { getOrbConfig } from '../../src/components/orb/OrbStateMachine';

interface ActionCardItem {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  route: '/' | '/chat' | '/automation' | '/settings';
  desc: string;
}

const QUICK_ACTIONS: ActionCardItem[] = [
  { id: 'chat', label: 'Neural Chat Stream', iconName: 'chatbubbles-outline', route: '/chat', desc: 'Realtime intelligence & voice' },
  { id: 'automation', label: 'Automation Matrix', iconName: 'flash-outline', route: '/automation', desc: 'FastPath tools & PC actions' },
  { id: 'desktop', label: 'PC Live Telemetry', iconName: 'stats-chart-outline', route: '/desktop' as any, desc: 'Hardware vitals & media' },
  { id: 'settings', label: 'System Configuration', iconName: 'options-outline', route: '/settings', desc: 'Dual-provider & audio config' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { orbState, pcConnected, setOrbState, setPcConnected } = useAppStore();
  const { toolModel, chatModel, toolProvider, chatProvider } = useSettingsStore();

  const orbConfig = getOrbConfig(orbState);

  useEffect(() => {
    checkPcConnection().then((ok) => setPcConnected(ok));
  }, []);

  const time = new Date().getHours();
  let greeting = 'Good evening';
  if (time >= 5 && time < 12) greeting = 'Good morning';
  else if (time >= 12 && time < 17) greeting = 'Good afternoon';

  const toolModelName =
    PRESET_MODELS.find((m) => m.id === toolModel)?.name || toolModel || 'Llama 3.3 70B';
  const chatModelName =
    PRESET_MODELS.find((m) => m.id === chatModel)?.name || chatModel || 'Auto Free Router';

  const handleOrbTap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    router.push('/chat');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <TopHudBar title="AURA" subtitle="NEURAL COPILOT // ONLINE" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Interactive Hero 3D Particle Swarm Orb with Encompassing Cradle */}
        <View style={styles.orbSection}>
          <Orb state={orbState} size={110} onPress={handleOrbTap} showCradle />

          <Pressable style={styles.stateBadge} onPress={handleOrbTap}>
            <View style={[styles.stateDot, { backgroundColor: orbConfig.coreColor }]} />
            <Text style={[styles.stateText, { color: orbConfig.coreColor }]}>
              {orbConfig.label}
            </Text>
            <Text style={styles.stateSub}>{orbConfig.sublabel}</Text>
          </Pressable>
        </View>

        {/* Personalized Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTime}>{greeting},</Text>
          <Text style={styles.greetingName}>Kenaz.</Text>
          <Text style={styles.greetingTag}>AURA READY // FASTPATH ACTIVE</Text>
        </View>

        {/* Dual-Brain Telemetry Cards */}
        <View style={styles.vitalsGrid}>
          {/* Tool Engine Card */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="hardware-chip-outline" size={14} color={Colors.cyan.primary} />
              <Text style={styles.vitalLabel}>TOOL ENGINE</Text>
            </View>
            <Text style={styles.vitalValue} numberOfLines={1}>
              {toolModelName}
            </Text>
            <Text style={styles.vitalSub}>PROVIDER: {toolProvider.toUpperCase()}</Text>
          </View>

          {/* Conversational Brain Card */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="chatbubbles-outline" size={14} color={Colors.purple.light} />
              <Text style={styles.vitalLabel}>CHAT BRAIN</Text>
            </View>
            <Text style={styles.vitalValue} numberOfLines={1}>
              {chatModelName}
            </Text>
            <Text style={styles.vitalSub}>PROVIDER: {chatProvider.toUpperCase()}</Text>
          </View>
        </View>

        {/* Quick Access Matrix */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeader}>DIRECT ACTION TILES</Text>
        </View>

        <View style={styles.tilesGrid}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.tileCard, pressed && { opacity: 0.8 }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                router.push(item.route as any);
              }}
            >
              <View style={styles.tileIconBox}>
                <Ionicons name={item.iconName} size={18} color={Colors.cyan.primary} />
              </View>
              <View style={styles.tileInfo}>
                <Text style={styles.tileTitle}>{item.label}</Text>
                <Text style={styles.tileDesc} numberOfLines={1}>
                  {item.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.dim} />
            </Pressable>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
    marginVertical: 2,
  },
  stateBadge: {
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(17, 16, 24, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  stateSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    color: Colors.text.dim,
  },

  greetingSection: {
    paddingVertical: 10,
  },
  greetingTime: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 22,
    fontWeight: '300',
    color: Colors.text.secondary,
  },
  greetingName: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  greetingTag: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.cyan.primary,
    marginTop: 4,
  },

  vitalsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    gap: 3,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.text.dim,
    letterSpacing: 0.8,
  },
  vitalValue: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 2,
  },
  vitalSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8,
    color: Colors.text.dim,
  },

  sectionHeaderWrap: {
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeader: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.text.dim,
  },

  tilesGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  tileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  tileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(106, 83, 153, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(106, 83, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileInfo: {
    flex: 1,
  },
  tileTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  tileDesc: {
    fontSize: 10.5,
    color: Colors.text.dim,
    marginTop: 1,
  },
});
