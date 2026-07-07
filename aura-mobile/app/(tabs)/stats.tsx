import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, RefreshControl, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getStats } from '../../src/api/aura';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';

type Stats = {
  cpu_percent?: number;
  ram_percent?: number;
  disk_percent?: number;
  battery_percent?: number;
  power_plugged?: boolean;
  uptime?: string;
};

function ProgressBar({ value, delay }: { value: number; delay: number }) {
  return (
    <View style={styles.barTrack}>
      <Animated.View entering={FadeInDown.duration(400).delay(delay)} style={{ width: '100%' }}>
        <LinearGradient
          colors={[colors.secondary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFill, { width: `${Math.min(value, 100)}%` }]}
        />
      </Animated.View>
    </View>
  );
}

function StatCard({
  label, value, percent, color, icon, delay,
}: {
  label: string; value: string; percent: number; color: string; icon: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)}>
      <GlassCard>
        <View style={styles.statHeader}>
          <View style={styles.statLeft}>
            <View style={[styles.statIconWrap, { backgroundColor: color + '12' }]}>
              <MaterialIcons name={icon as any} size={18} color={color} />
            </View>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <ProgressBar value={percent} delay={delay} />
      </GlassCard>
    </Animated.View>
  );
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStats();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]));

  const cpuColor = (stats?.cpu_percent ?? 0) > 80 ? colors.error
    : (stats?.cpu_percent ?? 0) > 50 ? colors.warning : colors.primary;

  const ramColor = (stats?.ram_percent ?? 0) > 80 ? colors.error
    : (stats?.ram_percent ?? 0) > 50 ? colors.warning : colors.secondary;

  const diskColor = (stats?.disk_percent ?? 0) > 90 ? colors.error
    : (stats?.disk_percent ?? 0) > 70 ? colors.warning : '#2DD4A8';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Stats</Text>
        <View style={styles.livePill}>
          <View style={[styles.liveDot, { backgroundColor: colors.tertiary }]} />
          <Text style={[styles.liveText, { color: colors.tertiary }]}>Live</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading && !stats} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && !stats ? (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={32} color={colors.error} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : stats ? (
          <>
            <StatCard
              label="CPU"
              value={`${stats.cpu_percent ?? '?'}%`}
              percent={stats.cpu_percent ?? 0}
              color={cpuColor}
              icon="memory"
              delay={0}
            />
            <StatCard
              label="RAM"
              value={`${stats.ram_percent ?? '?'}%`}
              percent={stats.ram_percent ?? 0}
              color={ramColor}
              icon="storage"
              delay={60}
            />
            <StatCard
              label="Disk"
              value={`${stats.disk_percent ?? '?'}%`}
              percent={stats.disk_percent ?? 0}
              color={diskColor}
              icon="hard-drive"
              delay={120}
            />
            {stats.battery_percent != null && (
              <StatCard
                label="Battery"
                value={`${stats.battery_percent}%${stats.power_plugged ? ' ⚡' : ''}`}
                percent={stats.battery_percent}
                color={stats.battery_percent < 20 ? colors.error : colors.tertiary}
                icon="battery-full"
                delay={180}
              />
            )}
            {stats.uptime && (
              <Animated.View entering={FadeInDown.duration(300).delay(240)}>
                <GlassCard>
                  <View style={styles.uptimeRow}>
                    <View style={styles.uptimeIcon}>
                      <MaterialIcons name="schedule" size={18} color="#2DD4A8" />
                    </View>
                    <View>
                      <Text style={styles.uptimeLabel}>Uptime</Text>
                      <Text style={styles.uptimeValue}>{stats.uptime}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <MaterialIcons name="hourglass-empty" size={32} color={colors.onSurfaceDim} />
            <Text style={styles.muted}>Loading...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(63,185,80,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.md },
  statHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIconWrap: { width: 32, height: 32, borderRadius: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  statLabel: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },
  statValue: { ...typography.displayLg, fontSize: 22 },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  uptimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  uptimeIcon: { width: 32, height: 32, borderRadius: spacing.sm, backgroundColor: 'rgba(45,212,168,0.12)', alignItems: 'center', justifyContent: 'center' },
  uptimeLabel: { ...typography.labelSm, color: colors.primary, marginBottom: 2 },
  uptimeValue: { ...typography.mono, color: colors.onSurface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingTop: 80 },
  muted: { color: colors.onSurface, fontSize: 14 },
  error: { color: colors.error, fontSize: 13 },
});
