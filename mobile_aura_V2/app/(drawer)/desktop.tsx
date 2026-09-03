import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { getStats, getHealth, getNowPlaying, getFocus, type SystemStats, type MediaInfo, type FocusInfo } from '../../src/api/client';
import { useAppStore } from '../../src/store/appStore';

function useMetricColor(value: number, warn = 50, danger = 80): string {
  if (value > danger) return Colors.red.primary;
  if (value > warn) return Colors.amber.primary;
  return Colors.cyan.primary;
}

function formatUptime(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function MetricCard({ label, value, unit, color, delay }: {
  label: string; value: string; unit: string; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)} style={metricStyles.card}>
      <Text style={[metricStyles.value, { color }]}>{value}<Text style={metricStyles.unit}>{unit}</Text></Text>
      <Text style={metricStyles.label}>{label}</Text>
    </Animated.View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  value: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 22,
    fontWeight: '700',
  },
  unit: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.text.dim,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default function DesktopScreen() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [focus, setFocus] = useState<FocusInfo | null>(null);
  const [uptime, setUptime] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { pcConnected } = useAppStore();

  const fetchAll = useCallback(async () => {
    const [s, h, m, f] = await Promise.all([
      getStats(),
      getHealth(),
      getNowPlaying(),
      getFocus(),
    ]);
    if (s) setStats(s);
    if (h) setUptime(h.uptime_seconds);
    if (m) setMedia(m);
    if (f) setFocus(f);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const connColor = pcConnected ? Colors.green.primary : Colors.red.primary;
  const connLabel = pcConnected ? 'Connected' : 'Disconnected';
  const uptimeStr = formatUptime(uptime);

  const cpuColor = useMetricColor(stats?.cpu_percent ?? 0, 50, 80);
  const ramColor = useMetricColor(stats?.memory_percent ?? 0, 50, 80);
  const diskColor = useMetricColor(stats?.disk_percent ?? 0, 70, 90);
  const gpuColor = useMetricColor(stats?.gpu_percent ?? 0, 50, 80);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.menuBtn}
          onPress={() => navigation.dispatch({ type: 'OPEN_DRAWER' })}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <View style={styles.headerIconWrap}>
          <Text style={styles.headerIconText}>📊</Text>
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Desktop Status</Text>
          {uptimeStr ? <Text style={styles.headerSub}>Up {uptimeStr}</Text> : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan.primary} colors={[Colors.cyan.primary]} />
        }
      >
        {/* Connection Status */}
        <View style={styles.connRow}>
          <View style={[styles.connDot, { backgroundColor: connColor }]} />
          <Text style={[styles.connLabel, { color: connColor }]}>{connLabel}</Text>
        </View>

        {/* Focus App */}
        {focus && (
          <Animated.View entering={FadeInDown.duration(300).delay(50)} style={styles.focusCard}>
            <Text style={styles.focusIcon}>💻</Text>
            <View style={styles.focusInfo}>
              <Text style={styles.focusLabel}>Focus App</Text>
              <Text style={styles.focusApp} numberOfLines={1}>{focus.app}</Text>
            </View>
            {focus.window_title ? (
              <Text style={styles.focusWindow} numberOfLines={1}>{focus.window_title}</Text>
            ) : null}
          </Animated.View>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard label="CPU" value={`${stats?.cpu_percent ?? '--'}`} unit="%" color={cpuColor} delay={100} />
          <MetricCard label="RAM" value={`${stats?.memory_percent ?? '--'}`} unit="%" color={ramColor} delay={130} />
          <MetricCard label="Disk" value={`${stats?.disk_percent ?? '--'}`} unit="%" color={diskColor} delay={160} />
          {stats?.gpu_percent != null && (
            <MetricCard label="GPU" value={`${stats.gpu_percent}`} unit="%" color={gpuColor} delay={190} />
          )}
        </View>

        {/* RAM Detail */}
        {stats?.memory_used_gb != null && stats?.memory_total_gb != null && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.detailCard}>
            <Text style={styles.detailLabel}>Memory</Text>
            <Text style={styles.detailValue}>{stats.memory_used_gb.toFixed(1)} / {stats.memory_total_gb.toFixed(1)} GB</Text>
          </Animated.View>
        )}

        {/* Battery */}
        {stats?.battery && (
          <Animated.View entering={FadeInDown.duration(300).delay(220)} style={styles.batteryCard}>
            <View style={styles.batteryHeader}>
              <Text style={styles.batteryLabel}>Battery</Text>
              <Text style={[styles.batteryPercent, {
                color: stats.battery.percent < 20 ? Colors.red.primary : Colors.green.primary
              }]}>
                {stats.battery.percent}%{stats.battery.charging ? ' ⚡' : ''}
              </Text>
            </View>
            <View style={styles.batteryBar}>
              <View style={[
                styles.batteryFill,
                {
                  width: `${Math.min(stats.battery.percent, 100)}%`,
                  backgroundColor: stats.battery.percent < 20 ? Colors.red.primary : stats.battery.charging ? Colors.cyan.primary : Colors.green.primary,
                },
              ]} />
            </View>
            {stats.battery.time_remaining ? (
              <Text style={styles.batteryTime}>{stats.battery.time_remaining} remaining</Text>
            ) : null}
          </Animated.View>
        )}

        {/* Now Playing */}
        {media?.title && (
          <Animated.View entering={FadeInDown.duration(300).delay(250)} style={styles.mediaCard}>
            <Text style={styles.mediaIcon}>🎵</Text>
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={1}>{media.title}</Text>
              {media.artist ? <Text style={styles.mediaArtist} numberOfLines={1}>{media.artist}</Text> : null}
            </View>
            {media.is_playing ? <Text style={styles.mediaPlaying}>NOW PLAYING</Text> : null}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: Theme.spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    paddingTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
    gap: Theme.spacing.sm,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 18, color: Colors.text.primary },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.cyan.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 18 },
  headerTextCol: { flex: 1 },
  headerTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 1,
  },

  connRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
  },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  focusIcon: { fontSize: 18 },
  focusInfo: { gap: 1, flex: 1 },
  focusLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusApp: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  focusWindow: {
    fontSize: 11,
    color: Colors.text.secondary,
    flexShrink: 1,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },

  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  detailValue: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  batteryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  batteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  batteryPercent: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '700',
  },
  batteryBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  batteryFill: { height: '100%', borderRadius: 2 },
  batteryTime: {
    fontSize: 10,
    color: Colors.text.dim,
  },

  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  mediaIcon: { fontSize: 18 },
  mediaInfo: { flex: 1, gap: 1 },
  mediaTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  mediaArtist: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  mediaPlaying: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.cyan.primary,
    letterSpacing: 0.5,
  },
});
