import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from './Icon';
import { glass } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';
import { spring } from '../tokens/animation';
import { haptic } from '../motion/haptics';

type Props = {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  bgColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function GlassIconButton({
  icon,
  onPress,
  size = 20,
  color = '#fff',
  bgColor,
  disabled = false,
  style,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: bgColor || glass.bg },
          pressed && { opacity: 0.85 },
          disabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, spring.default); haptic.press(); }}
        onPressOut={() => { scale.value = withSpring(1, spring.default); }}
        disabled={disabled}
      >
        <Icon name={icon} size={size} color={color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.sm,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: glass.border,
  },
  disabled: { opacity: 0.4 },
});
