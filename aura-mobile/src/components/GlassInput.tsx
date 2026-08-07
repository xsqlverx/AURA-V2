import { useState, forwardRef } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { glass, accent, text, semantic } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';

type Props = TextInputProps & {
  error?: boolean;
};

const GlassInput = forwardRef<TextInput, Props>((props, ref) => {
  const [focused, setFocused] = useState(false);
  const { style: _style, onFocus: _onFocus, onBlur: _onBlur, error, ...rest } = props;

  return (
    <TextInput
      ref={ref}
      style={[
        styles.input,
        focused && !error && styles.focused,
        error && styles.error,
        _style,
      ]}
      placeholderTextColor={text.tertiary}
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
    backgroundColor: glass.bg,
    color: text.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
    borderWidth: 1,
    borderColor: glass.border,
    ...typography.body,
  },
  focused: {
    borderColor: accent.cyan + '66',
    shadowColor: accent.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  error: {
    borderColor: semantic.error + '66',
  },
});
