import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import type {
  AmbientEvent,
  AmbientEventType,
  AmbientPriority,
  AmbientSurface,
  AmbientOrbReaction,
} from './types';
import { getEventMeta } from './AmbientRegistry';
import { AmbientQueue } from './AmbientQueue';
import { AmbientContext as Ctx } from './AmbientContext';
import { AmbientHistory } from './AmbientHistory';
import { AmbientSurfaceRenderer } from './AmbientPresenter';

let eventCounter = 0;

function createEventId(): string {
  eventCounter += 1;
  return `ambient_${Date.now()}_${eventCounter}`;
}

type EmitOptions = {
  priority?: AmbientPriority;
  surface?: AmbientSurface;
  metadata?: Record<string, any>;
  ttl?: number;
};

type AmbientContextType = {
  emit: (type: AmbientEventType, title: string, description?: string, opts?: EmitOptions) => void;
  history: AmbientEvent[];
  latestOrbReaction: AmbientOrbReaction | null;
  clearHistory: () => void;
};

const AmbientCtx = createContext<AmbientContextType | null>(null);

export function useAmbient(): AmbientContextType {
  const ctx = useContext(AmbientCtx);
  if (!ctx) throw new Error('useAmbient must be used within AmbientProvider');
  return ctx;
}

type Props = {
  children: ReactNode;
};

export function AmbientProvider({ children }: Props) {
  const [activeSurfaces, setActiveSurfaces] = useState<
    { event: AmbientEvent; surface: AmbientSurface; key: string }[]
  >([]);
  const [orbReaction, setOrbReaction] = useState<AmbientOrbReaction | null>(null);
  const [history, setHistory] = useState<AmbientEvent[]>([]);

  const queueRef = useRef(new AmbientQueue());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncHistory = useCallback(() => {
    setHistory(AmbientHistory.getAll());
  }, []);

  const processQueue = useCallback(() => {
    const event = queueRef.current.dequeue();
    if (!event) return;
    const meta = getEventMeta(event.type);
    const surface = (event as any)._surface || meta.defaultSurface;
    setActiveSurfaces((prev) => [
      ...prev,
      { event, surface, key: event.id },
    ]);
    AmbientHistory.push(event);
    syncHistory();
    setOrbReaction({
      color: meta.orbColor,
      effect: meta.orbEffect,
      duration: Math.max(event.ttl || 4000, 2000),
    });
  }, [syncHistory]);

  useEffect(() => {
    timerRef.current = setInterval(processQueue, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [processQueue]);

  const dismiss = useCallback((eventId: string) => {
    queueRef.current.dismiss(eventId);
    setActiveSurfaces((prev) => prev.filter((s) => s.event.id !== eventId));
  }, []);

  const emit = useCallback(
    (type: AmbientEventType, title: string, description?: string, opts?: EmitOptions) => {
      const meta = getEventMeta(type);
      const priority = opts?.priority || meta.defaultPriority;
      const surface = opts?.surface || meta.defaultSurface;

      const priorityOverride = Ctx.getPriorityOverride({
        id: '',
        type,
        priority,
        title,
        description: description || '',
        timestamp: Date.now(),
      } as AmbientEvent);

      const effectivePriority = priorityOverride || priority;

      if (effectivePriority === 'silent' && surface === 'none') {
        AmbientHistory.push({
          id: createEventId(),
          type,
          priority: effectivePriority,
          title,
          description: description || '',
          metadata: opts?.metadata,
          timestamp: Date.now(),
          ttl: 0,
        });
        syncHistory();
        return;
      }

      const suppressed = Ctx.shouldSuppress({
        id: '',
        type,
        priority: effectivePriority,
        title,
        description: description || '',
        timestamp: Date.now(),
      } as AmbientEvent);

      if (suppressed) {
        const delay = Ctx.getDelay({
          id: '',
          type,
          priority: effectivePriority,
          title,
          description: description || '',
          timestamp: Date.now(),
        } as AmbientEvent);

        setTimeout(() => {
          const event: AmbientEvent = {
            id: createEventId(),
            type,
            priority: effectivePriority,
            title,
            description: description || '',
            metadata: opts?.metadata,
            timestamp: Date.now(),
            ttl: opts?.ttl ?? meta.ttl,
          };
          (event as any)._surface = surface;
          queueRef.current.enqueue(event);
        }, delay);
        return;
      }

      const event: AmbientEvent = {
        id: createEventId(),
        type,
        priority: effectivePriority,
        title,
        description: description || '',
        metadata: opts?.metadata,
        timestamp: Date.now(),
        ttl: opts?.ttl ?? meta.ttl,
      };
      (event as any)._surface = surface;

      const queued = queueRef.current.enqueue(event);
      if (!queued) {
        AmbientHistory.push(event);
        syncHistory();
      }
    },
    [syncHistory]
  );

  const clearHistory = useCallback(() => {
    AmbientHistory.clear();
    syncHistory();
  }, [syncHistory]);

  const value: AmbientContextType = {
    emit,
    history,
    latestOrbReaction: orbReaction,
    clearHistory,
  };

  return (
    <AmbientCtx.Provider value={value}>
      <View style={styles.container}>
        {children}
        {activeSurfaces.map((s) => (
          <AmbientSurfaceRenderer
            key={s.key}
            event={s.event}
            surface={s.surface}
            onDismiss={dismiss}
          />
        ))}
      </View>
    </AmbientCtx.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
