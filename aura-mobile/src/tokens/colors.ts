export const palette = {
  black: '#030508',
  nearBlack: '#070A0F',
  surface: '#0B1017',
  card: '#111821',
  cyan: '#00E5F2',
  cyanBright: '#00F2FF',
  cyanGlow: '#52F7FF',
  purple: '#B88CFF',
  blue: '#628CFF',
  green: '#35E69A',
  greenBright: '#5AFFB3',
  amber: '#FFB84D',
  amberBright: '#FFD080',
  red: '#FF5A61',
  redBright: '#FF7C82',
  info: '#63B8FF',
  white: '#F2F6FA',
  whiteMuted: '#A6B1BC',
  whiteDim: '#687583',
  whiteFaint: '#414B56',
} as const;

export const glass = {
  bg: 'rgba(255,255,255,0.045)',
  bgHover: 'rgba(255,255,255,0.065)',
  bgActive: 'rgba(255,255,255,0.085)',
  glass0: 'rgba(255,255,255,0.025)',
  glass1: 'rgba(255,255,255,0.045)',
  glass2: 'rgba(255,255,255,0.065)',
  glass3: 'rgba(255,255,255,0.085)',
  border: 'rgba(255,255,255,0.095)',
  borderStrong: 'rgba(255,255,255,0.145)',
  highlight: 'rgba(255,255,255,0.12)',
} as const;

export const glow = {
  subtle: 'rgba(0,229,242,0.04)',
  active: 'rgba(0,229,242,0.12)',
  speaking: 'rgba(0,229,242,0.32)',
  memory: 'rgba(184,140,255,0.08)',
  cyan04: 'rgba(0,229,242,0.04)',
  cyan08: 'rgba(0,229,242,0.08)',
  cyan12: 'rgba(0,229,242,0.12)',
  cyan20: 'rgba(0,229,242,0.20)',
  cyan32: 'rgba(0,229,242,0.32)',
  purple08: 'rgba(184,140,255,0.08)',
  purple16: 'rgba(184,140,255,0.16)',
  purple28: 'rgba(184,140,255,0.28)',
  error16: 'rgba(255,90,97,0.16)',
  success16: 'rgba(53,230,154,0.16)',
} as const;

export const semantic = {
  success: '#35E69A',
  successBright: '#5AFFB3',
  warning: '#FFB84D',
  warningBright: '#FFD080',
  error: '#FF5A61',
  errorBright: '#FF7C82',
  info: '#63B8FF',
} as const;

export const text = {
  primary: '#F2F6FA',
  secondary: '#A6B1BC',
  tertiary: '#687583',
  disabled: '#414B56',
  inverse: '#020508',
} as const;

export const orb = {
  disconnected: { color1: '#3A1A1A', color2: '#6B1F1F' },
  idle: { color1: '#00E5F2', color2: '#628CFF' },
  listening: { color1: '#35E69A', color2: '#00E5F2' },
  thinking: { color1: '#FFB84D', color2: '#B88CFF' },
  speaking: { color1: '#00F2FF', color2: '#B88CFF' },
  searching: { color1: '#628CFF', color2: '#00E5F2' },
  executing: { color1: '#B88CFF', color2: '#00E5F2' },
  success: { color1: '#35E69A', color2: '#00E5F2' },
  error: { color1: '#FF5A61', color2: '#FFB84D' },
  flow: { color1: '#B88CFF', color2: '#00F2FF' },
} as const;

export const backgrounds = {
  deep: palette.black,
  primary: palette.nearBlack,
  surface: palette.surface,
  card: palette.card,
} as const;

export const accent = {
  cyan: palette.cyan,
  cyanBright: palette.cyanBright,
  cyanGlow: palette.cyanGlow,
  purple: palette.purple,
  blue: palette.blue,
} as const;
