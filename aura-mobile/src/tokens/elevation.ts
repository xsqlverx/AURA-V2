import { glass } from './colors';
import { glow } from './colors';

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ElevationConfig = {
  border: string;
  blur: number;
  glow: string | null;
};

export const elevation: Record<ElevationLevel, ElevationConfig> = {
  0: { border: 'transparent', blur: 0, glow: null },
  1: { border: glass.border, blur: 20, glow: null },
  2: { border: glass.borderStrong, blur: 40, glow: glow.subtle },
  3: { border: glass.borderStrong, blur: 40, glow: glow.active },
  4: { border: glass.borderStrong, blur: 60, glow: glow.active },
  5: { border: 'transparent', blur: 60, glow: null },
} as const;
