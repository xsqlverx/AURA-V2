import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { text, glass } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { duration, spring } from '../../tokens/animation';
import Icon from '../Icon';

type Card = {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  type: 'info' | 'warning' | 'success';
};

const MAX_CARDS = 3;

type Props = {
  cards: Card[];
};

function CardIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <View style={[styles.iconWrap, { backgroundColor: `${color}14` }]}>
      <Icon name={icon} size={14} color={color} />
    </View>
  );
}

export default function IntelligenceCards({ cards }: Props) {
  const visible = cards.slice(0, MAX_CARDS);
  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      {visible.map((card, i) => (
        <Animated.View
          key={`${card.title}-${i}`}
          entering={FadeInDown.duration(duration.slow).springify().damping(spring.default.damping).stiffness(spring.default.stiffness).delay(350 + i * 80)}
          style={styles.card}
        >
          <CardIcon icon={card.icon} color={card.color} />
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>{card.title}</Text>
            {card.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{card.subtitle}</Text> : null}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.space8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.space16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: text.secondary,
    marginTop: 2,
  },
});
