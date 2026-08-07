import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from '../../Icon';
import { accent, text, glass } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';

type Props = {
  content: string;
  timestamp: number;
};

export default function UserMessage({ content, timestamp }: Props) {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{content}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>{time}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    marginBottom: spacing.space8,
  },
  bubble: {
    backgroundColor: accent.cyan,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    paddingVertical: spacing.space12,
    paddingHorizontal: spacing.space16,
  },
  text: {
    ...typography.body,
    color: text.inverse,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.space4,
    paddingRight: spacing.space4,
  },
  time: {
    color: text.tertiary,
    fontSize: 10,
  },
});
