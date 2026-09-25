import React, { useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isProcessing: boolean;
  orbState?: string;
  onMicPress?: () => void;
}

export function InputBar({
  value,
  onChangeText,
  onSend,
  isProcessing,
  orbState = 'idle',
  onMicPress,
}: InputBarProps) {
  const borderOpacity = useSharedValue(0.3);
  const sendScale = useSharedValue(1);

  useEffect(() => {
    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1800 }),
        withTiming(0.3, { duration: 1800 })
      ),
      -1,
      false
    );
  }, []);

  const glowBorderStyle = useAnimatedStyle(() => ({
    borderColor:
      orbState === 'listening'
        ? Colors.cyan.primary
        : `rgba(106, 83, 153, ${borderOpacity.value})`,
    shadowColor: orbState === 'listening' ? Colors.cyan.primary : Colors.purple.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: borderOpacity.value * 0.6,
    shadowRadius: 10,
  }));

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const handlePressIn = () => {
    sendScale.value = withSpring(0.88, Theme.animation.spring);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handlePressOut = () => {
    sendScale.value = withSpring(1, Theme.animation.spring);
    onSend();
  };

  const handleMic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onMicPress?.();
  };

  const isActive = orbState === 'listening';
  const hasText = Boolean(value.trim());

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isActive ? 'rgba(0, 240, 255, 0.05)' : 'rgba(18, 16, 26, 0.85)',
          },
          glowBorderStyle,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Direct AURA or ask anything..."
          placeholderTextColor={Colors.text.dim}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={onSend}
          editable={!isProcessing}
        />

        {/* Mic / Voice trigger */}
        <Pressable
          style={[styles.micBtn, isActive && styles.micBtnActive]}
          onPress={handleMic}
        >
          <Text style={[styles.micIcon, isActive && { color: Colors.cyan.primary }]}>
            {isActive ? '🔊' : '🎙️'}
          </Text>
        </Pressable>

        {/* Send Button */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!hasText || isProcessing}
        >
          <Animated.View
            style={[
              styles.sendBtn,
              (!hasText || isProcessing) && styles.sendBtnDisabled,
              sendAnimStyle,
            ]}
          >
            <Text style={styles.sendArrow}>▲</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    elevation: 8,
  },
  input: {
    flex: 1,
    ...Theme.typography.body,
    fontSize: 14,
    color: Colors.text.primary,
    paddingVertical: 6,
  },
  micBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  micBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: Colors.cyan.primary,
  },
  micIcon: {
    fontSize: 15,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.purple.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  sendBtnDisabled: {
    opacity: 0.35,
    backgroundColor: Colors.surfaceElevated,
  },
  sendArrow: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
