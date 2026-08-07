import { palette, glass, glow, semantic, orb as orbColors, backgrounds, accent, text } from '../tokens/colors';
import { spacing as spaceTokens, iconSize } from '../tokens/spacing';
import { radius as radiusTokens } from '../tokens/radius';
import { blurIntensity } from '../tokens/blur';
import { zIndex } from '../tokens/zindex';
import { opacity } from '../tokens/opacity';

export { ThemeProvider, useTheme } from './ThemeContext';
export type { Theme } from './ThemeContext';

export const colors = {
  bgDeep: backgrounds.deep,
  bgPrimary: backgrounds.primary,
  bgSurface: backgrounds.surface,
  primary: accent.cyan,
  purple: accent.purple,
  onSurface: text.primary,
  onSurfaceMuted: text.secondary,
  glassBg: glass.bg,
  glassBgHover: glass.bgHover,
  glassBorder: glass.border,
  glassBorderStrong: glass.borderStrong,
  error: semantic.error,
  warning: semantic.warning,
  success: semantic.success,
  info: semantic.info,
};

export const spacing = {
  xxs: spaceTokens.space2,
  xs: spaceTokens.space4,
  sm: spaceTokens.space8,
  md: spaceTokens.space12,
  lg: spaceTokens.space16,
  xl: spaceTokens.space20,
  xxl: spaceTokens.space24,
  xxxl: spaceTokens.space32,
};

export const radius = {
  sm: radiusTokens.sm,
  md: radiusTokens.md,
  lg: radiusTokens.lg,
  xl: radiusTokens.xl,
  full: radiusTokens.full,
  card: radiusTokens.md,
  button: radiusTokens.md,
  input: radiusTokens.sm,
};
