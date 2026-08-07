import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  cancelAnimation,
  Easing,
  interpolateColor,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import type { StateConfig, OrbState } from './OrbTypes';
import { getTransitionDuration } from './OrbStateMachine';

const EASE = Easing.inOut(Easing.ease);

// ── Pulse ─────────────────────────────────────────────────────────────────

export function usePulseAnimation(
  config: StateConfig,
  state: OrbState
): { pulse: SharedValue<number> } {
  const pulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse);
    const halfDur = config.pulseDuration / 2;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: halfDur, easing: EASE }),
        withTiming(0, { duration: halfDur, easing: EASE })
      ),
      -1,
      false
    );
  }, [state, config.pulseDuration, config.pulseSpread]);

  return { pulse };
}

// ── Micro-Float ────────────────────────────────────────────────────────────

export function useFloatAnimation(amplitude: number, speed: number) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (amplitude < 0.5) {
      x.value = withTiming(0);
      y.value = withTiming(0);
      return;
    }
    const dur = 4000 / Math.max(speed, 0.1);
    x.value = withRepeat(
      withSequence(
        withTiming(amplitude, { duration: dur, easing: EASE }),
        withTiming(-amplitude, { duration: dur, easing: EASE })
      ),
      -1,
      true
    );
    y.value = withRepeat(
      withSequence(
        withTiming(-amplitude * 0.6, { duration: dur * 1.2, easing: EASE }),
        withTiming(amplitude * 0.6, { duration: dur * 1.2, easing: EASE })
      ),
      -1,
      true
    );
  }, [amplitude, speed]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return { floatStyle: style };
}

// ── State-Aware Color ──────────────────────────────────────────────────────

export function useOrbColors(
  config: StateConfig,
  pulse: SharedValue<number>
) {
  const color1 = useSharedValue(config.coreColor1);
  const color2 = useSharedValue(config.coreColor2);

  useEffect(() => {
    const dur = getTransitionDuration('idle', 'idle');
    color1.value = withTiming(config.coreColor1, { duration: dur, easing: EASE });
    color2.value = withTiming(config.coreColor2, { duration: dur, easing: EASE });
  }, [config.coreColor1, config.coreColor2]);

  const coreColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pulse.value,
      [0, 1],
      [color1.value, color2.value]
    ),
  }));

  return { coreColorStyle };
}

// ── Shared Values Manager ──────────────────────────────────────────────────

export function useTransitionValue(
  initial: number,
  target: number,
  deps: any[],
  durationOverride?: number
) {
  const val = useSharedValue(initial);

  useEffect(() => {
    const dur = durationOverride ?? 300;
    val.value = withTiming(target, { duration: dur, easing: EASE });
  }, deps);

  return val;
}

export function useAnimatedOpacity(active: boolean, durationMs = 300) {
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0, { duration: durationMs, easing: EASE });
  }, [active]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return { opacityStyle: style };
}

// ── Halo Rotation ──────────────────────────────────────────────────────────

export function useHaloRotation(speed: number, visible: boolean) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!visible || speed <= 0) {
      rotation.value = withTiming(0);
      return;
    }
    const dur = 6000 / speed;
    rotation.value = withRepeat(
      withTiming(360, { duration: dur, easing: Easing.linear }),
      -1,
      false
    );
  }, [speed, visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return { haloStyle: style };
}

// ── Ring Animation ─────────────────────────────────────────────────────────

export function useRingStyles(
  pulse: SharedValue<number>,
  config: StateConfig,
  ringIndex: number
) {
  const multiplier = 1 + ringIndex * 0.3;

  const style = useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.3 * config.pulseSpread * multiplier;
    const borderOpacity = interpolate(
      pulse.value,
      [0, 1],
      [config.ringsOpacity * 0.4, config.ringsOpacity]
    );
    return {
      transform: [{ scale }],
      borderColor: `rgba(0,242,255,${borderOpacity})`,
    };
  });

  return style;
}
