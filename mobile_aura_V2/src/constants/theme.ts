export const Theme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
    orb: 32,
  },

  typography: {
    titleLarge: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 26,
      letterSpacing: 2,
      fontWeight: '700' as const,
    },
    titleMedium: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 18,
      letterSpacing: 1.5,
      fontWeight: '700' as const,
    },
    titleSmall: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 14,
      letterSpacing: 1,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    bodyBold: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600' as const,
    },
    mono: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 11,
      letterSpacing: 0.5,
      fontWeight: '400' as const,
    },
    monoBold: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 11,
      letterSpacing: 0.5,
      fontWeight: '700' as const,
    },
    wordmark: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 15,
      letterSpacing: 4,
      fontWeight: '700' as const,
    },
    hud: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 10,
      letterSpacing: 1.2,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
    hudMicro: {
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 8,
      letterSpacing: 1,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
  },

  animation: {
    spring: {
      damping: 16,
      stiffness: 180,
      mass: 0.9,
    },
    springSnappy: {
      damping: 14,
      stiffness: 240,
      mass: 0.7,
    },
    orbSpring: {
      damping: 20,
      stiffness: 140,
      mass: 1.1,
    },
    fade: {
      duration: 250,
    },
  },

  orb: {
    sizeSmall: 48,
    size: 90,
    sizeLarge: 140,
  },
} as const;
