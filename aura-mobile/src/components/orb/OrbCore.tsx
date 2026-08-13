import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { useOrbColors } from './OrbAnimations';
import type { StateConfig, OrbState } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
  pulse: SharedValue<number>;
  speech: SharedValue<number>;
  state: OrbState;
  reduced: boolean;
};

export default function OrbCore({ size, config, pulse, speech, state, reduced }: Props) {
  const { coreColorStyle } = useOrbColors(config, pulse, state, reduced);
  const coreDiameter = size * 0.7;

  const scaleStyle = useAnimatedStyle(() => {
    let scale: number;
    if (reduced) {
      scale = 1;
    } else if (state === 'error') {
      scale = 1 + pulse.value * 0.08;
    } else if (config.speechDriven) {
      scale = 1 + (speech.value - orbSpeechBase) * 0.45;
    } else {
      scale = 1 - config.breathingAmplitude + pulse.value * config.breathingAmplitude * 2;
    }
    return { transform: [{ scale }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    const glowPulse = config.speechDriven
      ? interpolate(speech.value, [0.15, 0.6], [0.6, 1.05])
      : 0.7 + pulse.value * 0.3;
    return {
      shadowOpacity: config.glowIntensity * glowPulse,
    };
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
          shadowRadius: coreDiameter * 0.3,
          elevation: 8,
        },
        coreColorStyle,
        scaleStyle,
        glowStyle,
      ]}
    />
  );
}

const orbSpeechBase = 0.35;

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
  },
});
