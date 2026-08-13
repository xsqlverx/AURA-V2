import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { semantic, text, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';

type StatusVariant = 'online' | 'offline' | 'thinking' | 'speaking' | 'count';

type Props = {
  variant: StatusVariant;
  label: string;
  count?: number;
  pulsing?: boolean;
};

const VARIANT_CONFIG: Record<StatusVariant, { dotColor: string; textColor: string }> = {
  online: { dotColor: semantic.success, textColor: semantic.success },
  offline: { dotColor: semantic.error, textColor: semantic.error },
  thinking: { dotColor: semantic.warning, textColor: semantic.warning },
  speaking: { dotColor: accent.cyan, textColor: accent.cyan },
  count: { dotColor: 'transparent', textColor: text.primary },
};

const ACTIVE_PULSE_VARIANTS: StatusVariant[] = ['thinking', 'speaking'];

function PulseDot({ color, pulse }: { color: string; pulse: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!pulse) {
      scale.value = withTiming(1, { duration: 100 });
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export default function StatusChip({ variant, label, count, pulsing }: Props) {
  const config = VARIANT_CONFIG[variant];
  const shouldPulse = pulsing ?? ACTIVE_PULSE_VARIANTS.includes(variant);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: variant === 'count' ? 'rgba(255,255,255,0.04)' : `${config.dotColor}14`,
          borderColor: variant === 'count' ? 'rgba(255,255,255,0.08)' : `${config.dotColor}29`,
        },
      ]}
    >
      {variant !== 'count' ? (
        <PulseDot color={config.dotColor} pulse={shouldPulse} />
      ) : (
        <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      )}
      <Text style={[styles.label, { color: config.textColor }]}>
        {variant === 'count' && count !== undefined ? `${count}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
    paddingHorizontal: spacing.space8,
    paddingVertical: spacing.space4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
});
