import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import Icon from '../../Icon';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';
import type { ToolStatus } from '../types';

const ICON_MAP: Record<string, string> = {
  hourglass: 'hourglass-empty',
  check: 'check-circle',
  error: 'error-outline',
};

type Props = {
  name: string;
  status: ToolStatus;
  detail?: string;
};

function ProgressBar({ status }: { status: ToolStatus }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (status === 'running') {
      progress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      progress.value = withTiming(1, { duration: 300 });
    }
  }, [status]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          { backgroundColor: status === 'completed' ? semantic.success : status === 'failed' ? semantic.error : accent.cyan },
          style,
        ]}
      />
    </View>
  );
}

export default function ToolMessage({ name, status, detail }: Props) {
  const isRunning = status === 'running';
  const isSuccess = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={[styles.card, isSuccess && styles.cardSuccess, isFailed && styles.cardFailed]}>
        <View style={styles.header}>
          <Icon
            name={isRunning ? ICON_MAP.hourglass : isSuccess ? ICON_MAP.check : ICON_MAP.error}
            size={16}
            color={isSuccess ? semantic.success : isFailed ? semantic.error : accent.cyan}
          />
          <Text style={[styles.name, isSuccess && { color: semantic.success }, isFailed && { color: semantic.error }]}>
            {isRunning ? 'Executing' : isSuccess ? 'Completed' : 'Failed'}
          </Text>
          <Text style={styles.statusLabel}>{name}</Text>
        </View>
        <ProgressBar status={status} />
        {detail && <Text style={styles.detail}>{detail}</Text>}
        {isSuccess && <View style={styles.checkIcon}><Icon name="check" size={14} color={semantic.success} /></View>}
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
    padding: spacing.space12,
    gap: spacing.space8,
  },
  cardSuccess: {
    borderColor: `${semantic.success}40`,
  },
  cardFailed: {
    borderColor: `${semantic.error}40`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  name: {
    ...typography.caption,
    color: text.primary,
    fontWeight: '700',
    flex: 1,
  },
  statusLabel: {
    ...typography.mono,
    color: text.secondary,
    fontSize: 11,
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
  detail: {
    ...typography.bodySmall,
    color: text.secondary,
    marginTop: spacing.space2,
  },
  checkIcon: {
    position: 'absolute',
    right: spacing.space12,
    top: spacing.space12,
  },
});
