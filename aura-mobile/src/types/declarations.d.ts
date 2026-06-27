declare module 'expo-router' {
  import React from 'react';
  export const Stack: React.FC<{ screenOptions?: any; children?: React.ReactNode }> & {
    Screen: React.FC<{ name: string; options?: any }>;
  };
  export const Tabs: React.FC<{ screenOptions?: any; children?: React.ReactNode }> & {
    Screen: React.FC<{ name: string; options?: any }>;
  };
  export const Link: React.FC<{ href: any; asChild?: boolean; children?: any }>;
  export const Redirect: any;
  export const ErrorBoundary: any;
  export function useRouter(): any;
  export function useLocalSearchParams<T = any>(): T;
  export function useFocusEffect(callback: () => void | (() => void)): void;
  export function usePathname(): string;
  export function useSegments(): string[];
  export const unstable_settings: any;
}

declare module 'expo-symbols' {
  export const SymbolView: any;
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'zustand' {
  type Store<T> = {
    <U>(selector: (state: T) => U): U;
    (): T;
    getState: () => T;
    setState: any;
    subscribe: any;
    destroy: () => void;
  };
  export function create<T>(f: (set: any, get: any, api: any) => T): Store<T>;
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}
