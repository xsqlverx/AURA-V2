import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import { getHealth, getStats, getWeather, triggerBriefing } from '../../src/api/aura';
import { useWs } from '../../src/stores/wsStore';
import { useSettings } from '../../src/stores/settingsStore';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import Icon from '../../src/components/Icon';

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const wsState = useWs((s) => s.state);
  const wsConnected = useWs((s) => s.connected);
  const backendUrl = useSettings((s) => s.backendUrl);
  const [stats, setStats] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getWeather().then(setWeather).catch(() => {});
  }, []);

  const stateColors: Record<string, string> = {
    idle: colors.tertiary,
    listening: colors.primary,
    thinking: colors.warning,
    speaking: colors.secondary,
    disconnected: colors.error,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => (navigation as any).toggleDrawer()} style={styles.menuBtn}>
            <Icon name="menu" size={20} color={colors.onSurface} />
          </Pressable>
          <View style={styles.logoWrap}>
            <Icon name="psychology" size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AURA</Text>
            <Text style={styles.headerSub}>Neural Interface</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: wsConnected ? 'rgba(63,185,80,0.08)' : 'rgba(255,69,58,0.08)' }]}>
          <View style={[styles.statusDot, { backgroundColor: wsConnected ? colors.tertiary : colors.error }]} />
          <Text style={[styles.statusText, { color: wsConnected ? colors.tertiary : colors.error }]}>{wsConnected ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard glow="cyan" style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroLabel}>STATE</Text>
                <Text style={[styles.heroValue, { color: stateColors[wsState] || colors.onSurface }]}>
                  {wsState.toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroLabel}>BACKEND</Text>
                <Text style={[styles.heroValue, { color: wsConnected ? colors.tertiary : colors.error }]}>
                  {wsConnected ? 'ACTIVE' : 'DOWN'}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {stats && (
          <View style={styles.statsRow}>
            {stats.cpu_percent != null && (
              <GlassCard style={{ flex: 1 }}>
                <View style={styles.statHeader}>
                  <Icon name="memory" size={16} color={colors.primary} />
                  <Text style={styles.statLabel}>CPU</Text>
                </View>
                <Text style={[styles.statValue, { color: (stats.cpu_percent || 0) > 80 ? colors.error : colors.primary }]}>
                  {stats.cpu_percent}%
                </Text>
                <View style={styles.miniBar}>
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.miniBarFill, { width: `${Math.min(stats.cpu_percent || 0, 100)}%` }]}
                  />
                </View>
              </GlassCard>
            )}
            {stats.ram_percent != null && (
              <GlassCard style={{ flex: 1 }}>
                <View style={styles.statHeader}>
                  <Icon name="storage" size={16} color={colors.secondary} />
                  <Text style={styles.statLabel}>RAM</Text>
                </View>
                <Text style={[styles.statValue, { color: (stats.ram_percent || 0) > 80 ? colors.error : colors.secondary }]}>
                  {stats.ram_percent}%
                </Text>
                <View style={styles.miniBar}>
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.miniBarFill, { width: `${Math.min(stats.ram_percent || 0, 100)}%` }]}
                  />
                </View>
              </GlassCard>
            )}
            {stats.battery_percent != null && (
              <GlassCard style={{ flex: 1 }}>
                <View style={styles.statHeader}>
                  <Icon name="battery-full" size={16} color={colors.tertiary} />
                  <Text style={styles.statLabel}>BATT</Text>
                </View>
                <Text style={[styles.statValue, { color: (stats.battery_percent || 0) < 20 ? colors.error : colors.tertiary }]}>
                  {stats.battery_percent}%
                </Text>
                <View style={styles.miniBar}>
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.miniBarFill, { width: `${Math.min(stats.battery_percent || 0, 100)}%` }]}
                  />
                </View>
              </GlassCard>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.navGrid}>
          <NavTile icon="chat-bubble-outline" label="Chat" color={colors.primary} onPress={() => router.push('/(tabs)/chat')} />
          <NavTile icon="bolt" label="Actions" color={colors.warning} onPress={() => router.push('/(tabs)/actions')} />
          <NavTile icon="psychology" label="Memory" color={colors.secondary} onPress={() => router.push('/(tabs)/memory')} />
          <NavTile icon="monitor-heart" label="Stats" color={colors.tertiary} onPress={() => router.push('/(tabs)/stats')} />
          <NavTile icon="edit-note" label="Notes" color="#F778BA" onPress={() => router.push('/(tabs)/notes')} />
          <NavTile icon="developer-board" label="Procs" color={colors.error} onPress={() => router.push('/(tabs)/processes')} />
          <NavTile icon="settings" label="Settings" color={colors.onSurfaceSecondary} onPress={() => router.push('/(tabs)/settings')} />
        </View>

        {weather && (
          <GlassCard glow="cyan">
            <View style={styles.weatherCard}>
              <View>
                <Text style={styles.weatherTemp}>
                  {typeof weather.temp === 'number' ? `${Math.round(weather.temp)}°` : weather.temp || ''}
                </Text>
                <Text style={styles.weatherDesc}>{weather.description || weather.weather || ''}</Text>
              </View>
              <Icon name="wb-sunny" size={32} color={colors.warning} />
            </View>
          </GlassCard>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NavTile({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navTile, pressed && styles.navTilePressed]}
      onPress={onPress}
    >
      <View style={[styles.navIconWrap, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.navLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(0,242,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  headerSub: { color: colors.onSurface, fontSize: 10, fontWeight: '500', letterSpacing: 0.5 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(63,185,80,0.2)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  heroCard: {},
  heroContent: { padding: spacing.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1 },
  heroDivider: { width: 1, height: 36, backgroundColor: colors.glassBorder, marginHorizontal: 12 },
  heroLabel: { ...typography.labelSm, color: colors.primary, marginBottom: spacing.xs },
  heroValue: { ...typography.labelSm, fontSize: 13, letterSpacing: 0, flexWrap: 'nowrap' as any },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  statLabel: { ...typography.labelSm, color: colors.primary },
  statValue: { ...typography.displayLg, fontSize: 18, marginBottom: spacing.sm },
  miniBar: { height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 1.5 },
  sectionLabel: { ...typography.labelMd, color: colors.primary, marginTop: spacing.xs },
  navGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  navTile: {
    width: '30%', aspectRatio: 1.2,
    backgroundColor: colors.glassBg,
    borderRadius: radius.card,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  navTilePressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  menuBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  navIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { color: colors.onSurface, fontSize: 11, fontWeight: '600' },
  weatherCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  weatherTemp: { ...typography.displayLg, fontSize: 32 },
  weatherDesc: { color: colors.onSurface, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
});
