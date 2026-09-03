import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

type ToastType = 'error' | 'info' | 'success';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
  type?: ToastType;
}

const BORDER_COLORS: Record<ToastType, string> = {
  error: Colors.red.primary,
  info: Colors.cyan.primary,
  success: Colors.green.primary,
};

export function Toast({ message, visible, onDismiss, duration = 3000, type = 'error' }: ToastProps) {
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, Theme.animation.spring);
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withSpring(80, Theme.animation.spring, () => {
          runOnJS(onDismiss)();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { borderColor: BORDER_COLORS[type] }, animStyle]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    borderWidth: 1,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  text: {
    color: Colors.text.primary,
    fontSize: 14,
    textAlign: 'center',
  },
});
