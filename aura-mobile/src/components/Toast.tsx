import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import Icon from './Icon';
import { glass, text, semantic, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { duration } from '../tokens/animation';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Props = {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  autoDismiss?: number;
};

const TOAST_CONFIG: Record<ToastType, { icon: string; accent: string }> = {
  success: { icon: 'check-circle', accent: semantic.success },
  error: { icon: 'error-outline', accent: semantic.error },
  info: { icon: 'info-outline', accent: accent.cyan },
  warning: { icon: 'info-outline', accent: semantic.warning },
};

export default function Toast({ message, type = 'info', visible, onDismiss, autoDismiss = 3000 }: Props) {
  const config = TOAST_CONFIG[type];
  const progress = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      progress.value = 1;
      progress.value = withTiming(0, { duration: autoDismiss }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }
  }, [visible]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(duration.toastIn).springify()}
      exiting={SlideOutUp.duration(duration.toastOut)}
      style={styles.container}
    >
      <Pressable onPress={onDismiss} style={styles.inner}>
        <Icon name={config.icon} size={16} color={config.accent} />
        <Text style={styles.message}>{message}</Text>
      </Pressable>
      <View style={[styles.progressTrack, { backgroundColor: config.accent + '20' }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: config.accent }, progressStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.space16,
    right: spacing.space16,
    backgroundColor: glass.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    overflow: 'hidden',
    zIndex: 200,
    backdropFilter: 'blur(40px)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    padding: spacing.space16,
  },
  message: {
    ...typography.bodySmall,
    color: text.primary,
    flex: 1,
  },
  progressTrack: {
    height: 2,
  },
  progressFill: {
    height: '100%',
  },
});
