import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from '../../Icon';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';
import type { ProgressStage } from '../types';

type Props = {
  stages: ProgressStage[];
};

export default function ProgressMessage({ stages }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={styles.card}>
        {stages.map((stage, i) => (
          <View key={i} style={styles.stage}>
            <View style={styles.stageIndicator}>
              {stage.status === 'completed' ? (
                <Icon name="check-circle" size={14} color={semantic.success} />
              ) : stage.status === 'active' ? (
                <View style={[styles.activeDot, { backgroundColor: accent.cyan }]} />
              ) : (
                <View style={styles.pendingDot} />
              )}
              {i < stages.length - 1 && <View style={[styles.connector, stage.status === 'completed' && { backgroundColor: `${semantic.success}30` }]} />}
            </View>
            <Text
              style={[
                styles.stageLabel,
                stage.status === 'completed' && { color: semantic.success },
                stage.status === 'active' && { color: text.primary },
                stage.status === 'pending' && { color: text.tertiary },
              ]}
            >
              {stage.label}
            </Text>
          </View>
        ))}
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
    borderColor: glass.border,
    padding: spacing.space16,
    gap: 0,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space12,
    minHeight: 32,
  },
  stageIndicator: {
    alignItems: 'center',
    width: 14,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 3,
  },
  connector: {
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 2,
  },
  stageLabel: {
    ...typography.bodySmall,
    color: text.secondary,
    paddingTop: 1,
    flex: 1,
  },
});
