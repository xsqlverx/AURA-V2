import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { semantic, glass, text, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';

type StatusVariant = 'online' | 'offline' | 'thinking' | 'speaking' | 'count';

type Props = {
  variant: StatusVariant;
  label: string;
  count?: number;
};

const VARIANT_CONFIG: Record<StatusVariant, { dotColor: string; bg: string; textColor: string }> = {
  online: { dotColor: semantic.success, bg: 'rgba(63,185,80,0.08)', textColor: semantic.success },
  offline: { dotColor: semantic.error, bg: 'rgba(255,69,58,0.08)', textColor: semantic.error },
  thinking: { dotColor: semantic.warning, bg: 'rgba(255,159,10,0.08)', textColor: semantic.warning },
  speaking: { dotColor: accent.cyan, bg: 'rgba(0,242,255,0.08)', textColor: accent.cyan },
  count: { dotColor: 'transparent', bg: glass.bg, textColor: text.primary },
};

function AnimatedDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export default function StatusChip({ variant, label, count }: Props) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      {variant !== 'count' && variant !== 'offline' ? (
        <AnimatedDot color={config.dotColor} />
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
    borderRadius: 9999,
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
