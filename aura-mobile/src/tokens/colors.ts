export const palette = {
  black: '#050505',
  nearBlack: '#0A0A0A',
  surface: '#0F0F0F',
  card: '#141414',
  cyan: '#00F2FF',
  purple: '#BC8CFF',
  green: '#3FB950',
  amber: '#FF9F0A',
  red: '#FF453A',
  white: 'rgba(255,255,255,0.85)',
  whiteMuted: 'rgba(255,255,255,0.55)',
  whiteDim: 'rgba(255,255,255,0.30)',
  whiteFaint: 'rgba(255,255,255,0.12)',
} as const;

export const glass = {
  bg: 'rgba(255,255,255,0.04)',
  bgHover: 'rgba(255,255,255,0.07)',
  bgActive: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
} as const;

export const glow = {
  subtle: 'rgba(0,242,255,0.06)',
  active: 'rgba(0,242,255,0.15)',
  speaking: 'rgba(0,242,255,0.30)',
  memory: 'rgba(188,140,255,0.12)',
} as const;

export const semantic = {
  success: palette.green,
  error: palette.red,
  warning: palette.amber,
  info: palette.cyan,
} as const;

export const orb = {
  disconnected: { color1: '#3A1A1A', color2: '#6B1F1F' },
  idle: { color1: '#0A1A2A', color2: '#0F2A4A' },
  listening: { color1: '#0A2A3A', color2: '#005F7F' },
  thinking: { color1: '#1A0A3A', color2: '#5A3FBF' },
  speaking: { color1: '#005F7F', color2: '#00F2FF' },
  searching: { color1: '#0A2A2A', color2: '#007F6F' },
  executing: { color1: '#0A2A3A', color2: '#00F2FF' },
} as const;

export const backgrounds = {
  deep: palette.black,
  primary: palette.nearBlack,
  surface: palette.surface,
  card: palette.card,
} as const;

export const accent = {
  cyan: palette.cyan,
  purple: palette.purple,
} as const;

export const text = {
  primary: 'rgba(255,255,255,0.85)',
  secondary: 'rgba(255,255,255,0.55)',
  tertiary: 'rgba(255,255,255,0.30)',
  disabled: 'rgba(255,255,255,0.12)',
  inverse: palette.black,
} as const;
