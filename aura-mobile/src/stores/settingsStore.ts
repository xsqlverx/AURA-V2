import { create } from 'zustand';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { configure as configureApi } from '../api/aura';

const KEYS = {
  backendUrl: 'aura_backend_url',
  apiKey: 'aura_api_key',
  lockMode: 'aura_lock_mode',
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

type SettingsState = {
  backendUrl: string;
  apiKey: string;
  lockMode: LockMode;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: (backendUrl: string, apiKey: string) => Promise<void>;
  setLockMode: (mode: LockMode) => Promise<void>;
};

export const useSettings = create<SettingsState>((set) => ({
  backendUrl: '',
  apiKey: '',
  lockMode: 'exit',
  isLoaded: false,
  load: async () => {
    try {
      const url = (await getItemAsync(KEYS.backendUrl)) || 'http://100.100.100.100:8000';
      const key = (await getItemAsync(KEYS.apiKey)) || 'testkey123';
      const lockMode = ((await getItemAsync(KEYS.lockMode)) as LockMode) || 'exit';
      configureApi(url, key);
      set({ backendUrl: url, apiKey: key, lockMode, isLoaded: true });
    } catch (e) {
      console.warn('[Settings] load failed, using defaults:', e);
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
}));
