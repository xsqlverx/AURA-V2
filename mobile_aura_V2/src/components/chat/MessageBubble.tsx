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

export function MessageBubble({ message }: MessageBubbleProps) {
  const translateY = useSharedValue(14);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, Theme.animation.spring);
    opacity.value = withTiming(1, { duration: 180 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const isUser = message.role === 'user';

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
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
          <Text style={styles.userTimestamp}>{timestamp}</Text>
        </View>
      ) : (
        <View style={styles.auraBubble}>
          {message.routedTo && (
            <View style={styles.routeTag}>
              <View style={styles.routeDot} />
              <Text style={styles.routeText}>{message.routedTo} CORE</Text>
            </View>
          )}
          <Text style={styles.auraText}>{message.content}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.signatureText}>AURA</Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    maxWidth: '86%',
    marginBottom: 10,
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  auraRow: {
    alignSelf: 'flex-start',
  },

  userBubble: {
    backgroundColor: Colors.purple.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: Colors.purple.glow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  userText: {
    ...Theme.typography.body,
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 21,
  },
  userTimestamp: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 4,
    textAlign: 'right',
  },

  auraBubble: {
    backgroundColor: 'rgba(18, 16, 26, 0.88)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(106, 83, 153, 0.35)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyan.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: Colors.purple.glow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  auraText: {
    ...Theme.typography.body,
    color: Colors.text.primary,
    fontSize: 14.5,
    lineHeight: 22,
  },
  routeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
    borderRadius: 4,
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cyan.primary,
  },
  routeText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.cyan.primary,
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  signatureText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8,
    fontWeight: '700',
    color: Colors.purple.soft,
    letterSpacing: 1,
  },
  timestamp: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    color: Colors.text.dim,
  },
});
