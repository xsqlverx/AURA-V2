import { Easing as RNEasing } from 'react-native-reanimated';

export const Easing = {
  default: RNEasing.inOut(RNEasing.ease),
  in: RNEasing.in(RNEasing.ease),
  out: RNEasing.out(RNEasing.ease),
  spring: RNEasing.inOut(RNEasing.ease),
  smooth: RNEasing.bezier(0.16, 1, 0.3, 1),
} as const;
