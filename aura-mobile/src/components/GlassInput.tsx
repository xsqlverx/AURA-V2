import { useState, forwardRef } from 'react';
import { TextInput, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, typography } from '../theme';

type Props = TextInputProps & {};

const GlassInput = forwardRef<TextInput, Props>((props, ref) => {
  const [focused, setFocused] = useState(false);
  const { style: _style, onFocus: _onFocus, onBlur: _onBlur, ...rest } = props;

  return (
    <TextInput
      ref={ref}
      style={[
        styles.input,
        focused && styles.focused,
        _style,
      ]}
      placeholderTextColor={colors.onSurfaceMuted}
      onFocus={(e) => { setFocused(true); _onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); _onBlur?.(e); }}
      {...rest}
    />
  );
});

GlassInput.displayName = 'GlassInput';

export default GlassInput;

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.glassBg,
    color: colors.onSurface,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...typography.bodyMd,
  },
  focused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
