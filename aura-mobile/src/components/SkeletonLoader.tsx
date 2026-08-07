import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { glass } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';
import { duration } from '../tokens/animation';

type Props = {
  lines?: number;
  cardHeight?: number;
};

function ShimmerLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: duration.skeleton, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.1, 0.2, 0.1]),
  }));

  return (
    <Animated.View style={[styles.line, { width: width as any, height }, animatedStyle]} />
  );
}

export default function SkeletonLoader({ lines = 3, cardHeight }: Props) {
  return (
    <View style={[styles.card, cardHeight ? { height: cardHeight } : undefined]}>
      <ShimmerLine width="60%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerLine key={i} width={i === lines - 1 ? '40%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: glass.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    gap: spacing.space12,
  },
  line: {
    borderRadius: radius.sm,
    backgroundColor: glass.border,
    overflow: 'hidden',
  },
});
