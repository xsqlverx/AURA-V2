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
  base: 14,
  lg: 16,
  xl: 17,
  xxl: 22,
  xxxl: 28,
  displayMd: 30,
  displayLg: 36,
  display: 48,
} as const;

export const lineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  tight: -0.03,
  normal: -0.02,
  wide: 0,
  wider: 0.04,
  uppercase: 0.08,
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: 52,
    letterSpacing: -0.03,
  },
  displayLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLg,
    lineHeight: 40,
    letterSpacing: -0.03,
  },
  displayMd: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayMd,
    lineHeight: 36,
    letterSpacing: -0.02,
  },
  heading1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    lineHeight: 34,
    letterSpacing: -0.02,
  },
  heading2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    lineHeight: 28,
    letterSpacing: -0.01,
  },
  heading3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    lineHeight: 22,
    letterSpacing: -0.01,
  },
  bodyLarge: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: 20,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    lineHeight: 18,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: 14,
    letterSpacing: 0.04,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    lineHeight: 12,
    letterSpacing: 0.08,
  },
  micro: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    lineHeight: 12,
    letterSpacing: 0.08,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  dataLarge: {
    fontFamily: fontFamily.mono,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.02,
  },
  data: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  dataSmall: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.02,
  },
} as const;
