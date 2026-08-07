import { useCallback, useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { glass, semantic, text, accent } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { spring } from '../tokens/animation';
import { haptic } from '../motion/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  variant?: Variant;
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
};

const VARIANT_CONFIG: Record<Variant, { bg: string; textColor: string; border: string | null }> = {
  primary: { bg: accent.cyan, textColor: text.inverse, border: null },
  secondary: { bg: glass.bg, textColor: text.primary, border: glass.border },
  ghost: { bg: 'transparent', textColor: text.secondary, border: null },
  danger: { bg: 'rgba(255,69,58,0.15)', textColor: semantic.error, border: semantic.error + '4D' },
};

export default function GlassButton({
  variant = 'primary',
  onPress,
  children,
  disabled = false,
  loading = false,
  style,
  hapticFeedback = true,
}: Props) {
  const config = VARIANT_CONFIG[variant];
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isPressed = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    isPressed.current = true;
    scale.value = withSpring(0.94, spring.default);
    opacity.value = withSpring(0.85, spring.default);
    if (hapticFeedback) haptic.press();
  }, [disabled, loading]);

  const handlePressOut = useCallback(() => {
    isPressed.current = false;
    scale.value = withSpring(1, spring.default);
    opacity.value = withSpring(1, spring.default);
  }, []);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.base,
          { backgroundColor: config.bg },
          config.border && { borderWidth: 1, borderColor: config.border },
          (disabled || loading) && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={config.textColor} />
        ) : (
          <Text style={[styles.text, { color: config.textColor }]}>{children}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.space20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 120,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});
