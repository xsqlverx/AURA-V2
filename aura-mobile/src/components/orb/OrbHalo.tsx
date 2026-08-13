import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { useRingRotation, useAnimatedOpacity } from './OrbAnimations';
import type { StateConfig } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
  pulse: SharedValue<number>;
  speech: SharedValue<number>;
  reduced: boolean;
};

export default function OrbHalo({ size, config, pulse, speech, reduced }: Props) {
  const { ringRotationStyle } = useRingRotation(config.haloRotationMs, reduced);
  const { opacityStyle } = useAnimatedOpacity(config.haloVisible, 400);
  const haloDiameter = size * 1.55;

  const ringStyle = useAnimatedStyle(() => {
    const energy = config.speechDriven
      ? interpolate(speech.value, [0.15, 0.6], [0.05, 0.16])
      : interpolate(pulse.value, [0, 1], [0.06, 0.14]);
    return { opacity: energy };
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
        ringRotationStyle,
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
    borderWidth: 1,
  },
});
