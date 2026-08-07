import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useAnimatedOpacity } from './OrbAnimations';

type Props = {
  size: number;
  glowColor: string;
  intensity: number;
  pulse: SharedValue<number>;
};

export default function OrbGlow({ size, glowColor, intensity, pulse }: Props) {
  const glowSize = size * 2.5;
  const opacityVal = useSharedValue(intensity);

  const glowStyle = useAnimatedStyle(() => {
    const pulseBoost = 1 + pulse.value * 0.3;
    return {
      width: glowSize,
      height: glowSize,
      borderRadius: glowSize / 2,
      backgroundColor: glowColor,
      opacity: intensity * pulseBoost,
      transform: [{ scale: 1 + pulse.value * 0.1 }],
    };
  });

  return <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
