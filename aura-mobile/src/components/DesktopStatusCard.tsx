import { View, Text, StyleSheet } from 'react-native';
import GlassCard from './GlassCard';
import Icon from './Icon';
import StatusChip from './StatusChip';
import { text, semantic, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';

type Props = {
  connected: boolean;
  cpu?: number;
  ram?: number;
  battery?: number;
  state?: string;
};

export default function DesktopStatusCard({ connected, cpu, ram, battery, state }: Props) {
  const cpuColor = cpu && cpu > 80 ? semantic.error : cpu && cpu > 50 ? semantic.warning : accent.cyan;
  const ramColor = ram && ram > 80 ? semantic.error : ram && ram > 50 ? semantic.warning : accent.purple;

  return (
    <GlassCard variant={connected ? 'glowCyan' : 'error'}>
      <View style={styles.header}>
        <Text style={styles.title}>Desktop</Text>
        <StatusChip variant={connected ? 'online' : 'offline'} label={connected ? 'Online' : 'Offline'} />
      </View>
      {state && <Text style={styles.state}>{state}</Text>}
      {connected && (
        <View style={styles.metrics}>
          {cpu !== undefined && (
            <View style={styles.metric}>
              <Icon name="memory" size={12} color={cpuColor} />
              <Text style={[styles.metricValue, { color: cpuColor }]}>{cpu}%</Text>
            </View>
          )}
          {ram !== undefined && (
            <View style={styles.metric}>
              <Icon name="storage" size={12} color={ramColor} />
              <Text style={[styles.metricValue, { color: ramColor }]}>{ram}%</Text>
            </View>
          )}
          {battery !== undefined && (
            <View style={styles.metric}>
              <Icon
                name="battery-full"
                size={12}
                color={battery < 20 ? semantic.error : semantic.success}
              />
              <Text
                style={[
                  styles.metricValue,
                  { color: battery < 20 ? semantic.error : semantic.success },
                ]}
              >
                {battery}%
              </Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space8,
  },
  title: {
    ...typography.heading3,
    color: text.primary,
  },
  state: {
    ...typography.bodySmall,
    color: text.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.space8,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.space16,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
  metricValue: {
    ...typography.mono,
    fontWeight: '700',
  },
});
