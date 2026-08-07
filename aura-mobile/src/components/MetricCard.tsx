import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import { text, semantic, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';

type Props = {
  label: string;
  value: string;
  percent: number;
  color?: string;
  icon?: React.ReactNode;
  index?: number;
};

export default function MetricCard({ label, value, percent, color, icon, index = 0 }: Props) {
  const barColor = color || (percent > 80 ? semantic.error : percent > 50 ? semantic.warning : accent.cyan);

  return (
    <GlassCard style={{ flex: 1 }} index={index}>
      <View style={styles.header}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: barColor }]}>{value}</Text>
      <View style={styles.barTrack}>
        <LinearGradient
          colors={[accent.purple, barColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFill, { width: `${Math.min(percent, 100)}%` }]}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.space8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    color: text.primary,
    fontWeight: '700',
  },
  value: {
    ...typography.display,
    fontSize: 22,
    marginBottom: spacing.space8,
  },
  barTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
