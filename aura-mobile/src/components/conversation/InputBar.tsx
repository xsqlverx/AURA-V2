import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import Icon from '../Icon';
import { text, glass, accent, semantic } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing, iconSize } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { spring as springConfig } from '../../tokens/animation';

const ANIM_COMMON = { damping: 12, stiffness: 200, mass: 1 };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMicIn: () => void;
  onMicOut: () => void;
  isRecording: boolean;
  disabled: boolean;
  kbHeight: number;
};

export default function InputBar({
  value, onChangeText, onSend, onMicIn, onMicOut,
  isRecording, disabled, kbHeight,
}: Props) {
  const hasText = value.trim().length > 0;

  const animatedBar = useAnimatedStyle(() => ({
    paddingBottom: withSpring(Math.max(kbHeight, 12), ANIM_COMMON),
  }));

  return (
    <Animated.View style={[styles.container, animatedBar]}>
      <View style={styles.inner}>
        <Pressable
          style={({ pressed }) => [
            styles.micBtn,
            isRecording && styles.micActive,
            pressed && { opacity: 0.8 },
          ]}
          onPressIn={onMicIn}
          onPressOut={onMicOut}
        >
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={iconSize.action}
            color={isRecording ? '#fff' : text.secondary}
          />
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={text.tertiary}
            value={value}
            onChangeText={onChangeText}
            multiline
            editable={!disabled}
          />
        </View>

        {hasText && (
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={onSend}
          >
            <Icon name="arrow-upward" size={iconSize.action} color={text.inverse} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: glass.border,
    paddingHorizontal: spacing.space12,
    paddingTop: spacing.space12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.space8,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: {
    backgroundColor: semantic.error,
    borderColor: semantic.error,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: spacing.space16,
    paddingVertical: Platform.OS === 'ios' ? spacing.space12 : spacing.space8,
    maxHeight: 100,
  },
  input: {
    ...typography.body,
    color: text.primary,
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: accent.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
