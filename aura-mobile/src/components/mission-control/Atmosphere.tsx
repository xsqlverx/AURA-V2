import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { palette } from '../../tokens/colors';

const SLOW = 6000;

export default function Atmosphere() {
  const mix = useSharedValue(0);

  useEffect(() => {
    mix.value = withRepeat(
      withTiming(1, { duration: SLOW, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const washStyle = useAnimatedStyle(() => ({
    opacity: 0.03 + mix.value * 0.04,
  }));

  return (
    <>
      <LinearGradient
        colors={['#030508', '#070A0F']}
        style={styles.base}
      />
      <Animated.View style={[StyleSheet.absoluteFill, washStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', `${palette.cyan}15`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFill,
  },
});
