import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Icon from './Icon';
import { glass, text, accent, semantic } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { duration } from '../tokens/animation';

type Props = {
  inputValue: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  isRecording: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function Waveform() {
  return (
    <View style={styles.waveform}>
      {[0.3, 0.6, 1.0, 0.8, 0.4].map((height, i) => {
        const animHeight = useSharedValue(height);
        animHeight.value = withRepeat(
          withTiming(Math.random() * 0.8 + 0.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
        const style = useAnimatedStyle(() => ({
          height: animHeight.value * 20,
        }));
        return <Animated.View key={i} style={[styles.waveBar, style]} />;
      })}
    </View>
  );
}

export default function VoiceBar({
  inputValue,
  onInputChange,
  onSend,
  onMicPressIn,
  onMicPressOut,
  isRecording,
  disabled = false,
  placeholder = 'Message Aura...',
}: Props) {
  return (
    <View style={styles.bar}>
      {isRecording ? (
        <View style={styles.recordingArea}>
          <Waveform />
          <Text style={styles.recordingText}>Release to send</Text>
        </View>
      ) : (
        <>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={onInputChange}
              placeholder={placeholder}
              placeholderTextColor={text.tertiary}
              multiline
              editable={!disabled}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && { opacity: 0.85 },
              (!inputValue.trim() || disabled) && styles.sendBtnDisabled,
            ]}
            onPress={onSend}
            disabled={!inputValue.trim() || disabled}
          >
            <Icon name="arrow-upward" size={20} color="#050505" />
          </Pressable>
        </>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.micBtn,
          isRecording && styles.micBtnActive,
          pressed && { opacity: 0.85 },
        ]}
        onPressIn={onMicPressIn}
        onPressOut={onMicPressOut}
      >
        <Icon
          name={isRecording ? 'stop' : 'mic'}
          size={18}
          color={isRecording ? '#fff' : text.secondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.space20,
    paddingVertical: spacing.space12,
    gap: spacing.space8,
    borderTopWidth: 1,
    borderTopColor: glass.border,
    backgroundColor: '#050505',
    alignItems: 'flex-end',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space8,
  },
  input: {
    ...typography.body,
    color: text.primary,
    maxHeight: 100,
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    backgroundColor: accent.cyan,
  },
  sendBtnDisabled: { opacity: 0.3 },
  micBtn: {
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
  },
  micBtnActive: { backgroundColor: semantic.error, borderColor: semantic.error },
  recordingArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingVertical: spacing.space8,
  },
  recordingText: {
    ...typography.caption,
    color: semantic.error,
    fontWeight: '600',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: accent.cyan,
  },
});
