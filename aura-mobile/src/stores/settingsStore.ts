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

export const LLM_PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1/chat/completions' },
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1/chat/completions' },
] as const;

export const DEFAULT_LLM_MODEL: Record<string, string> = {
  openrouter: 'meta-llama/llama-3.1-8b-instruct',
  groq: 'llama-3.3-70b-versatile',
};

export type LlmProviderId = (typeof LLM_PROVIDERS)[number]['id'];

type SettingsState = {
  backendUrl: string;
  apiKey: string;
  lockMode: LockMode;
  llmApiKey: string;
  llmProvider: LlmProviderId;
  llmModel: string;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: (backendUrl: string, apiKey: string) => Promise<void>;
  setLockMode: (mode: LockMode) => Promise<void>;
  saveLlm: (apiKey: string, provider: LlmProviderId, model: string) => Promise<void>;
};

export const useSettings = create<SettingsState>((set) => ({
  backendUrl: '',
  apiKey: '',
  lockMode: 'exit',
  llmApiKey: '',
  llmProvider: 'openrouter',
  llmModel: DEFAULT_LLM_MODEL.openrouter,
  isLoaded: false,
  load: async () => {
    try {
      const url = (await getItemAsync(KEYS.backendUrl)) || PLACEHOLDER_URL;
      const key = (await getItemAsync(KEYS.apiKey)) || 'testkey123';
      const lockMode = ((await getItemAsync(KEYS.lockMode)) as LockMode) || 'exit';
      const llmApiKey = (await getItemAsync(KEYS.llmApiKey)) || '';
      const llmProvider = ((await getItemAsync(KEYS.llmProvider)) as LlmProviderId) || 'openrouter';
      const llmModel = (await getItemAsync(KEYS.llmModel)) || DEFAULT_LLM_MODEL[llmProvider];
      configureApi(url, key);
      set({ backendUrl: url, apiKey: key, lockMode, llmApiKey, llmProvider, llmModel, isLoaded: true });
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
}));
