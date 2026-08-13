import { useCallback } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { glass, text, accent } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { spring } from '../tokens/animation';
import { haptic } from '../motion/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  variant?: Variant;
  size?: Size;
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
};

const VARIANT_CONFIG: Record<Variant, { bg: string; textColor: string; border: string | null; pressBg: string }> = {
  primary: { bg: 'rgba(0,229,242,0.12)', textColor: text.primary, border: 'rgba(0,229,242,0.35)', pressBg: 'rgba(0,229,242,0.20)' },
  secondary: { bg: glass.glass1, textColor: text.primary, border: glass.border, pressBg: 'rgba(255,255,255,0.08)' },
  ghost: { bg: 'transparent', textColor: text.secondary, border: null, pressBg: 'rgba(255,255,255,0.06)' },
  danger: { bg: 'rgba(255,90,97,0.12)', textColor: '#FF7C82', border: 'rgba(255,90,97,0.3)', pressBg: 'rgba(255,90,97,0.2)' },
};

const SIZE_HEIGHTS: Record<Size, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

export default function GlassButton({
  variant = 'primary',
  size = 'md',
  onPress,
  children,
  disabled = false,
  loading = false,
  style,
  hapticFeedback = true,
}: Props) {
  const config = VARIANT_CONFIG[variant];
  const scale = useSharedValue(1);
  const pressBgOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: config.pressBg,
    opacity: pressBgOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    scale.value = withSpring(0.97, spring.micro);
    pressBgOpacity.value = withSpring(1, spring.micro);
    if (hapticFeedback) {
      if (variant === 'danger') haptic.longPress();
      else haptic.press();
    }
  }, [disabled, loading, variant]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, spring.micro);
    pressBgOpacity.value = withSpring(0, spring.micro);
  }, []);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.base,
          { backgroundColor: config.bg, height: SIZE_HEIGHTS[size] },
          config.border && { borderWidth: 1, borderColor: config.border },
          (disabled || loading) && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {config.border && <Animated.View style={[StyleSheet.absoluteFill, styles.pressLayer, bgStyle]} />}
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
    borderRadius: radius.sm,
    paddingHorizontal: spacing.space20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 120,
    overflow: 'hidden',
  },
  pressLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    ...typography.caption,
  },
});
