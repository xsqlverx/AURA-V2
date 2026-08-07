export const duration = {
  instant: 50,
  fast: 100,
  quick: 150,
  normal: 200,
  slow: 300,
  deliberate: 400,
  modal: 450,
  page: 350,
  toastIn: 400,
  toastHold: 3000,
  toastOut: 300,
  skeleton: 1500,
} as const;

export const spring = {
  default: { damping: 15, stiffness: 150, mass: 1 },
  gentle: { damping: 20, stiffness: 100, mass: 1 },
  snappy: { damping: 12, stiffness: 200, mass: 1 },
  toggle: { damping: 12, stiffness: 100, mass: 1 },
  sheet: { damping: 20, stiffness: 180, mass: 1 },
} as const;

export const easing = {
  default: [0.16, 1, 0.3, 1] as const,
} as const;

export const stagger = {
  fast: 30,
  normal: 40,
  slow: 60,
} as const;

export const orbDuration = {
  disconnected: 2500,
  idle: 1500,
  listening: 1000,
  thinking: 600,
  speaking: 400,
  searching: 1200,
  executing: 800,
} as const;

export const orbSpread = {
  disconnected: 0.3,
  idle: 0.4,
  listening: 0.6,
  thinking: 0.8,
  speaking: 1.0,
  searching: 0.5,
  executing: 0.8,
} as const;
