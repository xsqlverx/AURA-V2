import type { AmbientEvent, AmbientEventType, AmbientPriority } from './types';

const MAX_HISTORY = 200;

let history: AmbientEvent[] = [];
let listeners: Array<() => void> = [];

export const AmbientHistory = {
  push(event: AmbientEvent): void {
    history.unshift(event);
    if (history.length > MAX_HISTORY) history.pop();
    listeners.forEach((fn) => fn());
  },

  getAll(): AmbientEvent[] {
    return [...history];
  },

  getRecent(count: number = 20): AmbientEvent[] {
    return history.slice(0, count);
  },

  getByType(type: AmbientEventType): AmbientEvent[] {
    return history.filter((e) => e.type === type);
  },

  getByPriority(priority: AmbientPriority): AmbientEvent[] {
    return history.filter((e) => e.priority === priority);
  },

  getSince(timestamp: number): AmbientEvent[] {
    return history.filter((e) => e.timestamp >= timestamp);
  },

  clear(): void {
    history = [];
    listeners.forEach((fn) => fn());
  },

  subscribe(fn: () => void): () => void {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  get count(): number {
    return history.length;
  },
};
