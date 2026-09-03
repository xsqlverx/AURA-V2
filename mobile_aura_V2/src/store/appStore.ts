import { create } from 'zustand';
import type { Message, OrbState } from '../types';

interface AppStore {
  pcConnected: boolean;
  orbState: OrbState;
  messages: Message[];
  isProcessing: boolean;

  setPcConnected: (connected: boolean) => void;
  setOrbState: (state: OrbState) => void;
  addMessage: (message: Message) => void;
  setIsProcessing: (processing: boolean) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  pcConnected: false,
  orbState: 'idle',
  messages: [],
  isProcessing: false,

  setPcConnected: (connected) => set({ pcConnected: connected }),
  setOrbState: (state) => set({ orbState: state }),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  clearMessages: () => set({ messages: [] }),
}));
