import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Icon from './Icon';
import { glass, text, semantic, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { duration } from '../tokens/animation';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Props = {
  message: string;
  detail?: string;
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

export default function Toast({ message, detail, type = 'info', visible, onDismiss, autoDismiss = 3000 }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, autoDismiss);
    return () => clearTimeout(t);
  }, [visible, autoDismiss, onDismiss]);

  if (!visible) return null;
  const config = TOAST_CONFIG[type];

  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify().damping(30).stiffness(420).withInitialValues({ translateY: 20 })}
      exiting={FadeOutUp.duration(duration.toastOut)}
      style={styles.positioner}
    >
      <Pressable onPress={onDismiss} style={styles.container}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={18} tint="dark" style={styles.blur}>
            <ToastBody config={config} message={message} detail={detail} />
          </BlurView>
        ) : (
          <View style={styles.androidBg}>
            <ToastBody config={config} message={message} detail={detail} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ToastBody({ config, message, detail }: { config: { icon: string; accent: string }; message: string; detail?: string }) {
  return (
    <View style={styles.inner}>
      <Icon name={config.icon} size={16} color={config.accent} />
      <View style={styles.textWrap}>
        <Text style={styles.message}>{message}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    top: 60,
    left: spacing.space16,
    right: spacing.space16,
    zIndex: 200,
  },
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    overflow: 'hidden',
    minHeight: 56,
    maxHeight: 72,
  },
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  androidBg: {
    backgroundColor: 'rgba(11,16,23,0.92)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    padding: spacing.space16,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  message: {
    ...typography.bodySmall,
    color: text.primary,
  },
  detail: {
    ...typography.caption,
    color: text.tertiary,
  },
});
