import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from '../../Icon';
import { text, glass, accent } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';
import type { MemoryInfo } from '../types';

const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
  recalled: { icon: 'psychology', label: 'Recalled from memory' },
  saved: { icon: 'save', label: 'Saved to memory' },
  updated: { icon: 'edit', label: 'Memory updated' },
  corrected: { icon: 'check', label: 'Preference corrected' },
};

type Props = {
  memory: MemoryInfo;
};

export default function MemoryMessage({ memory }: Props) {
  const action = ACTION_LABELS[memory.action] || ACTION_LABELS.recalled;

  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Icon name={action.icon} size={14} color={accent.purple} />
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.text}>{memory.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: spacing.space8,
    paddingHorizontal: spacing.space4,
  },
  card: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${accent.purple}30`,
    borderLeftWidth: 3,
    borderLeftColor: accent.purple,
    padding: spacing.space12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    marginBottom: spacing.space8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: `${accent.purple}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.caption,
    color: accent.purple,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: `${accent.purple}15`,
    marginBottom: spacing.space8,
  },
  text: {
    ...typography.bodySmall,
    color: text.secondary,
    fontStyle: 'italic',
  },
});
