import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { accent } from '../../tokens/colors';
import type { ConversationPhase } from './types';

type Props = {
  phase: ConversationPhase;
};

function useBreath() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}

const PHASE_COLORS: Record<ConversationPhase, string> = {
  idle: 'rgba(0,242,255,0.03)',
  listening: `${accent.cyan}10`,
  processing: `${accent.cyan}08`,
  searching_desktop: `${accent.cyan}10`,
  searching_memory: `${accent.cyan}12`,
  executing_tool: `${accent.cyan}10`,
  generating: `${accent.cyan}08`,
  streaming: `${accent.cyan}05`,
  speaking: `${accent.cyan}06`,
  error: 'rgba(255,69,58,0.04)',
};

export default function ConversationAmbient({ phase }: Props) {
  const breathStyle = useBreath();

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ambient,
        { backgroundColor: PHASE_COLORS[phase] },
        phase === 'idle' && breathStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ambient: {
    ...StyleSheet.absoluteFill,
  },
});
