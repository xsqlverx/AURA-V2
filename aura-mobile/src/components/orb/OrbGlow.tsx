import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';

type Props = {
  size: number;
  glowColor: string;
  intensity: number;
  pulse: SharedValue<number>;
  speech: SharedValue<number>;
  speechDriven: boolean;
};

export default function OrbGlow({ size, glowColor, intensity, pulse, speech, speechDriven }: Props) {
  const glowSize = size * 2.4;

  const glowStyle = useAnimatedStyle(() => {
    const energy = speechDriven
      ? interpolate(speech.value, [0.15, 0.6], [0.5, 1])
      : 0.7 + pulse.value * 0.3;
    return {
      width: glowSize,
      height: glowSize,
      borderRadius: glowSize / 2,
      backgroundColor: glowColor,
      opacity: intensity * energy,
      transform: [{ scale: 1 + pulse.value * 0.05 }],
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
