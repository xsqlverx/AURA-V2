export const Theme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    pill: 999,
    orb: 26,
  },

  typography: {
    body: {
      fontSize: 15,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    mono: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 11,
      letterSpacing: 0.5,
      fontWeight: '400' as const,
    },
    placeholder: {
      fontSize: 15,
      fontStyle: 'italic' as const,
    },
    wordmark: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 14,
      letterSpacing: 3,
      fontWeight: '600' as const,
    },
    hud: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 10,
      letterSpacing: 1,
      fontWeight: '400' as const,
      textTransform: 'uppercase' as const,
    },
  },

  animation: {
    spring: {
      damping: 18,
      stiffness: 200,
      mass: 0.8,
    },
    orbSpring: {
      damping: 22,
      stiffness: 150,
      mass: 1.2,
    },
    fade: {
      duration: 300,
    },
  },

  orb: {
    size: 80,
  },
} as const;
