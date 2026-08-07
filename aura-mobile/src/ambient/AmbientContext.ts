import type { AmbientEvent, AmbientPriority } from './types';

export type ConversationPhase =
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'streaming'
  | 'error';

export interface AmbientContextState {
  conversationPhase: ConversationPhase;
  glanceActive: boolean;
  lastUserInteraction: number;
  orbState: string;
}

const DEFAULT_CONTEXT: AmbientContextState = {
  conversationPhase: 'idle',
  glanceActive: false,
  lastUserInteraction: Date.now(),
  orbState: 'idle',
};

let state: AmbientContextState = { ...DEFAULT_CONTEXT };

export const AmbientContext = {
  getState: (): Readonly<AmbientContextState> => state,

  update: (partial: Partial<AmbientContextState>): void => {
    state = { ...state, ...partial };
  },

  shouldSuppress: (event: AmbientEvent): boolean => {
    if (event.priority === 'critical') return false;
    if (state.conversationPhase === 'speaking' || state.conversationPhase === 'listening') {
      return event.priority !== 'important';
    }
    if (state.glanceActive && event.priority === 'informational') return true;
    return false;
  },

  getDelay: (event: AmbientEvent): number => {
    if (event.priority === 'critical') return 0;
    if (state.conversationPhase === 'speaking') return 3000;
    if (state.conversationPhase === 'listening') return 2000;
    if (state.glanceActive) return 1500;
    return 0;
  },

  getPriorityOverride: (event: AmbientEvent): AmbientPriority | null => {
    const idleDuration = Date.now() - state.lastUserInteraction;
    if (idleDuration > 60000 && event.priority === 'informational') return 'silent';
    return null;
  },

  reset: (): void => {
    state = { ...DEFAULT_CONTEXT };
  },
};
