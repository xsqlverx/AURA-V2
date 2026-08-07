import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { AmbientContext } from './AmbientContext';
import { useWs } from '../stores/wsStore';
import { useGlance } from '../components/glances';
import type { ConversationPhase } from './AmbientContext';

const WS_PHASE_MAP: Record<string, ConversationPhase> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'processing',
  speaking: 'speaking',
  disconnected: 'idle',
};

export function AmbientContextUpdater() {
  const wsState = useWs((s) => s.state);
  const glance = useGlance();
  const lastInteraction = useRef(Date.now());

  useEffect(() => {
    const phase = WS_PHASE_MAP[wsState] || 'idle';
    AmbientContext.update({ conversationPhase: phase });
  }, [wsState]);

  useEffect(() => {
    AmbientContext.update({ glanceActive: glance.activeGlance !== null });
  }, [glance.activeGlance]);

  useEffect(() => {
    const unsub = InteractionManager.runAfterInteractions(() => {
      lastInteraction.current = Date.now();
      AmbientContext.update({ lastUserInteraction: Date.now() });
    });
    return () => unsub.cancel();
  }, []);

  return null;
}
