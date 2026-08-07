import { Platform } from 'react-native';
import { palette, glass, text, backgrounds, semantic, accent, glow } from './tokens/colors';
import { spacing as spaceTokens } from './tokens/spacing';
import { radius as radiusTokens } from './tokens/radius';
import { typography as typeTokens, fontFamily } from './tokens/typography';

// ── Backward-compatible re-exports ─────────────────────────────────────────
// Every existing import from '../src/theme' continues to work.
// New code should import from '../src/tokens' or use useTheme().

export const colors = {
  bgDeep: backgrounds.deep,
  bgPrimary: backgrounds.primary,
  bgSurface: backgrounds.surface,
  bgCard: backgrounds.card,
  onSurface: text.primary,
  onSurfaceSecondary: text.secondary,
  onSurfaceMuted: text.tertiary,
  onSurfaceDim: text.disabled,
  primary: accent.cyan,
  secondary: accent.purple,
  tertiary: semantic.success,
  error: semantic.error,
  warning: semantic.warning,
  glassBg: glass.bg,
  glassBorder: glass.border,
  glassBlur: 40,
  glowCyan: glow.subtle,
  glowPurple: glow.memory,
  glowSpread: 40,
};

export const spacing = {
  xs: spaceTokens.space4,
  sm: spaceTokens.space8,
  md: spaceTokens.space12,
  lg: spaceTokens.space24,
  xl: spaceTokens.space48,
  xxl: spaceTokens.space80,
};

export const radius = {
  card: radiusTokens.lg,
  button: radiusTokens.full,
  modal: radiusTokens.xl,
  input: radiusTokens.md,
};

export const typography = {
  displayLg: typeTokens.display,
  headlineLg: typeTokens.heading1,
  headlineMd: typeTokens.heading2,
  bodyMd: typeTokens.body,
  labelMd: {
    ...typeTokens.label,
    fontFamily: fontFamily.medium,
  },
  labelSm: typeTokens.caption,
  mono: typeTokens.mono,
};
