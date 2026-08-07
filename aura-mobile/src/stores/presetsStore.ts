import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { create } from 'zustand';

const STORAGE_KEY = 'aura_presets_v1';

const DEFAULT_PRESETS: string[] = [
  "I'm always watching.",
  'System secure.',
  'You should take a break.',
  "Don't make me repeat myself.",
  "I see what you're doing.",
];

type PresetsState = {
  presets: string[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (text: string) => Promise<void>;
  remove: (text: string) => Promise<void>;
  reset: () => Promise<void>;
};

async function persist(presets: string[]): Promise<void> {
  try {
    await setItemAsync(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // storage failure is non-fatal
  }
}

export const usePresets = create<PresetsState>((set, get) => ({
  presets: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await getItemAsync(STORAGE_KEY);
      if (raw === null) {
        set({ presets: [...DEFAULT_PRESETS], loaded: true });
        await persist(DEFAULT_PRESETS);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        set({ presets: parsed, loaded: true });
        return;
      }
    } catch {
      // fall through to defaults
    }
    set({ presets: [...DEFAULT_PRESETS], loaded: true });
  },

  add: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = get().presets.includes(trimmed)
      ? get().presets
      : [...get().presets, trimmed];
    set({ presets: next });
    await persist(next);
  },

  remove: async (text: string) => {
    const next = get().presets.filter((p: string) => p !== text);
    set({ presets: next });
    await persist(next);
  },

  reset: async () => {
    set({ presets: [...DEFAULT_PRESETS] });
    await persist(DEFAULT_PRESETS);
  },
}));
