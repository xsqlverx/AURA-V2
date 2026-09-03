export const Colors = {
  background: '#0a0a0f',
  surface: '#111118',
  surfaceElevated: '#1a1a24',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  surfaceBorderGlow: 'rgba(0, 240, 255, 0.12)',

  cyan: {
    primary: '#00f0ff',
    dim: '#00a0aa',
    glow: 'rgba(0, 240, 255, 0.15)',
    glowStrong: 'rgba(0, 240, 255, 0.3)',
  },

  purple: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    dim: '#6d28d9',
    glow: 'rgba(139, 92, 246, 0.15)',
  },

  green: {
    primary: '#10b981',
    dim: '#059669',
  },

  amber: {
    primary: '#f59e0b',
    dim: '#d97706',
  },

  red: {
    primary: '#ef4444',
    dim: '#dc2626',
  },

  text: {
    primary: '#e2e8f0',
    secondary: '#64748b',
    dim: '#475569',
  },

  orb: {
    idle: '#00f0ff',
    listening: '#10b981',
    thinking: '#f59e0b',
    speaking: '#8b5cf6',
  },

  status: {
    connected: '#10b981',
    disconnected: '#334155',
    error: '#ef4444',
  },
} as const;
