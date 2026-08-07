import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, withSequence, withTiming, useAnimatedStyle, useSharedValue, runOnJS, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import Icon from './Icon';
import GlassButton from './GlassButton';
import { semantic, text } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { iconSize } from '../tokens/spacing';

type Props = {
  message: string;
  onRetry: () => void;
};

function ShakeIcon({ children }: { children: React.ReactNode }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSequence(
      withTiming(-6, { duration: 40 }),
      withTiming(6, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(4, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <ShakeIcon>
        <Icon name="error-outline" size={iconSize.empty} color={semantic.error} />
      </ShakeIcon>
      <Text style={styles.message}>{message}</Text>
      <GlassButton variant="secondary" onPress={onRetry}>
        Retry
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space16,
    paddingTop: 80,
  },
  message: {
    ...typography.bodySmall,
    color: semantic.error,
    textAlign: 'center',
  },
});
