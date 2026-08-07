import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { useDesktopPresence } from '../../../desktop';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';

const BAR_MAX = 100;
const CHART_HEIGHT = 120;

export default function HealthGlance() {
  const { updateGlanceData } = useGlance();
  const { state: presence, hasCapability } = useDesktopPresence();
  const stats = presence.system;
  const battery = presence.battery;
  const network = presence.network;

  useEffect(() => {
    if (stats) updateGlanceData('health', stats);
  }, [stats]);

  const cpuC = (stats?.cpu_percent ?? 0) > 80 ? semantic.error : (stats?.cpu_percent ?? 0) > 50 ? semantic.warning : accent.cyan;
  const ramC = (stats?.memory_percent ?? 0) > 80 ? semantic.error : (stats?.memory_percent ?? 0) > 50 ? semantic.warning : accent.cyan;
  const diskC = (stats?.disk_percent ?? 0) > 90 ? semantic.error : (stats?.disk_percent ?? 0) > 70 ? semantic.warning : semantic.success;
  const gpuC = (stats?.gpu_percent ?? 0) > 80 ? semantic.error : (stats?.gpu_percent ?? 0) > 50 ? semantic.warning : accent.cyan;
  const battC = (battery?.percent ?? 100) < 20 ? semantic.error : battery?.charging ? accent.cyan : semantic.success;

  const uptimeStr = useMemo(() => {
    const s = presence.health.uptime_seconds;
    if (s <= 0) return null;
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [presence.health.uptime_seconds]);

  const memoryUsed = stats?.memory_used_gb ?? 0;
  const memoryTotal = stats?.memory_total_gb ?? 0;
  const memoryStr = `${memoryUsed.toFixed(1)} / ${memoryTotal.toFixed(1)} GB`;

  return (
    <View style={styles.container}>
      <GlanceHeader icon="monitor-heart" title="System Health" subtitle="Detailed diagnostics" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {!stats ? (
          <View style={styles.empty}>
            <Icon name="monitor-heart" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Animated.View entering={FadeInDown.duration(duration.slow).delay(100)} style={styles.chartCard}>
              <Text style={styles.chartTitle}>System Resources</Text>
              <View style={styles.chartContainer}>
                <ChartBar label="CPU" percent={stats.cpu_percent || 0} color={cpuC} value={`${stats.cpu_percent}%`} />
                <ChartBar label="RAM" percent={stats.memory_percent || 0} color={ramC} value={`${stats.memory_percent}%`} />
                {hasCapability('system_stats') && (
                  <ChartBar label="Disk" percent={stats.disk_percent || 0} color={diskC} value={`${stats.disk_percent}%`} />
                )}
                {hasCapability('gpu') && stats.gpu_percent != null && (
                  <ChartBar label="GPU" percent={stats.gpu_percent} color={gpuC} value={`${stats.gpu_percent}%`} />
                )}
              </View>
            </Animated.View>

            <View style={styles.metricsGrid}>
              <DetailCard
                label="Memory"
                value={memoryStr}
                icon="memory"
                color={ramC}
                delay={200}
              />
              {battery && (
                <DetailCard
                  label="Battery"
                  value={`${battery.percent}%${battery.charging ? ' ⚡' : ''}`}
                  icon="battery-full"
                  color={battC}
                  delay={250}
                />
              )}
              {uptimeStr && (
                <DetailCard
                  label="Uptime"
                  value={uptimeStr}
                  icon="schedule"
                  color={text.primary}
                  delay={300}
                />
              )}
              {network?.latency_ms != null && (
                <DetailCard
                  label="Latency"
                  value={`${network.latency_ms}ms`}
                  icon="wifi"
                  color={network.latency_ms < 50 ? semantic.success : network.latency_ms < 150 ? semantic.warning : semantic.error}
                  delay={350}
                />
              )}
            </View>

            {stats.gpu_temp != null && (
              <Animated.View entering={FadeInDown.duration(duration.slow).delay(400)} style={styles.tempCard}>
                <Icon name="thermometer" size={14} color={stats.gpu_temp > 80 ? semantic.error : accent.cyan} />
                <Text style={styles.tempLabel}>GPU Temperature</Text>
                <Text style={[styles.tempValue, { color: stats.gpu_temp > 80 ? semantic.error : text.primary }]}>
                  {stats.gpu_temp}°C
                </Text>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ChartBar({ label, percent, color, value }: { label: string; percent: number; color: string; value: string }) {
  const barHeight = Math.max(8, (percent / BAR_MAX) * CHART_HEIGHT * 0.7);
  return (
    <View style={styles.chartBarCol}>
      <Text style={styles.chartBarValue}>{value}</Text>
      <View style={[styles.chartBar, { height: barHeight, backgroundColor: color }]} />
      <Text style={styles.chartBarLabel}>{label}</Text>
    </View>
  );
}

function DetailCard({ label, value, icon: iconName, color, delay }: {
  label: string; value: string; icon: string; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(duration.slow).delay(delay)} style={styles.detailCard}>
      <Icon name={iconName} size={16} color={color} />
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
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
  list: {
    paddingTop: spacing.space12,
    gap: spacing.space12,
    paddingBottom: spacing.space24,
  },
  chartCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    gap: spacing.space12,
  },
  chartTitle: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: spacing.space8,
  },
  chartBarCol: {
    alignItems: 'center',
    gap: spacing.space8,
    flex: 1,
  },
  chartBar: {
    width: 28,
    borderRadius: radius.sm,
    minHeight: 8,
    opacity: 0.8,
  },
  chartBarValue: {
    ...typography.mono,
    fontSize: 10,
    color: text.secondary,
  },
  chartBarLabel: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space8,
  },
  detailCard: {
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
  detailValue: {
    ...typography.heading3,
    color: text.primary,
    fontWeight: '700',
  },
  detailLabel: {
    ...typography.caption,
    color: text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tempCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space12,
  },
  tempLabel: {
    ...typography.bodySmall,
    color: text.secondary,
    flex: 1,
  },
  tempValue: {
    ...typography.mono,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.space40,
    gap: spacing.space8,
  },
  emptyText: {
    ...typography.bodySmall,
    color: text.tertiary,
  },
});
