import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { useHaloRotation, useAnimatedOpacity } from './OrbAnimations';
import type { StateConfig } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
  pulse: SharedValue<number>;
};

export default function OrbHalo({ size, config, pulse }: Props) {
  const { haloStyle } = useHaloRotation(config.haloRotationSpeed, config.haloVisible);
  const { opacityStyle } = useAnimatedOpacity(config.haloVisible, 400);

  const haloDiameter = size * 1.5;

  const ringStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pulse.value, [0, 1], [0.05, 0.15]);
    return { opacity };
  });

  if (!config.haloVisible) return null;

  return (
    <Animated.View
      style={[
        styles.halo,
        {
          width: haloDiameter,
          height: haloDiameter,
          borderRadius: haloDiameter / 2,
          borderColor: config.ringsColor,
        },
        haloStyle,
        opacityStyle,
        ringStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
