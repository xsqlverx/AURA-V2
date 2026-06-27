import { create } from 'zustand';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { configure as configureApi } from '../api/aura';

const KEYS = {
  backendUrl: 'aura_backend_url',
  apiKey: 'aura_api_key',
};

type SettingsState = {
  backendUrl: string;
  apiKey: string;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: (backendUrl: string, apiKey: string) => Promise<void>;
};

export const useSettings = create<SettingsState>((set) => ({
  backendUrl: '',
  apiKey: '',
  isLoaded: false,
  load: async () => {
    try {
      const url = (await getItemAsync(KEYS.backendUrl)) || 'http://100.100.100.100:8000';
      const key = (await getItemAsync(KEYS.apiKey)) || 'testkey123';
      configureApi(url, key);
      set({ backendUrl: url, apiKey: key, isLoaded: true });
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
}));
