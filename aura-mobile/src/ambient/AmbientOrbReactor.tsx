import { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import type { AmbientOrbReaction } from './types';
import { colors } from '../theme';
import { zIndex } from '../tokens/zindex';

type Props = {
  reaction: AmbientOrbReaction | null;
  size: number;
  children: React.ReactNode;
};

export function AmbientOrbReactor({ reaction, size, children }: Props) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const prevReaction = useRef<AmbientOrbReaction | null>(null);

  const reactionKey = reaction ? `${reaction.color}-${reaction.effect}-${reaction.duration}` : null;

  useEffect(() => {
    if (!reaction) return;
    if (prevReaction.current === reaction) return;
    prevReaction.current = reaction;

    pulseAnim.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0,
        duration: Math.max(reaction.duration - 150, 100),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reactionKey]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, reaction?.effect === 'contraction' ? 0.85 : 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 0],
  });

  return (
    <View style={styles.wrapper}>
      {children}
      {reaction ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size * 0.75,
              backgroundColor: reaction.color,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    zIndex: zIndex.overlay,
  },
});
