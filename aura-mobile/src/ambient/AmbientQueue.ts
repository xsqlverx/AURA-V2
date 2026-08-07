import type { AmbientEvent, AmbientPriority } from './types';

const PRIORITY_ORDER: Record<AmbientPriority, number> = {
  critical: 0,
  important: 1,
  informational: 2,
  silent: 3,
};

export interface QueueOptions {
  maxVisible?: number;
  dedupWindow?: number;
}

export class AmbientQueue {
  private queue: AmbientEvent[] = [];
  private visible: Set<string> = new Set();
  private recentTypes: Map<AmbientEvent['type'], number> = new Map();
  private maxVisible: number;
  private dedupWindow: number;

  constructor(opts: QueueOptions = {}) {
    this.maxVisible = opts.maxVisible ?? 5;
    this.dedupWindow = opts.dedupWindow ?? 3000;
  }

  enqueue(event: AmbientEvent): boolean {
    if (this.isDuplicate(event)) return false;
    this.queue.push(event);
    this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    this.recentTypes.set(event.type, Date.now());
    return true;
  }

  dequeue(): AmbientEvent | null {
    if (this.queue.length === 0) return null;
    if (this.visible.size >= this.maxVisible) return null;
    const event = this.queue.shift()!;
    this.visible.add(event.id);
    return event;
  }

  dismiss(eventId: string): void {
    this.visible.delete(eventId);
    this.queue = this.queue.filter((e) => e.id !== eventId);
  }

  clear(): void {
    this.queue = [];
    this.visible.clear();
  }

  get length(): number {
    return this.queue.length;
  }

  get visibleCount(): number {
    return this.visible.size;
  }

  private isDuplicate(event: AmbientEvent): boolean {
    const lastTime = this.recentTypes.get(event.type);
    if (lastTime && Date.now() - lastTime < this.dedupWindow) return true;
    return this.queue.some((e) => e.type === event.type && e.title === event.title);
  }
}
