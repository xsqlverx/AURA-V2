import { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, semantic, accent } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { useDesktopPresence } from '../../../desktop';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';
import { syncFromDesktop, getMobileBrainState } from '../../../services/memorySync';

export default function DesktopGlance() {
  const { updateGlanceData } = useGlance();
  const { state: presence, hasCapability } = useDesktopPresence();
  const stats = presence.system;
  const battery = presence.battery;
  const network = presence.network;
  const focus = presence.focus;
  const [syncInfo, setSyncInfo] = useState<{ revision: string | null; lastSyncedAt: number | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncFromDesktop();
    } catch {}
    try {
      const s = await getMobileBrainState();
      setSyncInfo({ revision: s.revision, lastSyncedAt: s.lastSyncedAt });
    } catch {}
    setSyncing(false);
  }, []);

  useEffect(() => {
    getMobileBrainState().then((s) => {
      setSyncInfo({ revision: s.revision, lastSyncedAt: s.lastSyncedAt });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (stats) updateGlanceData('desktop', {
      cpu_percent: stats.cpu_percent,
      ram_percent: stats.memory_percent,
      gpu_percent: stats.gpu_percent,
      disk_percent: stats.disk_percent,
      battery_percent: battery?.percent,
      power_plugged: battery?.charging,
    });
  }, [stats, battery]);

  const cpuC = (stats?.cpu_percent ?? 0) > 80 ? semantic.error : (stats?.cpu_percent ?? 0) > 50 ? semantic.warning : accent.cyan;
  const ramC = (stats?.memory_percent ?? 0) > 80 ? semantic.error : (stats?.memory_percent ?? 0) > 50 ? semantic.warning : accent.cyan;
  const diskC = (stats?.disk_percent ?? 0) > 90 ? semantic.error : (stats?.disk_percent ?? 0) > 70 ? semantic.warning : semantic.success;

  const uptimeStr = useMemo(() => {
    const s = presence.health.uptime_seconds;
    if (s <= 0) return null;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [presence.health.uptime_seconds]);

  const networkQuality = network?.quality || 'poor';
  const networkColor = networkQuality === 'excellent' ? semantic.success : networkQuality === 'good' ? accent.cyan : networkQuality === 'fair' ? semantic.warning : semantic.error;

  const connectionStatus = presence.health.backend === 'healthy' ? 'Connected' : presence.health.backend === 'degraded' ? 'Degraded' : 'Offline';
  const connectionColor = presence.health.backend === 'healthy' ? semantic.success : presence.health.backend === 'degraded' ? semantic.warning : semantic.error;

  return (
    <View style={styles.container}>
      <GlanceHeader icon="monitor-heart" title="Desktop Status" subtitle={uptimeStr ? `Up ${uptimeStr}` : undefined} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.connectionRow}>
          <View style={[styles.connDot, { backgroundColor: connectionColor }]} />
          <Text style={[styles.connText, { color: connectionColor }]}>{connectionStatus}</Text>
          {network?.latency_ms != null && (
            <>
              <View style={styles.connDivider} />
              <Icon name="wifi" size={12} color={networkColor} />
              <Text style={styles.connLatency}>{network.latency_ms}ms</Text>
            </>
          )}
        </View>

        {focus && (
          <View style={styles.focusCard}>
            <Icon name="terminal" size={14} color={accent.cyan} />
            <View style={styles.focusInfo}>
              <Text style={styles.focusLabel}>Focus App</Text>
              <Text style={styles.focusApp} numberOfLines={1}>{focus.app}</Text>
            </View>
            {focus.window_title && (
              <Text style={styles.focusWindow} numberOfLines={1}>{focus.window_title}</Text>
            )}
          </View>
        )}

        <Pressable onPress={refreshSync} disabled={syncing} style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <View style={styles.syncRow}>
              <Icon name="cloud" size={14} color={accent.cyan} />
              <Text style={styles.syncLabel}>Brain Sync</Text>
            </View>
            {syncing ? (
              <Text style={styles.syncStatus}>syncing…</Text>
            ) : syncInfo?.lastSyncedAt ? (
              <Text style={styles.syncStatus}>synced</Text>
            ) : (
              <Text style={[styles.syncStatus, { color: text.tertiary }]}>tap to sync</Text>
            )}
          </View>
          {syncInfo?.revision && (
            <Text style={styles.syncRev} numberOfLines={1}>rev {syncInfo.revision}</Text>
          )}
        </Pressable>

        <View style={styles.grid}>
          <MetricBlock label="CPU" value={`${stats?.cpu_percent ?? '--'}`} unit="%" color={cpuC} icon="cpu" delay={100} />
          <MetricBlock label="RAM" value={`${stats?.memory_percent ?? '--'}`} unit="%" color={ramC} icon="memory" delay={130} />
          {hasCapability('system_stats') && (
            <MetricBlock label="Disk" value={`${stats?.disk_percent ?? '--'}`} unit="%" color={diskC} icon="storage" delay={160} />
          )}
          {hasCapability('gpu') && stats?.gpu_percent != null && (
            <MetricBlock label="GPU" value={`${stats.gpu_percent}`} unit="%" color={stats.gpu_percent > 80 ? semantic.error : accent.cyan} icon="thermometer" delay={190} />
          )}
        </View>

        {battery && hasCapability('battery') && (
          <View style={styles.batteryCard}>
            <View style={styles.batteryHeader}>
              <View style={styles.batteryRow}>
                <Icon name="battery-full" size={14} color={battery.percent < 20 ? semantic.error : semantic.success} />
                <Text style={styles.batteryLabel}>Battery</Text>
              </View>
              <Text style={[styles.batteryPercent, { color: battery.percent < 20 ? semantic.error : semantic.success }]}>
                {battery.percent}%{battery.charging ? ' ⚡' : ''}
              </Text>
            </View>
            <View style={styles.batteryBar}>
              <View
                style={[
                  styles.batteryFill,
                  {
                    width: `${Math.min(battery.percent, 100)}%`,
                    backgroundColor: battery.percent < 20 ? semantic.error : battery.charging ? accent.cyan : semantic.success,
                  },
                ]}
              />
            </View>
            {battery.time_remaining && (
              <Text style={styles.batteryTime}>{battery.time_remaining} remaining</Text>
            )}
          </View>
        )}

        {presence.media?.title && (
          <View style={styles.mediaCard}>
            <Icon name="music-note" size={14} color={accent.cyan} />
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={1}>{presence.media.title}</Text>
              {presence.media.artist && (
                <Text style={styles.mediaArtist} numberOfLines={1}>{presence.media.artist}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricBlock({ label, value, unit, color, icon: iconName, delay }: {
  label: string; value: string; unit: string; color: string; icon: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(duration.slow).delay(delay)} style={styles.metric}>
      <Icon name={iconName} size={14} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}<Text style={styles.metricUnit}>{unit}</Text></Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.space20,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingVertical: spacing.space12,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connDivider: {
    width: 1,
    height: 10,
    backgroundColor: glass.border,
    marginHorizontal: spacing.space4,
  },
  connLatency: {
    ...typography.mono,
    fontSize: 10,
    color: text.tertiary,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space12,
    marginBottom: spacing.space12,
    flexWrap: 'wrap',
  },
  focusInfo: {
    gap: 1,
  },
  focusLabel: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusApp: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  focusWindow: {
    ...typography.caption,
    color: text.secondary,
    flex: 1,
    textAlign: 'right',
  },
  syncCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${accent.cyan}20`,
    padding: spacing.space12,
    marginBottom: spacing.space12,
    gap: spacing.space4,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  syncLabel: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  syncStatus: {
    ...typography.caption,
    color: accent.cyan,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  syncRev: {
    ...typography.mono,
    fontSize: 10,
    color: text.tertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space8,
    paddingBottom: spacing.space12,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    alignItems: 'center',
    gap: spacing.space8,
  },
  metricValue: {
    ...typography.heading2,
    fontWeight: '700',
  },
  metricUnit: {
    ...typography.bodySmall,
    fontWeight: '400',
    color: text.tertiary,
  },
  metricLabel: {
    ...typography.caption,
    color: text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  batteryCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    marginBottom: spacing.space12,
    gap: spacing.space8,
  },
  batteryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  batteryLabel: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  batteryPercent: {
    ...typography.mono,
    fontWeight: '700',
  },
  batteryBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 2,
  },
  batteryTime: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${accent.cyan}20`,
    padding: spacing.space12,
    marginBottom: spacing.space16,
  },
  mediaInfo: {
    flex: 1,
  },
  mediaTitle: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  mediaArtist: {
    ...typography.caption,
    color: text.secondary,
  },
});
