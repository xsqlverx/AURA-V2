export const duration = {
  instant: 100,
  fast: 160,
  quick: 200,
  normal: 220,
  standard: 220,
  slow: 320,
  expressive: 320,
  deliberate: 400,
  major: 450,
  modal: 450,
  page: 350,
  slowAmbient: 800,
  toastIn: 400,
  toastHold: 3000,
  toastOut: 300,
  skeleton: 1200,
} as const;

export const spring = {
  micro: { damping: 35, stiffness: 500, mass: 0.7 },
  default: { damping: 32, stiffness: 380, mass: 0.8 },
  gentle: { damping: 28, stiffness: 260, mass: 0.9 },
  snappy: { damping: 12, stiffness: 200, mass: 1 },
  toggle: { damping: 12, stiffness: 100, mass: 1 },
  sheet: { damping: 34, stiffness: 320, mass: 0.9 },
  expressive: { damping: 28, stiffness: 260, mass: 0.9 },
} as const;

export const easing = {
  default: [0.16, 1, 0.3, 1] as const,
} as const;

export const stagger = {
  initial: 40,
  fast: 32,
  normal: 40,
  slow: 60,
  maxTotal: 160,
  translateY: 10,
} as const;

export const orbTransition = {
  base: 320,
  interrupt: 180,
  major: 450,
} as const;

export const orbMotion = {
  idleCoreScale: { to: 1.02, from: 0.98, duration: 4200 },
  idleGlow: { to: 0.2, from: 0.12, duration: 4200 },
  idleDrift: 4,
  idleDriftDuration: 6000,
  idleParticles: { min: 6, max: 10, loopMin: 8000, loopMax: 14000 },
  listeningTransition: 350,
  listeningCoreScale: 1.08,
  listeningRingScale: 1.12,
  listeningRingOpacity: { from: 0.2, to: 0.45 },
  listeningPulse: 900,
  thinkingTransition: 280,
  thinkingCoreScale: { from: 1.0, to: 1.04 },
  thinkingRingRotation: { min: 18000, max: 24000 },
  thinkingSweep: 1800,
  thinkingParticleSpeed: 1.6,
  searchingSpeed: 1.3,
  executingTransition: 220,
  executingPulse: 700,
  errorPulse: 320,
  speechFps: 30,
  speechBase: 0.35,
  speechVariation: { min: 0.2, max: 0.6 },
  speechMicro: 0.08,
} as const;

export const reducedMotion = {
  maxDuration: 180,
  enable: false,
} as const;

export const orbDuration = {
  disconnected: 2500,
  idle: 4200,
  listening: 900,
  thinking: 1800,
  speaking: 0,
  searching: 1200,
  executing: 700,
  success: 800,
  error: 320,
  flow: 800,
} as const;

export const orbSpread = {
  disconnected: 0.3,
  idle: 0.02,
  listening: 0.6,
  thinking: 0.04,
  speaking: 1.0,
  searching: 0.5,
  executing: 0.8,
  success: 0.9,
  error: 0.08,
  flow: 0.8,
} as const;
