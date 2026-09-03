import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  openrouterApiKey: string;
  llmModel: string;
  ttsEnabled: boolean;
  ttsSpeed: number;
  pcBackendUrl: string;
  initialized: boolean;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsSpeed: (speed: number) => void;
  setPcBackendUrl: (url: string) => void;
  loadSettings: () => Promise<void>;
}

const STORAGE_KEY = 'aura_settings';

export const FREE_MODELS = [
  { id: 'openrouter/free', label: 'Auto (Router picks)' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
];

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  openrouterApiKey: '',
  llmModel: 'openrouter/free',
  ttsEnabled: false,
  ttsSpeed: 1.0,
  pcBackendUrl: 'http://192.168.29.242:8000',
  initialized: false,

  setApiKey: (key) => {
    set({ openrouterApiKey: key });
    persistSettings(get());
  },
  setModel: (model) => {
    set({ llmModel: model });
    persistSettings(get());
  },
  setTtsEnabled: (enabled) => {
    set({ ttsEnabled: enabled });
    persistSettings(get());
  },
  setTtsSpeed: (speed) => {
    set({ ttsSpeed: speed });
    persistSettings(get());
  },
  setPcBackendUrl: (url) => {
    set({ pcBackendUrl: url });
    persistSettings(get());
  },
  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          openrouterApiKey: data.openrouterApiKey ?? '',
          llmModel: data.llmModel ?? 'openrouter/free',
          ttsEnabled: data.ttsEnabled ?? false,
          ttsSpeed: data.ttsSpeed ?? 1.0,
          pcBackendUrl: data.pcBackendUrl ?? 'http://localhost:8000',
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },
}));

async function persistSettings(state: SettingsState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      openrouterApiKey: state.openrouterApiKey,
      llmModel: state.llmModel,
      ttsEnabled: state.ttsEnabled,
      ttsSpeed: state.ttsSpeed,
      pcBackendUrl: state.pcBackendUrl,
    }));
  } catch {}
}
