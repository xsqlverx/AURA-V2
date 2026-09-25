import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LLMProvider = 'groq' | 'openrouter' | 'nvidia' | 'cerebras' | 'sambanova' | 'custom';

export interface ProviderModel {
  id: string;
  name: string;
  provider: LLMProvider;
  isFree: boolean;
  contextLength?: string;
  description: string;
}

export const PRESET_MODELS: ProviderModel[] = [
  // Groq (Ultra-fast inference, generous free tier)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    isFree: true,
    contextLength: '128k',
    description: 'Ultra fast general reasoning & tool executor',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    isFree: true,
    contextLength: '32k',
    description: 'High throughput MoE model',
  },
  // OpenRouter Free Models
  {
    id: 'openrouter/free',
    name: 'Auto Free Router',
    provider: 'openrouter',
    isFree: true,
    description: 'Automatically routes to best available free model',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (OpenRouter)',
    provider: 'openrouter',
    isFree: true,
    description: 'High capacity free instruction model',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash',
    provider: 'openrouter',
    isFree: true,
    description: 'Ultra-low latency Google flagship',
  },
  // Nvidia NIM
  {
    id: 'meta/llama-3.1-70b-instruct',
    name: 'Nvidia NIM Llama 3.1 70B',
    provider: 'nvidia',
    isFree: true,
    description: 'Nvidia cloud accelerated inference',
  },
  // Cerebras
  {
    id: 'llama3.3-70b',
    name: 'Cerebras Llama 3.3 70B',
    provider: 'cerebras',
    isFree: true,
    description: 'Sub-second wafer-scale engine speed',
  },
];

interface SettingsState {
  activeProvider: LLMProvider;
  llmModel: string;
  
  // API Keys per provider
  groqApiKey: string;
  openrouterApiKey: string;
  nvidiaApiKey: string;
  cerebrasApiKey: string;
  customEndpointUrl: string;
  customApiKey: string;

  // Voice & Personality
  ttsEnabled: boolean;
  ttsSpeed: number;
  voiceGender: 'female' | 'male';
  voiceProvider: 'edge' | 'system';

  // PC Backend Companion
  pcBackendUrl: string;
  mobileApiKey: string;

  // Automation & Overlay
  overlayEnabled: boolean;
  accessibilityEnabled: boolean;

  // System
  initialized: boolean;

  // Actions
  setActiveProvider: (provider: LLMProvider) => void;
  setModel: (model: string) => void;
  setGroqApiKey: (key: string) => void;
  setOpenrouterApiKey: (key: string) => void;
  setNvidiaApiKey: (key: string) => void;
  setCerebrasApiKey: (key: string) => void;
  setCustomConfig: (url: string, key: string) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsSpeed: (speed: number) => void;
  setVoiceGender: (gender: 'female' | 'male') => void;
  setPcBackendUrl: (url: string) => void;
  setOverlayEnabled: (enabled: boolean) => void;
  setAccessibilityEnabled: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
  getActiveApiKey: () => string;
}

const STORAGE_KEY = 'aura_v2_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  activeProvider: 'openrouter',
  llmModel: 'openrouter/free',
  groqApiKey: '',
  openrouterApiKey: '',
  nvidiaApiKey: '',
  cerebrasApiKey: '',
  customEndpointUrl: '',
  customApiKey: '',

  ttsEnabled: true,
  ttsSpeed: 1.0,
  voiceGender: 'female',
  voiceProvider: 'edge',

  pcBackendUrl: 'http://192.168.29.242:8000',
  mobileApiKey: 'testkey123',

  overlayEnabled: false,
  accessibilityEnabled: false,
  initialized: false,

  setActiveProvider: (provider) => {
    set({ activeProvider: provider });
    // Default model if changing provider
    const firstForProvider = PRESET_MODELS.find((m) => m.provider === provider);
    if (firstForProvider) {
      set({ llmModel: firstForProvider.id });
    }
    persistSettings(get());
  },

  setModel: (model) => {
    set({ llmModel: model });
    persistSettings(get());
  },

  setGroqApiKey: (key) => {
    set({ groqApiKey: key });
    persistSettings(get());
  },

  setOpenrouterApiKey: (key) => {
    set({ openrouterApiKey: key });
    persistSettings(get());
  },

  setNvidiaApiKey: (key) => {
    set({ nvidiaApiKey: key });
    persistSettings(get());
  },

  setCerebrasApiKey: (key) => {
    set({ cerebrasApiKey: key });
    persistSettings(get());
  },

  setCustomConfig: (url, key) => {
    set({ customEndpointUrl: url, customApiKey: key });
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

  setVoiceGender: (gender) => {
    set({ voiceGender: gender });
    persistSettings(get());
  },

  setPcBackendUrl: (url) => {
    set({ pcBackendUrl: url });
    persistSettings(get());
  },

  setOverlayEnabled: (enabled) => {
    set({ overlayEnabled: enabled });
    persistSettings(get());
  },

  setAccessibilityEnabled: (enabled) => {
    set({ accessibilityEnabled: enabled });
    persistSettings(get());
  },

  getActiveApiKey: () => {
    const s = get();
    switch (s.activeProvider) {
      case 'groq':
        return s.groqApiKey;
      case 'nvidia':
        return s.nvidiaApiKey;
      case 'cerebras':
        return s.cerebrasApiKey;
      case 'custom':
        return s.customApiKey;
      case 'openrouter':
      default:
        return s.openrouterApiKey;
    }
  },

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          activeProvider: data.activeProvider ?? 'openrouter',
          llmModel: data.llmModel ?? 'openrouter/free',
          groqApiKey: data.groqApiKey ?? '',
          openrouterApiKey: data.openrouterApiKey ?? '',
          nvidiaApiKey: data.nvidiaApiKey ?? '',
          cerebrasApiKey: data.cerebrasApiKey ?? '',
          customEndpointUrl: data.customEndpointUrl ?? '',
          customApiKey: data.customApiKey ?? '',
          ttsEnabled: data.ttsEnabled ?? true,
          ttsSpeed: data.ttsSpeed ?? 1.0,
          voiceGender: data.voiceGender ?? 'female',
          voiceProvider: data.voiceProvider ?? 'edge',
          pcBackendUrl: data.pcBackendUrl ?? 'http://192.168.29.242:8000',
          mobileApiKey: data.mobileApiKey ?? 'testkey123',
          overlayEnabled: data.overlayEnabled ?? false,
          accessibilityEnabled: data.accessibilityEnabled ?? false,
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
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeProvider: state.activeProvider,
        llmModel: state.llmModel,
        groqApiKey: state.groqApiKey,
        openrouterApiKey: state.openrouterApiKey,
        nvidiaApiKey: state.nvidiaApiKey,
        cerebrasApiKey: state.cerebrasApiKey,
        customEndpointUrl: state.customEndpointUrl,
        customApiKey: state.customApiKey,
        ttsEnabled: state.ttsEnabled,
        ttsSpeed: state.ttsSpeed,
        voiceGender: state.voiceGender,
        voiceProvider: state.voiceProvider,
        pcBackendUrl: state.pcBackendUrl,
        mobileApiKey: state.mobileApiKey,
        overlayEnabled: state.overlayEnabled,
        accessibilityEnabled: state.accessibilityEnabled,
      })
    );
  } catch {}
}
