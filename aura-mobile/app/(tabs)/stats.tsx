import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getStats } from '../../src/api/aura';
import { colors } from '../../src/theme';

type Stats = {
  cpu_percent?: number;
  ram_percent?: number;
  disk_percent?: number;
  battery_percent?: number;
  power_plugged?: boolean;
  uptime?: string;
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.barFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]}
      />
    </View>
  );
}

function StatCard({
  label, value, percent, color, delay,
}: {
  label: string; value: string; percent: number; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)} style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <ProgressBar value={percent} color={color} />
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

  const cpuColor = (stats?.cpu_percent ?? 0) > 80 ? colors.accentRed
    : (stats?.cpu_percent ?? 0) > 50 ? colors.accentOrange : colors.accentGreen;

  const ramColor = (stats?.ram_percent ?? 0) > 80 ? colors.accentRed
    : (stats?.ram_percent ?? 0) > 50 ? colors.accentOrange : colors.accentCyan;

  const diskColor = (stats?.disk_percent ?? 0) > 90 ? colors.accentRed
    : (stats?.disk_percent ?? 0) > 70 ? colors.accentOrange : colors.accentGreen;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Stats</Text>
        <View style={styles.liveDot}>
          <View style={styles.dot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && !stats}
            onRefresh={load}
            tintColor={colors.accentCyan}
            colors={[colors.accentCyan]}
          />
        }
      >
        {error && !stats ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : stats ? (
          <>
            <StatCard
              label="CPU"
              value={`${stats.cpu_percent ?? '?'}%`}
              percent={stats.cpu_percent ?? 0}
              color={cpuColor}
              delay={0}
            />
            <StatCard
              label="RAM"
              value={`${stats.ram_percent ?? '?'}%`}
              percent={stats.ram_percent ?? 0}
              color={ramColor}
              delay={60}
            />
            <StatCard
              label="Disk"
              value={`${stats.disk_percent ?? '?'}%`}
              percent={stats.disk_percent ?? 0}
              color={diskColor}
              delay={120}
            />
            {stats.battery_percent != null && (
              <StatCard
                label="Battery"
                value={`${stats.battery_percent}%${stats.power_plugged ? ' ⚡' : ''}`}
                percent={stats.battery_percent}
                color={stats.battery_percent < 20 ? colors.accentRed : colors.accentGreen}
                delay={180}
              />
            )}
            {stats.uptime && (
              <Animated.View entering={FadeInDown.duration(300).delay(240)} style={styles.uptimeCard}>
                <Text style={styles.uptimeLabel}>Uptime</Text>
                <Text style={styles.uptimeValue}>{stats.uptime}</Text>
              </Animated.View>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <Text style={styles.muted}>Loading...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.accentCyan, fontSize: 20, fontWeight: '700' },
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentGreen },
  liveText: { color: colors.accentGreen, fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  statCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16,
  },
  statHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  statLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '700' },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: colors.bgTertiary, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  uptimeCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16,
    alignItems: 'center',
  },
  uptimeLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  uptimeValue: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.textMuted, fontSize: 16 },
  error: { color: colors.accentRed, fontSize: 14 },
});
