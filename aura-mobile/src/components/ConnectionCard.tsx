import { View, Text, StyleSheet } from 'react-native';
import GlassCard from './GlassCard';
import StatusChip from './StatusChip';
import { text } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';

type Props = {
  connected: boolean;
  url: string;
  latency?: string;
};

export default function ConnectionCard({ connected, url, latency }: Props) {
  return (
    <GlassCard variant={connected ? 'default' : 'error'}>
      <View style={styles.row}>
        <StatusChip
          variant={connected ? 'online' : 'offline'}
          label={connected ? 'ONLINE' : 'OFFLINE'}
        />
        {latency && <Text style={styles.latency}>{latency}</Text>}
      </View>
      <Text style={styles.url}>{url}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space8,
  },
  latency: {
    ...typography.bodySmall,
    color: text.secondary,
  },
  url: {
    ...typography.mono,
    color: text.secondary,
  },
});
