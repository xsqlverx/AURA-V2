import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { text, glass, accent } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';

type Props = {
  content: string;
  isStreaming?: boolean;
  timestamp: number;
};

function StreamingCursor() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.cursorWrap, style]} />;
}

export default function TextMessage({ content, isStreaming, timestamp }: Props) {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isEmpty = !content && !isStreaming;

  if (isEmpty) return null;

  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.dot} />
        <Text style={styles.label}>AURA</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.textRow}>
          <Text style={styles.text}>{content}</Text>
          {isStreaming && <StreamingCursor />}
        </View>
        {isStreaming && !content && (
          <View style={styles.thinkingDots}>
            <View style={[styles.dotPulse, { backgroundColor: accent.cyan }]} />
            <View style={[styles.dotPulse, { backgroundColor: accent.cyan }]} />
            <View style={[styles.dotPulse, { backgroundColor: accent.cyan }]} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    marginBottom: spacing.space8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.space4,
    paddingLeft: spacing.space4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: accent.cyan,
  },
  label: {
    color: accent.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  time: {
    color: text.tertiary,
    fontSize: 10,
    marginLeft: 'auto',
  },
  bubble: {
    backgroundColor: glass.bg,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing.space12,
    paddingHorizontal: spacing.space16,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  text: {
    ...typography.body,
    color: text.primary,
    lineHeight: 24,
  },
  cursorWrap: {
    width: 2,
    height: 18,
    backgroundColor: accent.cyan,
    marginLeft: 2,
    marginBottom: 3,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: spacing.space4,
  },
  dotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
});
