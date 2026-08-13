import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, SharedValue } from 'react-native-reanimated';
import { glass } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';
import { duration } from '../tokens/animation';

type Props = {
  lines?: number;
  cardHeight?: number;
};

function SkeletonBlock({ progress, width = '100%', height = 14 }: { progress: SharedValue<number>; width?: string | number; height?: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[styles.line, { width: width as any, height }, animatedStyle]} />
  );
}

export default function SkeletonLoader({ lines = 3, cardHeight }: Props) {
  const progress = useSharedValue(0.35);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(0.65, { duration: duration.skeleton / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  return (
    <View style={[styles.card, cardHeight ? { height: cardHeight } : undefined]}>
      <SkeletonBlock progress={progress} width="60%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} progress={progress} width={i === lines - 1 ? '40%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: glass.glass1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    gap: spacing.space12,
  },
  line: {
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
});
