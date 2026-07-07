import { Platform } from 'react-native';

export const colors = {
  bgDeep: '#050505',
  bgPrimary: '#0A0A0A',
  bgSurface: '#0F0F0F',
  bgCard: '#141414',
  onSurface: '#FFFFFF',
  onSurfaceSecondary: 'rgba(255,255,255,0.7)',
  onSurfaceMuted: 'rgba(255,255,255,0.4)',
  onSurfaceDim: 'rgba(255,255,255,0.2)',
  primary: '#00F2FF',
  secondary: '#BC8CFF',
  tertiary: '#3FB950',
  error: '#FF453A',
  warning: '#FF9F0A',
  glassBg: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.1)',
  glassBlur: 40,
  glowCyan: 'rgba(0,242,255,0.2)',
  glowPurple: 'rgba(188,140,255,0.2)',
  glowSpread: 40,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 24,
  xl: 48,
  xxl: 80,
};

export const radius = {
  card: 24,
  button: 9999,
  modal: 32,
  input: 24,
};

export const typography = {
  displayLg: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -0.04,
  },
  headlineLg: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.02,
  },
  headlineMd: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  bodyMd: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  labelMd: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.05,
    textTransform: 'uppercase' as const,
  },
  labelSm: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
};
