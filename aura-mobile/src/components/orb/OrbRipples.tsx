import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAnimatedOpacity } from './OrbAnimations';
import type { StateConfig } from './OrbTypes';

type Props = {
  size: number;
  config: StateConfig;
};

function RippleRing({
  index,
  size,
  color,
  speed,
}: {
  index: number;
  size: number;
  color: string;
  speed: number;
}) {
  const progress = useSharedValue(0);
  const maxDiameter = size * 3;
  const dur = 1500 / Math.max(speed, 0.3);
  const delay = index * 300;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: dur, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    return () => cancelAnimation(progress);
  }, [speed]);

  const style = useAnimatedStyle(() => {
    const diameter = interpolate(progress.value, [0, 1], [size * 0.5, maxDiameter]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.3, 0]);
    return {
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      borderColor: color,
      opacity,
      transform: [{ translateX: -diameter / 2 + size / 2 }, { translateY: -diameter / 2 + size / 2 }],
    };
  });

  return <Animated.View style={[styles.ring, style]} pointerEvents="none" />;
}

export default function OrbRipples({ size, config }: Props) {
  const { opacityStyle } = useAnimatedOpacity(config.ripplesActive, 300);

  if (!config.ripplesActive || config.rippleCount === 0) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, opacityStyle]} pointerEvents="none">
      {Array.from({ length: config.rippleCount }).map((_, i) => (
        <RippleRing
          key={i}
          index={i}
          size={size}
          color={config.ringsColor}
          speed={config.rippleSpeed}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
});
