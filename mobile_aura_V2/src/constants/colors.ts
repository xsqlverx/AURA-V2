export const Colors = {
  // Base theme - Deep Obsidian & Nebula
  background: '#08080C',
  backgroundNebula: '#0D0A14',
  surface: '#111018',
  surfaceElevated: '#181622',
  surfaceGlass: 'rgba(24, 22, 34, 0.75)',
  surfaceBorder: 'rgba(106, 83, 153, 0.22)',
  surfaceBorderGlow: 'rgba(0, 240, 255, 0.35)',
  surfaceBorderPurple: 'rgba(106, 83, 153, 0.5)',

  // Signature Purple - #6A5399 (AURA Core Identity)
  purple: {
    primary: '#6A5399',
    light: '#8E73C7',
    vibrant: '#9D65FF',
    soft: '#BCA7E8',
    dim: '#4A386D',
    dark: '#2E2247',
    glow: 'rgba(106, 83, 153, 0.35)',
    glowStrong: 'rgba(157, 101, 255, 0.5)',
  },

  // Electric Cyan - Energy & Telemetry Accents
  cyan: {
    primary: '#00f0ff',
    bright: '#5df6ff',
    dim: '#008b94',
    dark: '#003a3e',
    glow: 'rgba(0, 240, 255, 0.25)',
    glowStrong: 'rgba(0, 240, 255, 0.5)',
  },

  // Cyber Gold - Status, Alerts & Highlights
  gold: {
    primary: '#FFD700',
    bright: '#FFE55C',
    dim: '#B39700',
    glow: 'rgba(255, 215, 0, 0.25)',
  },

  // Status & Vitals
  green: {
    primary: '#10b981',
    bright: '#34d399',
    dim: '#059669',
    glow: 'rgba(16, 185, 129, 0.25)',
  },

  amber: {
    primary: '#f59e0b',
    bright: '#fbbf24',
    dim: '#d97706',
    glow: 'rgba(245, 158, 11, 0.25)',
  },

  red: {
    primary: '#ef4444',
    bright: '#f87171',
    dim: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.25)',
  },

  // Typography Palette
  text: {
    primary: '#F0EDF8',
    secondary: '#9E98AF',
    dim: '#656077',
    cyan: '#00f0ff',
    purple: '#BCA7E8',
    gold: '#FFD700',
  },

  // Orb State Dynamic Palette
  orb: {
    idle: '#6A5399',
    listening: '#00f0ff',
    thinking: '#FFD700',
    speaking: '#9D65FF',
    searching: '#00f0ff',
    executing: '#FFD700',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    connecting: '#8E73C7',
    disconnected: '#656077',
    sleeping: '#4A386D',
    updating: '#5df6ff',
  },

  status: {
    connected: '#10b981',
    disconnected: '#656077',
    error: '#ef4444',
    warning: '#f59e0b',
  },
} as const;
