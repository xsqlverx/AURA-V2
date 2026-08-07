import type { AmbientEventMeta, AmbientEventType } from './types';

const REGISTRY: Record<AmbientEventType, AmbientEventMeta> = {
  'desktop:disconnected': {
    type: 'desktop:disconnected',
    defaultPriority: 'critical',
    defaultSurface: 'banner',
    orbColor: '#FF453A',
    orbEffect: 'contraction',
    ttl: 0,
    icon: 'monitor',
  },
  'desktop:reconnected': {
    type: 'desktop:reconnected',
    defaultPriority: 'important',
    defaultSurface: 'pill',
    orbColor: '#00F2FF',
    orbEffect: 'bloom',
    ttl: 6000,
    icon: 'monitor',
  },
  'task:completed': {
    type: 'task:completed',
    defaultPriority: 'important',
    defaultSurface: 'pill',
    orbColor: '#3FB950',
    orbEffect: 'bloom',
    ttl: 6000,
    icon: 'check-circle',
  },
  'app:launched': {
    type: 'app:launched',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#00F2FF',
    orbEffect: 'hint',
    ttl: 4000,
    icon: 'terminal',
  },
  'system:cpu_high': {
    type: 'system:cpu_high',
    defaultPriority: 'important',
    defaultSurface: 'chip',
    orbColor: '#FF9F0A',
    orbEffect: 'pulse',
    ttl: 8000,
    icon: 'cpu',
  },
  'system:battery_low': {
    type: 'system:battery_low',
    defaultPriority: 'important',
    defaultSurface: 'pill',
    orbColor: '#FF9F0A',
    orbEffect: 'pulse',
    ttl: 8000,
    icon: 'battery-full',
  },
  'download:completed': {
    type: 'download:completed',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#3FB950',
    orbEffect: 'hint',
    ttl: 4000,
    icon: 'download',
  },
  'file:changed': {
    type: 'file:changed',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#00F2FF',
    orbEffect: 'hint',
    ttl: 4000,
    icon: 'file',
  },
  'memory:learned': {
    type: 'memory:learned',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#BC8CFF',
    orbEffect: 'pulse',
    ttl: 4000,
    icon: 'memory',
  },
  'reminder:available': {
    type: 'reminder:available',
    defaultPriority: 'important',
    defaultSurface: 'pill',
    orbColor: '#BC8CFF',
    orbEffect: 'pulse',
    ttl: 6000,
    icon: 'clock',
  },
  'briefing:ready': {
    type: 'briefing:ready',
    defaultPriority: 'important',
    defaultSurface: 'pill',
    orbColor: '#00F2FF',
    orbEffect: 'bloom',
    ttl: 6000,
    icon: 'newspaper',
  },
  'weather:alert': {
    type: 'weather:alert',
    defaultPriority: 'important',
    defaultSurface: 'pill',
    orbColor: '#00F2FF',
    orbEffect: 'pulse',
    ttl: 6000,
    icon: 'wb-sunny',
  },
  'media:changed': {
    type: 'media:changed',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#BC8CFF',
    orbEffect: 'hint',
    ttl: 4000,
    icon: 'music-note',
  },
  'calendar:approaching': {
    type: 'calendar:approaching',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#00F2FF',
    orbEffect: 'hint',
    ttl: 4000,
    icon: 'calendar',
  },
  'note:created': {
    type: 'note:created',
    defaultPriority: 'informational',
    defaultSurface: 'toast',
    orbColor: '#BC8CFF',
    orbEffect: 'hint',
    ttl: 4000,
    icon: 'edit-note',
  },
  'clipboard:synced': {
    type: 'clipboard:synced',
    defaultPriority: 'silent',
    defaultSurface: 'none',
    orbColor: '#00F2FF',
    orbEffect: 'hint',
    ttl: 0,
    icon: 'content-copy',
  },
};

export function getEventMeta(type: AmbientEventType): AmbientEventMeta {
  return REGISTRY[type];
}

export function registerEventType(type: AmbientEventType, meta: AmbientEventMeta): void {
  REGISTRY[type] = meta;
}

export function getAllEventTypes(): AmbientEventType[] {
  return Object.keys(REGISTRY) as AmbientEventType[];
}

export const AMBIENT_EVENT_TYPES = Object.keys(REGISTRY) as AmbientEventType[];
