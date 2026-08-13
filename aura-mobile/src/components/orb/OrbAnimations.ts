import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  interpolateColor,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import type { StateConfig, OrbState } from './OrbTypes';
import { getTransitionDuration } from './OrbStateMachine';
import { orbMotion, reducedMotion as reducedMotionToken } from '../../tokens/animation';

const EASE = Easing.inOut(Easing.ease);

function capDuration(ms: number, reduced: boolean): number {
  return reduced ? Math.min(ms, reducedMotionToken.maxDuration) : ms;
}

// ── Pulse ─────────────────────────────────────────────────────────────────
// One continuous loop per state. Error plays a single sharp pulse then settles.
// Speaking is driven by the speech envelope instead of a pulse.

export function usePulseAnimation(
  config: StateConfig,
  state: OrbState,
  reduced: boolean
): { pulse: SharedValue<number> } {
  const pulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse);
    if (state === 'speaking' || config.pulseDuration <= 0) {
      pulse.value = withTiming(0.5, { duration: capDuration(200, reduced) });
      return;
    }
    if (state === 'error') {
      pulse.value = withSequence(
        withTiming(1, { duration: capDuration(config.pulseDuration, reduced), easing: EASE }),
        withTiming(0, { duration: capDuration(config.pulseDuration, reduced), easing: EASE })
      );
      return;
    }
    const dur = reduced ? 0 : config.pulseDuration;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: EASE }),
        withTiming(0, { duration: dur, easing: EASE })
      ),
      -1,
      true
    );
  }, [state, config.pulseDuration]);

  return { pulse };
}

// ── Procedural speech envelope ─────────────────────────────────────────────
// 30fps low-frequency envelope. Amplitude maps to core scale, ring radius and
// glow intensity — never to color. Base 0.35, band 0.20–0.60, micro ±0.08.

export function useSpeechEnvelope(active: boolean): SharedValue<number> {
  const amplitude = useSharedValue<number>(orbMotion.speechBase);

  useEffect(() => {
    if (!active) {
      amplitude.value = withTiming(orbMotion.speechBase, { duration: 200 });
      return;
    }
    const frame = 1000 / orbMotion.speechFps;
    const [min, max] = [orbMotion.speechVariation.min, orbMotion.speechVariation.max];
    let current = orbMotion.speechBase;
    const id = setInterval(() => {
      const band = min + Math.random() * (max - min);
      const micro = (Math.random() - 0.5) * orbMotion.speechMicro * 2;
      const target = Math.min(max, Math.max(min, band + micro));
      current += (target - current) * 0.45;
      amplitude.value = current;
    }, frame);
    return () => {
      clearInterval(id);
      cancelAnimation(amplitude);
    };
  }, [active]);

  return amplitude;
}

// ── State-aware color interpolation ────────────────────────────────────────

export function useOrbColors(config: StateConfig, pulse: SharedValue<number>, state: OrbState, reduced: boolean) {
  const color1 = useSharedValue(config.coreColor1);
  const color2 = useSharedValue(config.coreColor2);
  const prevState = useRef<OrbState | null>(null);

  useEffect(() => {
    const from = prevState.current ?? state;
    const dur = capDuration(getTransitionDuration(from, state), reduced);
    prevState.current = state;
    color1.value = withTiming(config.coreColor1, { duration: dur, easing: EASE });
    color2.value = withTiming(config.coreColor2, { duration: dur, easing: EASE });
  }, [config.coreColor1, config.coreColor2, state]);

  const coreColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pulse.value, [0, 1], [color1.value, color2.value]),
  }));

  return { coreColorStyle };
}

// ── Vertical drift ─────────────────────────────────────────────────────────

export function useFloatAnimation(amplitude: number, durationMs: number, reduced: boolean) {
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduced || amplitude < 0.5) {
      y.value = withTiming(0, { duration: 150 });
      return;
    }
    const half = durationMs / 2;
    y.value = withRepeat(
      withSequence(
        withTiming(amplitude, { duration: half, easing: EASE }),
        withTiming(-amplitude, { duration: half, easing: EASE })
      ),
      -1,
      true
    );
  }, [amplitude, durationMs, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return { floatStyle: style };
}

// ── Ring rotation ──────────────────────────────────────────────────────────
// Slow rotation for thinking/searching traversal. 18–24s per revolution.

export function useRingRotation(rotateMs: number, reduced: boolean) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(rotation);
    if (reduced || rotateMs <= 0) {
      rotation.value = withTiming(0, { duration: 150 });
      return;
    }
    rotation.value = withRepeat(withTiming(360, { duration: rotateMs, easing: Easing.linear }), -1, false);
  }, [rotateMs, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return { ringRotationStyle: style };
}

export function useAnimatedOpacity(active: boolean, durationMs = 300) {
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0, { duration: durationMs, easing: EASE });
  }, [active]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return { opacityStyle: style };
}

// ── Ring animation ─────────────────────────────────────────────────────────

export function useRingStyles(
  pulse: SharedValue<number>,
  speech: SharedValue<number>,
  config: StateConfig,
  ringIndex: number
) {
  const multiplier = 1 + ringIndex * 0.32;

  const style = useAnimatedStyle(() => {
    let scale: number;
    let opacity: number;
    if (config.speechDriven) {
      const amp = interpolate(speech.value, [0.15, 0.6], [0.4, 1]);
      scale = 1 + amp * (config.ringScale - 1) * multiplier;
      opacity = interpolate(amp, [0.4, 1], [config.ringPulseOpacity.from, config.ringPulseOpacity.to]);
    } else {
      scale = 1 + pulse.value * (config.ringScale - 1) * multiplier;
      opacity = interpolate(
        pulse.value,
        [0, 1],
        [config.ringPulseOpacity.from, config.ringPulseOpacity.to]
      );
    }
    return {
      transform: [{ scale }],
      borderColor: config.ringsColor,
      opacity,
    };
  });

  return style;
}
