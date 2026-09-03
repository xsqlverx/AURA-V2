import React, { useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isProcessing: boolean;
  orbState?: string;
}

export function InputBar({ value, onChangeText, onSend, isProcessing, orbState = 'idle' }: InputBarProps) {
  const borderOpacity = useSharedValue(0.3);
  const sendScale = useSharedValue(1);

  useEffect(() => {
    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1, false
    );
  }, []);

  const glowBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0, 240, 255, ${borderOpacity.value})`,
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: borderOpacity.value * 0.5,
    shadowRadius: 8,
  }));

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const handlePressIn = () => {
    sendScale.value = withSpring(0.9, Theme.animation.spring);
  };

  const handlePressOut = () => {
    sendScale.value = withSpring(1, Theme.animation.spring);
    onSend();
  };

  const isActive = orbState === 'listening';
  const inputBg = isActive ? 'rgba(0, 240, 255, 0.04)' : Colors.surface;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { backgroundColor: inputBg }, glowBorderStyle]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask AURA anything..."
          placeholderTextColor={Colors.text.dim}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={onSend}
          editable={!isProcessing}
        />
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!value.trim() || isProcessing}
        >
          <Animated.View
            style={[
              styles.sendBtn,
              (!value.trim() || isProcessing) && styles.sendBtnDisabled,
              sendAnimStyle,
            ]}
          >
            <View style={styles.sendArrow} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Theme.radius.pill,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
    backgroundColor: 'rgba(17, 17, 24, 0.7)',
  } as any,
  input: {
    flex: 1,
    ...Theme.typography.body,
    color: Colors.text.primary,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cyan.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendArrow: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.background,
  },
});
