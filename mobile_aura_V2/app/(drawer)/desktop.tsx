import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { TopHudBar } from '../../src/components/navigation/TopHudBar';
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import {
  getStats,
  getHealth,
  getNowPlaying,
  getFocus,
  type SystemStats,
  type MediaInfo,
  type FocusInfo,
} from '../../src/api/client';
import { useAppStore } from '../../src/store/appStore';

function useMetricColor(value: number, warn = 50, danger = 80): string {
  if (value > danger) return Colors.red.primary;
  if (value > warn) return Colors.gold.primary;
  return Colors.cyan.primary;
}

function formatUptime(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function MetricCard({
  label,
  value,
  unit,
  color,
  delay,
  iconName,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  delay: number;
  iconName: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(280).delay(delay)} style={metricStyles.card}>
      <Ionicons name={iconName} size={16} color={color} style={metricStyles.icon} />
      <Text style={[metricStyles.value, { color }]}>
        {value}
        <Text style={metricStyles.unit}>{unit}</Text>
      </Text>
      <Text style={metricStyles.label}>{label}</Text>
    </Animated.View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    alignItems: 'center',
    gap: 3,
  },
  icon: {
    marginBottom: 2,
  },
  value: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 20,
    fontWeight: '700',
  },
  unit: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.text.dim,
  },
  label: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default function DesktopScreen() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [focus, setFocus] = useState<FocusInfo | null>(null);
  const [uptime, setUptime] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { pcConnected, setPcConnected } = useAppStore();

  const fetchAll = useCallback(async () => {
    const [s, h, m, f] = await Promise.all([
      getStats(),
      getHealth(),
      getNowPlaying(),
      getFocus(),
    ]);
    if (s) {
      setStats(s);
      setPcConnected(true);
    } else {
      setPcConnected(false);
    }
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

  const uptimeStr = formatUptime(uptime);

  const cpuColor = useMetricColor(stats?.cpu_percent ?? 0, 50, 80);
  const ramColor = useMetricColor(stats?.memory_percent ?? 0, 50, 80);
  const diskColor = useMetricColor(stats?.disk_percent ?? 0, 70, 90);
  const gpuColor = useMetricColor(stats?.gpu_percent ?? 0, 50, 80);

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <TopHudBar title="PC TELEMETRY" subtitle={uptimeStr ? `UPTIME: ${uptimeStr}` : 'WINDOWS DAEMON LINK'} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.cyan.primary}
            colors={[Colors.cyan.primary]}
          />
        }
      >
        {/* Connection Status Card */}
        <View style={styles.connCard}>
          <View style={styles.connLeft}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: pcConnected ? Colors.green.primary : Colors.red.primary },
              ]}
            />
            <View>
              <Text style={styles.connTitle}>
                {pcConnected ? 'WINDOWS DESKTOP // ONLINE' : 'PC OFFLINE // UNREACHABLE'}
              </Text>
              <Text style={styles.connSub}>
                {pcConnected
                  ? 'Port 8000 & TCP Socket Bridge Connected'
                  : 'Start backend on PC (python main.py)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Focus App */}
        {focus && (
          <Animated.View entering={FadeInDown.duration(280).delay(50)} style={styles.focusCard}>
            <Ionicons name="browsers-outline" size={20} color={Colors.cyan.primary} />
            <View style={styles.focusInfo}>
              <Text style={styles.focusLabel}>ACTIVE FOREGROUND WINDOW</Text>
              <Text style={styles.focusApp} numberOfLines={1}>
                {focus.app}
              </Text>
              {focus.window_title ? (
                <Text style={styles.focusWindow} numberOfLines={1}>
                  {focus.window_title}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        )}

        {/* Metrics Grid */}
        <Text style={styles.sectionHeader}>HARDWARE VITALS</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="CPU LOAD"
            value={`${stats?.cpu_percent ?? '--'}`}
            unit="%"
            color={cpuColor}
            delay={80}
            iconName="speedometer-outline"
          />
          <MetricCard
            label="RAM USAGE"
            value={`${stats?.memory_percent ?? '--'}`}
            unit="%"
            color={ramColor}
            delay={110}
            iconName="hardware-chip-outline"
          />
          <MetricCard
            label="DISK OCCUPANCY"
            value={`${stats?.disk_percent ?? '--'}`}
            unit="%"
            color={diskColor}
            delay={140}
            iconName="disc-outline"
          />
          {stats?.gpu_percent != null && (
            <MetricCard
              label="GPU LOAD"
              value={`${stats.gpu_percent}`}
              unit="%"
              color={gpuColor}
              delay={170}
              iconName="cube-outline"
            />
          )}
        </View>

        {/* RAM Detail Breakdown */}
        {stats?.memory_used_gb != null && stats?.memory_total_gb != null && (
          <Animated.View entering={FadeInDown.duration(280).delay(180)} style={styles.detailCard}>
            <Text style={styles.detailLabel}>PHYSICAL MEMORY BREAKDOWN</Text>
            <Text style={styles.detailValue}>
              {stats.memory_used_gb.toFixed(1)} GB / {stats.memory_total_gb.toFixed(1)} GB
            </Text>
          </Animated.View>
        )}

        {/* Now Playing Telemetry */}
        {media?.title && (
          <Animated.View entering={FadeInDown.duration(280).delay(220)} style={styles.mediaCard}>
            <View style={styles.mediaIconBox}>
              <Ionicons name="musical-notes-outline" size={18} color={Colors.purple.light} />
            </View>
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaPlayingTag}>NOW PLAYING</Text>
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {media.title}
              </Text>
              {media.artist ? (
                <Text style={styles.mediaArtist} numberOfLines={1}>
                  {media.artist}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, padding: 16 },

  connCard: {
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 12,
  },
  connLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  connSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    color: Colors.text.dim,
    marginTop: 2,
  },

  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 12,
  },
  focusInfo: { gap: 2, flex: 1 },
  focusLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.cyan.primary,
    letterSpacing: 0.8,
  },
  focusApp: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  focusWindow: {
    fontSize: 11,
    color: Colors.text.dim,
  },

  sectionHeader: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.text.dim,
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },

  detailCard: {
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    color: Colors.text.secondary,
    fontWeight: '700',
  },
  detailValue: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.purple.soft,
  },

  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(106, 83, 153, 0.35)',
    padding: 14,
    marginBottom: 10,
  },
  mediaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(106, 83, 153, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaInfo: { flex: 1, gap: 2 },
  mediaPlayingTag: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8,
    fontWeight: '700',
    color: Colors.purple.light,
    letterSpacing: 1,
  },
  mediaTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  mediaArtist: {
    fontSize: 11,
    color: Colors.text.dim,
  },
});
