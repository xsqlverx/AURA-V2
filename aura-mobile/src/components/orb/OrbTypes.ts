export type OrbState =
  | 'disconnected'
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'memory_retrieval'
  | 'executing'
  | 'speaking'
  | 'success'
  | 'warning'
  | 'error'
  | 'updating'
  | 'sleeping';

export type OrbSizeName = 'small' | 'medium' | 'large' | 'xlarge';

export type ParticleType =
  | 'orbit'
  | 'converge'
  | 'scatter'
  | 'fragments'
  | 'hexagonal'
  | 'none';

export type StateConfig = {
  coreColor1: string;
  coreColor2: string;
  pulseDuration: number;
  pulseSpread: number;
  glowColor: string;
  glowIntensity: number;
  haloVisible: boolean;
  haloRotationSpeed: number;
  ringsVisible: number;
  ringsOpacity: number;
  ringsColor: string;
  particlesActive: boolean;
  particleType: ParticleType;
  particleCount: number;
  particleColor: string;
  ripplesActive: boolean;
  rippleCount: number;
  rippleSpeed: number;
  floatAmplitude: number;
  floatSpeed: number;
  breathingAmplitude: number;
};

export const ORB_SIZES: Record<OrbSizeName, number> = {
  small: 32,
  medium: 48,
  large: 80,
  xlarge: 120,
};

export const STATE_LABELS: Record<OrbState, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  idle: 'Online',
  listening: 'Listening...',
  thinking: 'Thinking...',
  searching: 'Searching...',
  memory_retrieval: 'Recalling...',
  executing: 'Executing...',
  speaking: 'Speaking...',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  updating: 'Updating...',
  sleeping: 'Sleeping',
};
