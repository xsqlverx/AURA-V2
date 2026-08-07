import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { text, glass, accent } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { duration, spring as springCfg } from '../../tokens/animation';
import Icon from '../Icon';

type Action = {
  icon: string;
  label: string;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

export default function SmartActions({ actions }: Props) {
  if (actions.length === 0) return null;

  return (
    <View style={styles.container}>
      {actions.map((action, i) => (
        <Animated.View
          key={action.label}
          entering={FadeInUp.duration(duration.normal).springify().damping(springCfg.default.damping).stiffness(springCfg.default.stiffness).delay(450 + i * 70)}
          style={{ flex: 1 }}
        >
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              pressed && { opacity: 0.85, backgroundColor: glass.bgActive },
            ]}
            onPress={() => action.onPress()}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <Icon name={action.icon} size={16} color={accent.cyan} />
            <Text style={styles.label}>{action.label}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.space8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
    backgroundColor: glass.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.space16,
    minHeight: 48,
  },
  btnPressed: {
    backgroundColor: glass.bgActive,
    opacity: 0.85,
  },
  label: {
    ...typography.caption,
    color: text.primary,
    fontWeight: '700',
  },
});
