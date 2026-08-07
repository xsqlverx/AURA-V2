import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from './Icon';
import { text } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { duration } from '../tokens/animation';

type Props = {
  label: string;
  icon?: string;
  color?: string;
  count?: number;
};

export default function SectionHeader({ label, icon, color, count }: Props) {
  const textColor = color || text.secondary;
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.row}>
      {icon && (
        <Icon name={icon} size={14} color={textColor} />
      )}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {count !== undefined && (
        <Text style={[styles.count, { color: text.tertiary }]}>{count}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.space12,
    marginTop: spacing.space4,
  },
  label: {
    ...typography.label,
  },
  count: {
    ...typography.caption,
    marginLeft: 'auto',
  },
});
