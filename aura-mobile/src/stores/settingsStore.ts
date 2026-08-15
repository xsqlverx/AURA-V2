import { create } from 'zustand';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { configure as configureApi } from '../api/aura';

export const PLACEHOLDER_URL = 'http://100.100.100.100:8000';
export const DEFAULT_BACKEND_URL = 'http://192.168.29.242:8000';

export const isConfigured = (url: string) => !!url && url !== PLACEHOLDER_URL;

const KEYS = {
  backendUrl: 'aura_backend_url',
  apiKey: 'aura_api_key',
  lockMode: 'aura_lock_mode',
  llmApiKey: 'aura_llm_api_key',
  llmProvider: 'aura_llm_provider',
  llmModel: 'aura_llm_model',
  voiceEnabled: 'aura_voice_enabled',
  ambientSpeakEnabled: 'aura_ambient_speak',
};

export type LockMode = 'exit' | '30s' | '60s' | '120s' | '300s';

export const LOCK_MODE_MS: Record<LockMode, number> = {
  exit: 2000,
  '30s': 30000,
  '60s': 60000,
  '120s': 120000,
  '300s': 300000,
};

export const LOCK_MODE_LABELS: Record<LockMode, string> = {
  exit: 'On exit',
  '30s': '30s',
  '60s': '1 min',
  '120s': '2 min',
  '300s': '5 min',
};

export const FREE_OPENROUTER_MODELS = [
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra', context: '1M', desc: 'Best free — deep reasoning, orchestration' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B', context: '262K', desc: 'Google — vision + tools, multilingual' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', context: '131K', desc: 'Meta — reliable, multilingual chat' },
  { id: 'openrouter/free', label: 'Auto (Router picks)', context: 'Varies', desc: 'Auto-routes to best available free model' },
  { id: 'cohere/north-mini-code:free', label: 'North Mini Code', context: '256K', desc: 'Cohere — coding & agentic tasks' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', label: 'Nemotron Nano Omni', context: '256K', desc: 'NVIDIA — multimodal (text+image+audio)' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning', context: '1M', desc: 'NVIDIA — fast, long-context' },
  { id: 'inclusionai/ling-3.0-flash:free', label: 'Ling 3.0 Flash', context: '262K', desc: 'InclusionAI — fast general tasks' },
] as const;

export const DEFAULT_LLM_MODEL = FREE_OPENROUTER_MODELS[0].id;

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type LlmProviderId = 'openrouter';

type SettingsState = {
  backendUrl: string;
  apiKey: string;
  lockMode: LockMode;
  llmApiKey: string;
  llmProvider: LlmProviderId;
  llmModel: string;
  localBrainMode: boolean;
  voiceEnabled: boolean;
  ambientSpeakEnabled: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: (backendUrl: string, apiKey: string) => Promise<void>;
  setLockMode: (mode: LockMode) => Promise<void>;
  saveLlm: (apiKey: string, provider: LlmProviderId, model: string) => Promise<void>;
  setLocalBrainMode: (on: boolean) => void;
  setVoiceEnabled: (on: boolean) => Promise<void>;
  setAmbientSpeakEnabled: (on: boolean) => Promise<void>;
};

export const useSettings = create<SettingsState>((set) => ({
  backendUrl: '',
  apiKey: '',
  lockMode: 'exit',
  llmApiKey: '',
  llmProvider: 'openrouter',
  llmModel: DEFAULT_LLM_MODEL,
  localBrainMode: false,
  voiceEnabled: true,
  ambientSpeakEnabled: true,
  isLoaded: false,
  load: async () => {
    try {
      const url = (await getItemAsync(KEYS.backendUrl)) || PLACEHOLDER_URL;
      const key = (await getItemAsync(KEYS.apiKey)) || 'testkey123';
      const lockMode = ((await getItemAsync(KEYS.lockMode)) as LockMode) || 'exit';
      const llmApiKey = (await getItemAsync(KEYS.llmApiKey)) || '';
      const llmProvider = ((await getItemAsync(KEYS.llmProvider)) as LlmProviderId) || 'openrouter';
      const llmModel = (await getItemAsync(KEYS.llmModel)) || DEFAULT_LLM_MODEL;
      const voiceEnabled = (await getItemAsync(KEYS.voiceEnabled)) !== 'off';
      const ambientSpeakEnabled = (await getItemAsync(KEYS.ambientSpeakEnabled)) !== 'off';
      configureApi(url, key);
      set({ backendUrl: url, apiKey: key, lockMode, llmApiKey, llmProvider, llmModel, voiceEnabled, ambientSpeakEnabled, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
  save: async (backendUrl: string, apiKey: string) => {
    await setItemAsync(KEYS.backendUrl, backendUrl);
    await setItemAsync(KEYS.apiKey, apiKey);
    configureApi(backendUrl, apiKey);
    set({ backendUrl, apiKey });
  },
  setLockMode: async (mode: LockMode) => {
    await setItemAsync(KEYS.lockMode, mode);
    set({ lockMode: mode });
  },
  saveLlm: async (apiKey: string, provider: LlmProviderId, model: string) => {
    await setItemAsync(KEYS.llmApiKey, apiKey);
    await setItemAsync(KEYS.llmProvider, provider);
    await setItemAsync(KEYS.llmModel, model);
    set({ llmApiKey: apiKey, llmProvider: provider, llmModel: model });
  },
  setLocalBrainMode: (on: boolean) => set({ localBrainMode: on }),
  setVoiceEnabled: async (on: boolean) => {
    await setItemAsync(KEYS.voiceEnabled, on ? 'on' : 'off');
    set({ voiceEnabled: on });
  },
  setAmbientSpeakEnabled: async (on: boolean) => {
    await setItemAsync(KEYS.ambientSpeakEnabled, on ? 'on' : 'off');
    set({ ambientSpeakEnabled: on });
  },
}));
