import type { ViewStyle } from 'react-native';

export type ElevationLevel = 0 | 1 | 2 | 3;

export type ElevationConfig = {
  border: string;
  blur: number;
  shadow: { offsetY: number; blur: number; opacity: number } | null;
  glow: string | null;
};

export const elevation: Record<ElevationLevel, ElevationConfig> = {
  0: { border: 'rgba(255,255,255,0.075)', blur: 0, shadow: null, glow: null },
  1: {
    border: 'rgba(255,255,255,0.095)',
    blur: 18,
    shadow: { offsetY: 4, blur: 16, opacity: 0.18 },
    glow: null,
  },
  2: {
    border: 'rgba(255,255,255,0.145)',
    blur: 35,
    shadow: { offsetY: 8, blur: 24, opacity: 0.24 },
    glow: null,
  },
  3: {
    border: 'rgba(255,255,255,0.145)',
    blur: 55,
    shadow: { offsetY: 16, blur: 40, opacity: 0.32 },
    glow: null,
  },
};

export function elevationShadow(level: ElevationLevel): ViewStyle | undefined {
  const shadow = elevation[level].shadow;
  if (!shadow) return undefined;
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: shadow.offsetY },
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.blur,
    elevation: level * 2,
  };
}
