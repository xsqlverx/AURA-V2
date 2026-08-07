import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import Icon from './Icon';
import GlassCard from './GlassCard';
import { text, glass, accent, semantic } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { spring } from '../tokens/animation';
import { haptic } from '../motion/haptics';

type Props = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
};

export default function CommandCard({ icon: iconName, title, subtitle, onPress, color = accent.cyan }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.98, spring.snappy),
      withSpring(1, spring.default)
    );
    haptic.press();
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress}>
        <GlassCard noPadding>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: color + '12' }]}>
              <Icon name={iconName} size={18} color={color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <Icon name="chevron-right" size={14} color={text.tertiary} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    padding: spacing.space16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: {
    ...typography.heading3,
    color: text.primary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: text.secondary,
    marginTop: 2,
  },
});
