import { useMemo, useCallback, useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import OrbGlow from './OrbGlow';
import OrbCore from './OrbCore';
import OrbHalo from './OrbHalo';
import OrbParticles from './OrbParticles';
import { usePulseAnimation, useFloatAnimation, useRingStyles, useAnimatedOpacity, useSpeechEnvelope, useRingRotation } from './OrbAnimations';
import { getStateConfig } from './OrbStateMachine';
import { reducedMotion as reducedMotionToken } from '../../tokens/animation';
import { haptic } from '../../motion/haptics';
import type { OrbState, OrbSizeName } from './OrbTypes';
import { ORB_SIZES } from './OrbTypes';

type Props = {
  state?: OrbState;
  active?: boolean;
  orState?: OrbState;
  size?: OrbSizeName | number;
  intensity?: number;
  interactive?: boolean;
  reducedMotion?: boolean;
  lookOffsetX?: number;
  onTap?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
};

function getPixelSize(size: OrbSizeName | number): number {
  if (typeof size === 'number') return size;
  return ORB_SIZES[size] || ORB_SIZES.large;
}

export default function Orb({
  state,
  active = false,
  orState,
  size = 'large',
  intensity = 1,
  interactive = false,
  reducedMotion: forceReducedMotion,
  lookOffsetX = 0,
  onTap,
  onLongPress,
  accessibilityLabel,
}: Props) {
  const reduced = forceReducedMotion ?? reducedMotionToken.enable;

  const effectiveState: OrbState = useMemo(() => {
    if (state) return state;
    if (orState) return orState;
    return active ? 'thinking' : 'idle';
  }, [state, orState, active]);

  const pixelSize = getPixelSize(size);
  const config = getStateConfig(effectiveState);

  const scaledConfig = useMemo(() => ({
    ...config,
    glowIntensity: config.glowIntensity * intensity,
    pulseSpread: config.pulseSpread * (0.5 + intensity * 0.5),
    floatAmplitude: config.floatAmplitude * intensity,
  }), [config, intensity]);

  const { pulse } = usePulseAnimation(scaledConfig, effectiveState, reduced);
  const speech = useSpeechEnvelope(effectiveState === 'speaking' && !reduced);
  const { floatStyle } = useFloatAnimation(scaledConfig.floatAmplitude, scaledConfig.floatDuration, reduced);

  const ringStyles = [
    useRingStyles(pulse, speech, scaledConfig, 0),
    useRingStyles(pulse, speech, scaledConfig, 1),
  ];
  const ringSizes = [1.18, 1.55];
  const { opacityStyle: ringsOpacityStyle } = useAnimatedOpacity(scaledConfig.ringsVisible > 0, 300);
  const { ringRotationStyle } = useRingRotation(scaledConfig.ringsRotateMs, reduced);

  const tapScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    tapScale.value = withSpring(0.94, { damping: 15, stiffness: 150 });
    if (interactive) haptic.press();
  }, [interactive]);

  const handlePressOut = useCallback(() => {
    tapScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const handlePress = useCallback(() => {
    onTap?.();
  }, [onTap]);

  const handleLongPress = useCallback(() => {
    tapScale.value = withTiming(1.05, { duration: 200, easing: Easing.inOut(Easing.ease) }, (finished) => {
      if (finished) {
        tapScale.value = withTiming(1, { duration: 300 });
        if (onLongPress) runOnJS(haptic.longPress)();
        if (onLongPress) runOnJS(onLongPress)();
      }
    });
  }, [onLongPress]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }, { translateX: lookOffsetX }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={interactive ? handlePressIn : undefined}
      onPressOut={interactive ? handlePressOut : undefined}
      disabled={!interactive}
      accessibilityLabel={accessibilityLabel || `AURA is ${effectiveState}`}
      accessibilityRole="image"
      accessibilityState={{ busy: ['thinking', 'searching', 'executing', 'listening'].includes(effectiveState) }}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.container,
          { width: pixelSize, height: pixelSize },
          floatStyle,
          containerStyle,
        ]}
      >
        {/* State halo (ambient, outermost) */}
        <OrbHalo size={pixelSize} config={scaledConfig} pulse={pulse} speech={speech} reduced={reduced} />

        {/* Glow (light field) */}
        <OrbGlow size={pixelSize} glowColor={scaledConfig.glowColor} intensity={scaledConfig.glowIntensity} pulse={pulse} speech={speech} speechDriven={scaledConfig.speechDriven} />

        {/* Rings (primary, secondary) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.ringsWrapper, ringsOpacityStyle, ringRotationStyle]} pointerEvents="none">
          {scaledConfig.ringsVisible >= 2 && (
            <Animated.View
              style={[
                styles.ring,
                {
                  width: pixelSize * ringSizes[1],
                  height: pixelSize * ringSizes[1],
                  borderRadius: (pixelSize * ringSizes[1]) / 2,
                },
                ringStyles[1],
              ]}
            />
          )}
          {scaledConfig.ringsVisible >= 1 && (
            <Animated.View
              style={[
                styles.ring,
                {
                  width: pixelSize * ringSizes[0],
                  height: pixelSize * ringSizes[0],
                  borderRadius: (pixelSize * ringSizes[0]) / 2,
                },
                ringStyles[0],
              ]}
            />
          )}
        </Animated.View>

        {/* Particles (sparse) */}
        <OrbParticles size={pixelSize} config={scaledConfig} reduced={reduced} />

        {/* Core (center) */}
        <OrbCore size={pixelSize} config={scaledConfig} pulse={pulse} speech={speech} state={effectiveState} reduced={reduced} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'solid',
  },
});
