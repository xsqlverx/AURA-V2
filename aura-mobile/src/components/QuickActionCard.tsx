import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from './Icon';
import { glass, text } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';
import { spring } from '../tokens/animation';
import { haptic } from '../motion/haptics';

type Props = {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
};

export default function QuickActionCard({ icon, label, color, onPress }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.tile,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => { haptic.press(); onPress(); }}
        onPressIn={() => { scale.value = withSpring(0.94, spring.default); }}
        onPressOut={() => { scale.value = withSpring(1, spring.default); }}
      >
        <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
          <Icon name={icon} size={22} color={color} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '30%',
  },
  tile: {
    aspectRatio: 1.2,
    backgroundColor: glass.bg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
    borderWidth: 1,
    borderColor: glass.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: text.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
