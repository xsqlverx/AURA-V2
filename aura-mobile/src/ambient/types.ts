export type AmbientPriority = 'critical' | 'important' | 'informational' | 'silent';

export type AmbientEventType =
  | 'desktop:disconnected'
  | 'desktop:reconnected'
  | 'task:completed'
  | 'app:launched'
  | 'system:cpu_high'
  | 'system:battery_low'
  | 'download:completed'
  | 'file:changed'
  | 'memory:learned'
  | 'reminder:available'
  | 'briefing:ready'
  | 'weather:alert'
  | 'media:changed'
  | 'calendar:approaching'
  | 'note:created'
  | 'clipboard:synced';

export type AmbientEvent = {
  id: string;
  type: AmbientEventType;
  priority: AmbientPriority;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: number;
  ttl?: number;
};

export type AmbientSurface = 'pill' | 'banner' | 'toast' | 'chip' | 'orb' | 'none';

export type AmbientEventMeta = {
  type: AmbientEventType;
  defaultPriority: AmbientPriority;
  defaultSurface: AmbientSurface;
  orbColor: string;
  orbEffect: 'bloom' | 'pulse' | 'contraction' | 'hint';
  ttl: number;
  icon: string;
};

export type AmbientOrbReaction = {
  color: string;
  effect: 'bloom' | 'pulse' | 'contraction' | 'hint';
  duration: number;
};

export interface AmbientState {
  activeEvents: AmbientEvent[];
  history: AmbientEvent[];
  currentSurface: AmbientSurface | null;
  latestReaction: AmbientOrbReaction | null;
}
