import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface OrbParticlesProps {
  count?: number;
  size: number;
  color: string;
  speed: number;
  mode: 'orbit' | 'drift' | 'converge' | 'pulse' | 'none';
}

interface SwarmNode {
  angle: number;
  radius: number;
  speedMultiplier: number;
  size: number;
  tilt: number;
  color: string;
}

function ParticleNode({
  node,
  center,
  baseSpeed,
  stateColor,
}: {
  node: SwarmNode;
  center: number;
  baseSpeed: number;
  stateColor: string;
}) {
  const rotation = useSharedValue(node.angle);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const duration = Math.max(1200, baseSpeed * node.speedMultiplier);
    rotation.value = withRepeat(
      withTiming(node.angle + Math.PI * 2, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: duration * 0.5 }),
        withTiming(0.8, { duration: duration * 0.5 })
      ),
      -1,
      true
    );
  }, [baseSpeed, node]);

  const style = useAnimatedStyle(() => {
    const cosAngle = Math.cos(rotation.value);
    const sinAngle = Math.sin(rotation.value);

    // 3D Orbital Projection Math
    const x = center + cosAngle * node.radius;
    const y = center + sinAngle * node.radius * Math.cos(node.tilt);
    const zDepth = sinAngle * Math.sin(node.tilt); // Depth factor (-1 to +1)

    // Depth-based scaling & opacity
    const depthScale = 0.65 + 0.45 * zDepth;
    const depthOpacity = 0.25 + 0.7 * ((zDepth + 1) / 2);

    return {
      position: 'absolute',
      left: x - node.size / 2,
      top: y - node.size / 2,
      width: node.size,
      height: node.size,
      borderRadius: node.size / 2,
      backgroundColor: node.color || stateColor,
      opacity: depthOpacity,
      transform: [{ scale: depthScale * pulse.value }],
      shadowColor: stateColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
    };
  });

  return <Animated.View style={style} />;
}

export function OrbParticles({ size, color, speed, count = 24, mode }: OrbParticlesProps) {
  const center = size / 2;

  // Generate 3D Swarm nodes in orbital rings
  const nodes: SwarmNode[] = React.useMemo(() => {
    const items: SwarmNode[] = [];
    const colors = [
      Colors.purple.vibrant,
      Colors.cyan.bright,
      Colors.cyan.primary,
      Colors.purple.light,
      '#FFFFFF',
      Colors.gold.bright,
    ];

    for (let i = 0; i < count; i++) {
      const ringIndex = i % 3; // 3 distinct orbital shells
      const shellRadius = size * (0.2 + ringIndex * 0.18);
      const angle = (i / count) * Math.PI * 2 + (ringIndex * Math.PI) / 4;
      const tilt = (ringIndex * Math.PI) / 3 - Math.PI / 6; // Inclination angle

      items.push({
        angle,
        radius: shellRadius,
        speedMultiplier: 0.7 + (i % 4) * 0.25,
        size: i % 5 === 0 ? 5 : i % 2 === 0 ? 3.5 : 2.5,
        tilt,
        color: colors[i % colors.length],
      });
    }
    return items;
  }, [size, count]);

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {nodes.map((node, idx) => (
        <ParticleNode
          key={idx}
          node={node}
          center={center}
          baseSpeed={speed || 4000}
          stateColor={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
