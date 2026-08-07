import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Icon from './Icon';
import { text } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { duration, stagger } from '../tokens/animation';
import { iconSize } from '../tokens/spacing';

type Props = {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ icon: iconName, title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(duration.slow)}>
        <Icon name={iconName} size={iconSize.empty} color={text.tertiary} />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(duration.slow).delay(stagger.normal)}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </Animated.View>
      {action && (
        <Animated.View entering={FadeInDown.duration(duration.slow).delay(stagger.slow)}>
          {action}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space12,
    paddingTop: 80,
  },
  title: {
    ...typography.heading3,
    color: text.secondary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    color: text.tertiary,
    textAlign: 'center',
    marginTop: spacing.space4,
  },
});
