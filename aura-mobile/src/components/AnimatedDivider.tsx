import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { glass } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { duration } from '../tokens/animation';

type Props = {
  marginVertical?: number;
};

export default function AnimatedDivider({ marginVertical = spacing.space16 }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={[styles.divider, { marginVertical }]} />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: glass.border,
  },
});
