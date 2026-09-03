import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface OrbRingsProps {
  count: number;
  color: string;
  size: number;
  speed: number;
}

function SingleRing({
  ring,
  color,
  ringSize,
}: {
  ring: { rotation: any; opacity: any };
  color: string;
  ringSize: number;
}) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: ringSize,
    height: ringSize,
    borderRadius: ringSize / 2,
    borderWidth: 1,
    borderColor: color,
    opacity: ring.opacity.value,
    transform: [{ rotate: `${ring.rotation.value}deg` }],
    top: '50%',
    left: '50%',
    marginTop: -ringSize / 2,
    marginLeft: -ringSize / 2,
  }));

  return <Animated.View style={style} />;
}

export function OrbRings({ count, color, size, speed }: OrbRingsProps) {
  const rings: { rotation: any; opacity: any }[] = [];

  for (let i = 0; i < count; i++) {
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
      const ringSpeed = speed * (1 + i * 0.3);
      const ringOpacity = 0.2 + i * 0.1;

      opacity.value = withTiming(ringOpacity, { duration: 400 });

      rotation.value = withRepeat(
        withTiming(360, {
          duration: ringSpeed,
        }),
        -1, false
      );
    }, [count, speed, i]);

    rings.push({ rotation, opacity });
  }

  if (count === 0) return null;

  return (
    <View style={styles.container}>
      {rings.map((ring, i) => (
        <SingleRing
          key={i}
          ring={ring}
          color={color}
          ringSize={size * (1.3 + i * 0.25)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
