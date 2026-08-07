import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

export type GlanceId =
  | 'desktop'
  | 'memory'
  | 'files'
  | 'processes'
  | 'notes'
  | 'media'
  | 'activity'
  | 'health';

export type GlanceData = Record<string, any>;

export type GlanceContextType = {
  activeGlance: GlanceId | null;
  glanceData: GlanceData;
  contextHint: string;
  openGlance: (id: GlanceId) => void;
  closeGlance: () => void;
  setContextHint: (hint: string) => void;
  updateGlanceData: (id: GlanceId, data: any) => void;
};

const GlanceContext = createContext<GlanceContextType | null>(null);

export function GlanceProvider({ children }: { children: ReactNode }) {
  const [activeGlance, setActiveGlance] = useState<GlanceId | null>(null);
  const [glanceData, setGlanceData] = useState<GlanceData>({});
  const [contextHint, setContextHint] = useState('');
  const dataRef = useRef<GlanceData>({});

  const openGlance = useCallback((id: GlanceId) => {
    setActiveGlance(id);
  }, []);

  const closeGlance = useCallback(() => {
    setActiveGlance(null);
  }, []);

  const updateGlanceData = useCallback((id: GlanceId, data: any) => {
    dataRef.current[id] = data;
    setGlanceData({ ...dataRef.current });
  }, []);

  return (
    <GlanceContext.Provider value={{ activeGlance, glanceData, contextHint, openGlance, closeGlance, setContextHint, updateGlanceData }}>
      {children}
    </GlanceContext.Provider>
  );
}

export function useGlance() {
  const ctx = useContext(GlanceContext);
  if (!ctx) throw new Error('useGlance must be used within GlanceProvider');
  return ctx;
}
