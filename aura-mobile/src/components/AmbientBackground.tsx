import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { palette } from '../tokens/colors';

type Tone = 'cyan' | 'purple' | 'blue' | 'neutral';

type Props = {
  tone?: Tone;
  intensity?: number;
};

const TONE_COLOR: Record<Tone, string> = {
  cyan: palette.cyan,
  purple: palette.purple,
  blue: palette.blue,
  neutral: '#8FA3BF',
};

const DRIFT = 70 * 1000;

function AmbientGlow({
  color,
  baseOpacity,
  size,
  position,
}: {
  color: string;
  baseOpacity: number;
  size: number;
  position: 'top' | 'bottom';
}) {
  const opacity = useSharedValue(baseOpacity);
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(baseOpacity * 1.6, { duration: DRIFT, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    driftX.value = withRepeat(
      withTiming(position === 'top' ? 10 : -10, { duration: DRIFT, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    driftY.value = withRepeat(
      withTiming(position === 'top' ? 6 : -6, { duration: DRIFT * 1.2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: driftX.value }, { translateY: driftY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.glow,
        {
          width: size,
          height: size,
          top: position === 'top' ? -size * 0.35 : undefined,
          bottom: position === 'bottom' ? -size * 0.3 : undefined,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', `${color}1A`, 'transparent']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function AmbientBackground({ tone = 'cyan', intensity = 0.04 }: Props) {
  const color = TONE_COLOR[tone];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <AmbientGlow color={color} baseOpacity={intensity} size={260} position="top" />
      <AmbientGlow color={TONE_COLOR[tone === 'cyan' ? 'blue' : tone]} baseOpacity={intensity * 0.6} size={200} position="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
});
