import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from '../../Icon';
import { text, glass, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { duration } from '../../../tokens/animation';

type Props = {
  content: string;
};

export default function ErrorMessage({ content }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Icon name="error-outline" size={16} color={semantic.error} />
          <Text style={styles.label}>Error</Text>
        </View>
        <Text style={styles.text}>{content}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: spacing.space8,
    paddingHorizontal: spacing.space4,
  },
  card: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${semantic.error}40`,
    padding: spacing.space12,
    gap: spacing.space8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  label: {
    ...typography.caption,
    color: semantic.error,
    fontWeight: '700',
  },
  text: {
    ...typography.bodySmall,
    color: text.secondary,
  },
});
