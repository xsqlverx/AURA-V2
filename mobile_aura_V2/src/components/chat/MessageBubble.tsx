import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

// Clip-path polygon for 45° corner cut on bottom-right
const CLIP_WEB = 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)';
const CLIP_USER_WEB = 'polygon(0 0, 100% 0, 100% 100%, 14px 100%, 0 calc(100% - 14px))';

export function MessageBubble({ message }: MessageBubbleProps) {
  const translateY = useSharedValue(16);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, Theme.animation.spring);
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const isUser = message.role === 'user';

  const clipStyle = Platform.OS === 'web'
    ? { clipPath: isUser ? CLIP_USER_WEB : CLIP_WEB }
    : { borderRadius: Theme.radius.md, borderBottomRightRadius: isUser ? Theme.radius.md : 4 };

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.userRow : styles.auraRow,
        animStyle,
      ]}
    >
      {isUser ? (
        <View style={[styles.userBubble, clipStyle]}>
          <Text style={styles.userText}>{message.content}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      ) : (
        <View style={[styles.auraBubble, clipStyle]}>
          {message.routedTo && (
            <View style={styles.routeTag}>
              <Text style={styles.routeText}>{message.routedTo}</Text>
            </View>
          )}
          <Text style={styles.auraText}>{message.content}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    maxWidth: '82%',
    marginBottom: Theme.spacing.sm,
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  auraRow: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: Colors.purple.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 2,
  },
  auraBubble: {
    backgroundColor: 'rgba(17, 17, 24, 0.65)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.cyan.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 2,
  },
  userText: {
    ...Theme.typography.body,
    color: Colors.text.primary,
  },
  auraText: {
    ...Theme.typography.body,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  routeTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cyan.glow,
    paddingHorizontal: Theme.spacing.xs + 2,
    paddingVertical: 2,
    marginBottom: Theme.spacing.xs,
    borderRadius: 4,
  },
  routeText: {
    ...Theme.typography.hud,
    fontSize: 8,
    color: Colors.cyan.primary,
  },
  timestamp: {
    ...Theme.typography.mono,
    fontSize: 9,
    color: Colors.text.dim,
    marginTop: Theme.spacing.xs,
    textAlign: 'right',
  },
});
