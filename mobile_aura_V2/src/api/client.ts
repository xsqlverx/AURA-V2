import axios from 'axios';
import { devLog } from '../utils/devLog';
import { useSettingsStore } from '../store/settingsStore';

const API_KEY = 'testkey123';

function getBaseUrl(): string {
  return useSettingsStore.getState().pcBackendUrl || 'http://192.168.29.242:8000';
}

function getClient() {
  return axios.create({
    baseURL: getBaseUrl(),
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function checkPcConnection(): Promise<boolean> {
  try {
    const client = getClient();
    const response = await client.get('/health', { timeout: 3000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

export async function sendToPc(tool: string, params: Record<string, unknown>) {
  const client = getClient();
  const response = await client.post('/tools/execute', { tool, params });
  return response.data;
}

export async function sendChatMessage(message: string, history: { role: string; content: string }[]) {
  const client = getClient();
  const response = await client.post('/chat', { message, history });
  return response.data;
}

export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  gpu_percent?: number;
  gpu_temp?: number;
  battery?: {
    percent: number;
    charging: boolean;
    time_remaining?: string;
  };
}

export interface HealthInfo {
  status: string;
  uptime_seconds: number;
  version?: string;
}

export interface MediaInfo {
  title: string;
  artist?: string;
  app?: string;
  is_playing: boolean;
}

export interface FocusInfo {
  app: string;
  window_title: string;
}

export async function getStats(): Promise<SystemStats | null> {
  try {
    const client = getClient();
    const res = await client.get('/system/stats', { timeout: 5000 });
    return res.data;
  } catch {
    return null;
  }
}

export async function getHealth(): Promise<HealthInfo | null> {
  try {
    const client = getClient();
    const res = await client.get('/health', { timeout: 5000 });
    return res.data;
  } catch {
    return null;
  }
}

export async function getNowPlaying(): Promise<MediaInfo | null> {
  try {
    const client = getClient();
    const res = await client.get('/media/now-playing', { timeout: 5000 });
    return res.data;
  } catch {
    return null;
  }
}

export async function getFocus(): Promise<FocusInfo | null> {
  try {
    const client = getClient();
    const res = await client.get('/system/focus', { timeout: 5000 });
    return res.data;
  } catch {
    return null;
  }
}

export async function vaultList(): Promise<{ notes: { title: string; modified_at?: string; folder?: string }[] }> {
  try {
    const client = getClient();
    const res = await client.get('/vault/list', { timeout: 5000 });
    return res.data;
  } catch {
    return { notes: [] };
  }
}

export async function vaultRead(title: string): Promise<{ content: string }> {
  const client = getClient();
  const res = await client.post('/vault/read', { title });
  return res.data;
}

export async function vaultCreate(title: string, content: string): Promise<void> {
  const client = getClient();
  await client.post('/vault/create', { title, content });
}

export async function vaultDelete(title: string): Promise<void> {
  const client = getClient();
  await client.post('/vault/delete', { title });
}
