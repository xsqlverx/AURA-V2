import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { text, glass, accent } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';

type Props = {
  language: string;
  code: string;
};

export default function CodeMessage({ language, code }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.lang}>{language}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.code}>{code}</Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: spacing.space8,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.border,
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: spacing.space12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
  },
  lang: {
    ...typography.caption,
    color: accent.cyan,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scroll: {
    backgroundColor: '#0B1017',
    padding: spacing.space12,
  },
  code: {
    ...typography.mono,
    color: text.primary,
    fontSize: 12,
    lineHeight: 18,
  },
});
