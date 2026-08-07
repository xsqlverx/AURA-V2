import { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  palette, glass, glow as glowColors, semantic, orb as orbColors,
  backgrounds, accent, text,
} from '../tokens/colors';
import { typography, fontFamily, fontWeight } from '../tokens/typography';
import { spacing, iconSize } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { duration, spring, easing, stagger, orbDuration, orbSpread } from '../tokens/animation';
import { elevation } from '../tokens/elevation';
import { opacity } from '../tokens/opacity';
import { zIndex } from '../tokens/zindex';
import { blurIntensity } from '../tokens/blur';

export type Theme = {
  mode: 'dark';
  colors: {
    palette: typeof palette;
    glass: typeof glass;
    glow: typeof glowColors;
    semantic: typeof semantic;
    orb: typeof orbColors;
    backgrounds: typeof backgrounds;
    accent: typeof accent;
    text: typeof text;
  };
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  fontWeight: typeof fontWeight;
  spacing: typeof spacing;
  iconSize: typeof iconSize;
  radius: typeof radius;
  animation: {
    duration: typeof duration;
    spring: typeof spring;
    easing: typeof easing;
    stagger: typeof stagger;
    orbDuration: typeof orbDuration;
    orbSpread: typeof orbSpread;
  };
  elevation: typeof elevation;
  opacity: typeof opacity;
  zIndex: typeof zIndex;
  blurIntensity: typeof blurIntensity;
};

const DarkTheme: Theme = {
  mode: 'dark',
  colors: { palette, glass, glow: glowColors, semantic, orb: orbColors, backgrounds, accent, text },
  typography,
  fontFamily,
  fontWeight,
  spacing,
  iconSize,
  radius,
  animation: { duration, spring, easing, stagger, orbDuration, orbSpread },
  elevation,
  opacity,
  zIndex,
  blurIntensity,
};

const ThemeContext = createContext<Theme>(DarkTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={DarkTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
