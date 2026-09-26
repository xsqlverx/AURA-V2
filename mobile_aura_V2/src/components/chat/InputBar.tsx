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
import { Ionicons } from '@expo/vector-icons';
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
  const micPulse = useSharedValue(1);

  const isListening = orbState === 'listening';

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

  useEffect(() => {
    if (isListening) {
      micPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      micPulse.value = withSpring(1);
    }
  }, [isListening]);

  const glowBorderStyle = useAnimatedStyle(() => ({
    borderColor: isListening ? Colors.cyan.primary : Colors.purple.primary,
    shadowColor: isListening ? Colors.cyan.primary : Colors.purple.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: isListening ? 0.9 : borderOpacity.value * 0.5,
    shadowRadius: isListening ? 12 : 8,
  }));

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
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
    if (onMicPress) {
      try {
        onMicPress();
      } catch (e) {
        // Safe guard against native crashes
      }
    }
  };

  const hasText = Boolean(value.trim());

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isListening ? 'rgba(0, 240, 255, 0.06)' : 'rgba(18, 16, 26, 0.88)',
          },
          glowBorderStyle,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={isListening ? "Listening... Speak now..." : "Direct AURA or ask anything..."}
          placeholderTextColor={isListening ? Colors.cyan.bright : Colors.text.dim}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={onSend}
          editable={!isProcessing}
        />

        {/* Mic / Voice trigger */}
        <Pressable onPress={handleMic} style={styles.micHitArea}>
          <Animated.View
            style={[
              styles.micBtn,
              isListening && styles.micBtnActive,
              micAnimStyle,
            ]}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={18}
              color={isListening ? Colors.cyan.primary : Colors.purple.light}
            />
          </Animated.View>
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
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
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
    paddingHorizontal: 12,
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
  micHitArea: {
    padding: 2,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(106, 83, 153, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(106, 83, 153, 0.35)',
  },
  micBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderColor: Colors.cyan.primary,
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
});
