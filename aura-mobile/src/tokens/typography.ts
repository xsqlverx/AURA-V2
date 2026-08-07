import { Platform } from 'react-native';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 13,
  base: 15,
  lg: 16,
  xl: 20,
  xxl: 28,
  display: 48,
} as const;

export const lineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  tight: -0.04,
  normal: -0.02,
  wide: 0,
  wider: 0.02,
  uppercase: 0.08,
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: 52,
    letterSpacing: letterSpacing.tight,
  },
  heading1: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xxl,
    lineHeight: 34,
    letterSpacing: letterSpacing.normal,
  },
  heading2: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: 26,
    letterSpacing: letterSpacing.wide,
  },
  heading3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: 22,
    letterSpacing: letterSpacing.wide,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: 22,
    letterSpacing: letterSpacing.wide,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 18,
    letterSpacing: letterSpacing.wide,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: 14,
    letterSpacing: letterSpacing.wider,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: 12,
    letterSpacing: letterSpacing.uppercase,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: letterSpacing.wide,
  },
} as const;
