import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  variant?: Variant;
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function GlassButton({
  variant = 'primary',
  onPress,
  children,
  disabled = false,
  loading = false,
  style,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || disabled) && { opacity: 0.85 },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#050505' : colors.onSurface}
        />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.onSurface,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    ...typography.labelSm,
    color: '#050505',
  },
  primaryText: {
    color: '#050505',
  },
  secondaryText: {
    color: colors.onSurface,
  },
  ghostText: {
    color: colors.onSurface,
  },
});
