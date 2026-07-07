import { create } from 'zustand';
import { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

const PIN_KEY = 'aura_pin_hash';
const LOCK_ENABLED_KEY = 'aura_lock_enabled';

async function hashPin(pin: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, pin);
}

type AuthState = {
  locked: boolean;
  lockEnabled: boolean;
  pinSet: boolean;
  init: () => Promise<void>;
  enableLock: (pin: string) => Promise<boolean>;
  disableLock: () => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  authenticate: () => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  locked: true,
  lockEnabled: false,
  pinSet: false,

  init: async () => {
    try {
      const enabled = await getItemAsync(LOCK_ENABLED_KEY);
      const pinHash = await getItemAsync(PIN_KEY);
      const lockEnabled = enabled === 'true';
      set({ lockEnabled, pinSet: !!pinHash, locked: lockEnabled });
    } catch {
      set({ locked: false });
    }
  },

  enableLock: async (pin: string) => {
    const hash = await hashPin(pin);
    await setItemAsync(PIN_KEY, hash);
    await setItemAsync(LOCK_ENABLED_KEY, 'true');
    set({ lockEnabled: true, pinSet: true, locked: true });
    return true;
  },

  disableLock: async () => {
    await deleteItemAsync(LOCK_ENABLED_KEY);
    await deleteItemAsync(PIN_KEY);
    set({ lockEnabled: false, pinSet: false, locked: false });
  },

  changePin: async (oldPin: string, newPin: string) => {
    const valid = await get().verifyPin(oldPin);
    if (!valid) return false;
    const hash = await hashPin(newPin);
    await setItemAsync(PIN_KEY, hash);
    return true;
  },

  authenticate: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (hasHardware) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Aura',
          disableDeviceFallback: true,
        });
        if (result.success) {
          set({ locked: false });
          return true;
        }
      }
    }
    return false;
  },

  verifyPin: async (pin: string) => {
    const stored = await getItemAsync(PIN_KEY);
    if (!stored) return false;
    const hash = await hashPin(pin);
    return hash === stored;
  },

  lock: () => {
    const { lockEnabled } = get();
    if (lockEnabled) set({ locked: true });
  },
}));