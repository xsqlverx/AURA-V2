import { withTiming, withSpring, withSequence, FadeIn, FadeOut, SlideInDown, SlideOutDown, SlideInUp, SlideOutUp, ZoomIn, ZoomOut, LightSpeedInRight, LightSpeedOutLeft, BounceIn, BounceOut } from 'react-native-reanimated';
import { duration as dur } from '../tokens/animation';

export const entering = {
  fade: FadeIn.duration(dur.slow),
  fadeQuick: FadeIn.duration(dur.normal),
  slideUp: SlideInDown.duration(dur.slow).springify(),
  slideDown: SlideInUp.duration(dur.slow).springify(),
  zoom: ZoomIn.duration(dur.slow).springify(),
  bounce: BounceIn.duration(dur.deliberate),
  lightSpeed: LightSpeedInRight.duration(dur.deliberate),
} as const;

export const exiting = {
  fade: FadeOut.duration(dur.normal),
  fadeQuick: FadeOut.duration(dur.quick),
  slideDown: SlideOutDown.duration(dur.normal),
  slideUp: SlideOutUp.duration(dur.normal),
  zoom: ZoomOut.duration(dur.normal),
  bounce: BounceOut.duration(dur.slow),
  lightSpeed: LightSpeedOutLeft.duration(dur.normal),
} as const;

export const pressAnimation = {
  scaleIn: 0.94,
  scaleInCard: 0.98,
  opacityIn: 0.85,
} as const;
