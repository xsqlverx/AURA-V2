import { Colors } from '../../constants/colors';
import type { OrbState } from '../../types';

export interface OrbStateConfig {
  coreColor: string;
  glowColor: string;
  glowIntensity: number;
  ringCount: number;
  ringSpeed: number;
  particleMode: 'orbit' | 'drift' | 'converge' | 'none';
  particleCount: number;
  pulseSpeed: number;
  haloVisible: boolean;
  label: string;
}

const configs: Record<OrbState, OrbStateConfig> = {
  idle: {
    coreColor: Colors.orb.idle,
    glowColor: Colors.cyan.dim,
    glowIntensity: 0.3,
    ringCount: 0,
    ringSpeed: 0,
    particleMode: 'drift',
    particleCount: 8,
    pulseSpeed: 4200,
    haloVisible: false,
    label: 'IDLE',
  },
  listening: {
    coreColor: Colors.orb.listening,
    glowColor: Colors.green.dim,
    glowIntensity: 0.5,
    ringCount: 1,
    ringSpeed: 3000,
    particleMode: 'converge',
    particleCount: 10,
    pulseSpeed: 2000,
    haloVisible: true,
    label: 'LISTENING',
  },
  thinking: {
    coreColor: Colors.orb.thinking,
    glowColor: Colors.amber.dim,
    glowIntensity: 0.7,
    ringCount: 2,
    ringSpeed: 1500,
    particleMode: 'orbit',
    particleCount: 12,
    pulseSpeed: 1200,
    haloVisible: true,
    label: 'THINKING',
  },
  speaking: {
    coreColor: Colors.orb.speaking,
    glowColor: Colors.purple.dim,
    glowIntensity: 0.6,
    ringCount: 2,
    ringSpeed: 2000,
    particleMode: 'orbit',
    particleCount: 8,
    pulseSpeed: 1800,
    haloVisible: true,
    label: 'SPEAKING',
  },
  searching: {
    coreColor: Colors.cyan.primary,
    glowColor: Colors.cyan.dim,
    glowIntensity: 0.5,
    ringCount: 1,
    ringSpeed: 2000,
    particleMode: 'orbit',
    particleCount: 6,
    pulseSpeed: 2400,
    haloVisible: true,
    label: 'SEARCHING',
  },
  executing: {
    coreColor: Colors.amber.primary,
    glowColor: Colors.amber.dim,
    glowIntensity: 0.6,
    ringCount: 2,
    ringSpeed: 1000,
    particleMode: 'orbit',
    particleCount: 10,
    pulseSpeed: 1500,
    haloVisible: true,
    label: 'EXECUTING',
  },
  success: {
    coreColor: Colors.green.primary,
    glowColor: Colors.green.dim,
    glowIntensity: 0.5,
    ringCount: 1,
    ringSpeed: 2000,
    particleMode: 'converge',
    particleCount: 6,
    pulseSpeed: 2000,
    haloVisible: true,
    label: 'SUCCESS',
  },
  warning: {
    coreColor: Colors.amber.primary,
    glowColor: Colors.amber.dim,
    glowIntensity: 0.5,
    ringCount: 1,
    ringSpeed: 2500,
    particleMode: 'drift',
    particleCount: 5,
    pulseSpeed: 1800,
    haloVisible: true,
    label: 'WARNING',
  },
  error: {
    coreColor: Colors.red.primary,
    glowColor: Colors.red.dim,
    glowIntensity: 0.7,
    ringCount: 0,
    ringSpeed: 0,
    particleMode: 'drift',
    particleCount: 4,
    pulseSpeed: 800,
    haloVisible: true,
    label: 'ERROR',
  },
  connecting: {
    coreColor: Colors.cyan.primary,
    glowColor: Colors.cyan.dim,
    glowIntensity: 0.4,
    ringCount: 1,
    ringSpeed: 3000,
    particleMode: 'drift',
    particleCount: 6,
    pulseSpeed: 3000,
    haloVisible: false,
    label: 'CONNECTING',
  },
  disconnected: {
    coreColor: Colors.text.dim,
    glowColor: Colors.surface,
    glowIntensity: 0.1,
    ringCount: 0,
    ringSpeed: 0,
    particleMode: 'none',
    particleCount: 0,
    pulseSpeed: 0,
    haloVisible: false,
    label: 'OFFLINE',
  },
  sleeping: {
    coreColor: Colors.cyan.dim,
    glowColor: Colors.surface,
    glowIntensity: 0.15,
    ringCount: 0,
    ringSpeed: 0,
    particleMode: 'drift',
    particleCount: 3,
    pulseSpeed: 6000,
    haloVisible: false,
    label: 'SLEEPING',
  },
  updating: {
    coreColor: Colors.cyan.primary,
    glowColor: Colors.cyan.dim,
    glowIntensity: 0.5,
    ringCount: 1,
    ringSpeed: 4000,
    particleMode: 'orbit',
    particleCount: 4,
    pulseSpeed: 2000,
    haloVisible: true,
    label: 'UPDATING',
  },
};

export function getOrbConfig(state: OrbState): OrbStateConfig {
  return configs[state] ?? configs.idle;
}
