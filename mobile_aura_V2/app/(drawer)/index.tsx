import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

const QUICK_ACTIONS = [
  { id: 'chat', label: 'Neural Chat', icon: '◎', route: '/chat', desc: 'Realtime streaming & voice' },
  { id: 'automation', label: 'Automation Hub', icon: '⚡', route: '/automation', desc: 'Phone & PC actions' },
  { id: 'desktop', label: 'PC Live Telemetry', icon: '📊', route: '/desktop', desc: 'Hardware & Media' },
  { id: 'settings', label: 'Core Config', icon: '⚙', route: '/settings', desc: 'LLM & Voice Setup' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { orbState, pcConnected, setOrbState, setPcConnected } = useAppStore();
  const { activeProvider, llmModel } = useSettingsStore();

  const orbConfig = getOrbConfig(orbState);

  useEffect(() => {
    checkPcConnection().then((ok) => setPcConnected(ok));
  }, []);

  const time = new Date().getHours();
  let greeting = 'Good evening';
  if (time >= 5 && time < 12) greeting = 'Good morning';
  else if (time >= 12 && time < 17) greeting = 'Good afternoon';

  const currentModelName =
    PRESET_MODELS.find((m) => m.id === llmModel)?.name || llmModel || 'Auto Free Router';

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
        {/* Interactive Hero Orb Section */}
        <View style={styles.orbSection}>
          <View style={styles.reticleOverlay}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>

          <Orb state={orbState} size={120} onPress={handleOrbTap} />

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
          <Text style={styles.greetingTag}>AURA READY // TAP ORB TO ENGAGE</Text>
        </View>

        {/* Vitals & Status Cards */}
        <View style={styles.vitalsGrid}>
          {/* Active Brain Matrix */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Text style={styles.vitalIcon}>🧠</Text>
              <Text style={styles.vitalLabel}>ACTIVE BRAIN</Text>
            </View>
            <Text style={styles.vitalValue} numberOfLines={1}>
              {currentModelName}
            </Text>
            <Text style={styles.vitalSub}>PROVIDER: {activeProvider.toUpperCase()}</Text>
          </View>

          {/* PC Bridge State */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Text style={styles.vitalIcon}>💻</Text>
              <Text style={styles.vitalLabel}>PC STATUS</Text>
            </View>
            <Text
              style={[
                styles.vitalValue,
                { color: pcConnected ? Colors.green.bright : Colors.text.dim },
              ]}
            >
              {pcConnected ? 'SYNCHRONIZED' : 'OFFLINE'}
            </Text>
            <Text style={styles.vitalSub}>
              {pcConnected ? 'DESKTOP LINK ACTIVE' : 'LOCAL AUTONOMOUS'}
            </Text>
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
                <Text style={styles.tileIcon}>{item.icon}</Text>
              </View>
              <View style={styles.tileInfo}>
                <Text style={styles.tileTitle}>{item.label}</Text>
                <Text style={styles.tileDesc} numberOfLines={1}>
                  {item.desc}
                </Text>
              </View>
              <Text style={styles.tileArrow}>›</Text>
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
    paddingVertical: 20,
    position: 'relative',
    marginVertical: 4,
  },
  reticleOverlay: {
    position: 'absolute',
    width: 220,
    height: 220,
    pointerEvents: 'none',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 16,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(106, 83, 153, 0.4)',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(106, 83, 153, 0.4)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },

  stateBadge: {
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(17, 16, 24, 0.8)',
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
    paddingVertical: 12,
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
  vitalIcon: {
    fontSize: 12,
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
    fontSize: 12,
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
  tileIcon: {
    fontSize: 16,
    color: Colors.cyan.primary,
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
  tileArrow: {
    fontSize: 18,
    color: Colors.text.dim,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
  },
});
