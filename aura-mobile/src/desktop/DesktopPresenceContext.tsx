import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { DesktopPresenceContextType, DesktopPresenceState, DesktopCapability } from './types';
import { DesktopPresenceSync } from './DesktopPresenceSync';
import { useWs } from '../stores/wsStore';

const DEFAULT_STATE: DesktopPresenceState = {
  capabilities: [],
  processes: [],
  automations: [],
  downloads: [],
  recentFiles: [],
  health: {
    backend: 'down',
    uptime_seconds: 0,
    last_seen: Date.now(),
  },
  lastUpdated: Date.now(),
  syncStatus: 'syncing',
};

const DesktopContext = createContext<DesktopPresenceContextType | null>(null);

export function useDesktopPresence(): DesktopPresenceContextType {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error('useDesktopPresence must be used within DesktopPresenceProvider');
  return ctx;
}

type Props = {
  children: ReactNode;
};

export function DesktopPresenceProvider({ children }: Props) {
  const [state, setState] = useState<DesktopPresenceState>(DEFAULT_STATE);
  const syncRef = useRef<DesktopPresenceSync | null>(null);
  const wsConnected = useWs((s) => s.connected);

  const refresh = useCallback(async () => {
    if (syncRef.current) {
      await syncRef.current.refresh();
    }
  }, []);

  const hasCapability = useCallback(
    (cap: DesktopCapability): boolean => {
      return state.capabilities.includes(cap);
    },
    [state.capabilities]
  );

  useEffect(() => {
    const sync = new DesktopPresenceSync((update) => {
      setState((prev) => ({ ...prev, ...update }));
    });
    syncRef.current = sync;
    sync.start();
    sync.refresh();

    return () => {
      sync.stop();
      syncRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (syncRef.current) {
      syncRef.current.refresh();
    }
    if (!wsConnected && syncRef.current) {
      setState((prev) => ({
        ...prev,
        syncStatus: 'stale' as const,
      }));
    }
  }, [wsConnected]);

  const value: DesktopPresenceContextType = {
    state,
    refresh,
    hasCapability,
  };

  return (
    <DesktopContext.Provider value={value}>
      {children}
    </DesktopContext.Provider>
  );
}
