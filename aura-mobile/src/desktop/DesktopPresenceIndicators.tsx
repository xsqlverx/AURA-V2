import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { typography } from '../tokens/typography';
import { text, semantic, accent } from '../tokens/colors';
import Icon from '../components/Icon';
import { useDesktopPresence } from './DesktopPresenceContext';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ConnectionIndicator() {
  const { state } = useDesktopPresence();
  const isHealthy = state.health.backend === 'healthy';
  return (
    <View style={[styles.indicator, { borderColor: isHealthy ? colors.glassBorder : semantic.error }]}>
      <View style={[styles.dotSm, { backgroundColor: isHealthy ? semantic.success : semantic.error }]} />
      <Text style={styles.indicatorText}>
        {isHealthy ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  );
}

export function CpuIndicator() {
  const { state, hasCapability } = useDesktopPresence();
  if (!hasCapability('system_stats') || !state.system) return null;
  const cpu = state.system.cpu_percent;
  const color = cpu > 80 ? semantic.warning : cpu > 50 ? accent.cyan : text.secondary;
  return (
    <View style={styles.indicator}>
      <Icon name="cpu" size={12} color={color} />
      <Text style={[styles.indicatorText, { color }]}>{cpu}%</Text>
    </View>
  );
}

export function MemoryIndicator() {
  const { state, hasCapability } = useDesktopPresence();
  if (!hasCapability('system_stats') || !state.system) return null;
  const mem = state.system.memory_percent;
  const used = state.system.memory_used_gb?.toFixed(1);
  const total = state.system.memory_total_gb?.toFixed(1);
  const color = mem > 80 ? semantic.warning : text.secondary;
  return (
    <View style={styles.indicator}>
      <Icon name="memory" size={12} color={color} />
      <Text style={[styles.indicatorText, { color }]}>{used}/{total}GB</Text>
    </View>
  );
}

export function DiskIndicator() {
  const { state, hasCapability } = useDesktopPresence();
  if (!hasCapability('system_stats') || !state.system) return null;
  const disk = state.system.disk_percent;
  const color = disk > 85 ? semantic.warning : text.secondary;
  return (
    <View style={styles.indicator}>
      <Icon name="hard-drive" size={12} color={color} />
      <Text style={[styles.indicatorText, { color }]}>{disk}%</Text>
    </View>
  );
}

export function MediaIndicator() {
  const { state, hasCapability } = useDesktopPresence();
  if (!hasCapability('media') || !state.media) return null;
  return (
    <View style={styles.indicator}>
      <Icon name="music-note" size={12} color={state.media.is_playing ? accent.cyan : text.tertiary} />
      <Text style={styles.indicatorText} numberOfLines={1}>{state.media.title}</Text>
    </View>
  );
}

export function FocusIndicator() {
  const { state, hasCapability } = useDesktopPresence();
  if (!hasCapability('focus') || !state.focus) return null;
  return (
    <View style={styles.indicator}>
      <Icon name="terminal" size={12} color={accent.cyan} />
      <Text style={styles.indicatorText} numberOfLines={1}>{state.focus.app}</Text>
    </View>
  );
}

export function UptimeIndicator() {
  const { state, hasCapability } = useDesktopPresence();
  if (!hasCapability('health')) return null;
  return (
    <View style={styles.indicator}>
      <Icon name="clock" size={12} color={text.secondary} />
      <Text style={styles.indicatorText}>Up {formatUptime(state.health.uptime_seconds)}</Text>
    </View>
  );
}

export function DesktopStatusBar() {
  const { state } = useDesktopPresence();
  const isSynced = state.syncStatus === 'synced';
  return (
    <View style={[styles.statusBar, { borderColor: colors.glassBorder }]}>
      <ConnectionIndicator />
      <View style={styles.divider} />
      <FocusIndicator />
      <View style={styles.divider} />
      <CpuIndicator />
      <MemoryIndicator />
      <DiskIndicator />
      <View style={{ flex: 1 }} />
      <View style={[styles.syncDot, { backgroundColor: isSynced ? semantic.success : semantic.warning }]} />
    </View>
  );
}

export function PresenceRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    ...typography.caption,
    color: text.secondary,
    fontSize: 10,
    maxWidth: 100,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: colors.glassBorder,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderRadius: radius.input,
  },
  syncDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
