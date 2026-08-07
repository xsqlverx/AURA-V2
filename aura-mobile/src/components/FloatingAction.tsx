import { Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from './Icon';
import { accent } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spring } from '../tokens/animation';
import { haptic } from '../motion/haptics';

type Props = {
  icon: string;
  onPress: () => void;
  color?: string;
};

export default function FloatingAction({ icon, onPress, color = accent.cyan }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.fab, animatedStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: color },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => { haptic.press(); onPress(); }}
        onPressIn={() => { scale.value = withSpring(0.9, spring.default); }}
        onPressOut={() => { scale.value = withSpring(1, spring.default); }}
      >
        <Icon name={icon} size={22} color="#050505" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
