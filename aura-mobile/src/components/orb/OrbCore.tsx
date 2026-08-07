import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { useOrbColors } from './OrbAnimations';
import type { StateConfig, OrbState } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
  pulse: SharedValue<number>;
  state: OrbState;
};

export default function OrbCore({ size, config, pulse, state }: Props) {
  const { coreColorStyle } = useOrbColors(config, pulse);
  const coreDiameter = size * 0.7;

  const scaleStyle = useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.15 * config.pulseSpread;
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[
        styles.core,
        {
          width: coreDiameter,
          height: coreDiameter,
          borderRadius: coreDiameter / 2,
          shadowColor: config.glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: config.glowIntensity * 0.8,
          shadowRadius: coreDiameter * 0.3,
          elevation: 8,
        },
        coreColorStyle,
        scaleStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
  },
});
