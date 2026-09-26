import axios from 'axios';
import { devLog } from '../utils/devLog';
import { useSettingsStore } from '../store/settingsStore';

export function normalizeBackendUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'http://192.168.29.242:8000';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  
  url = url.replace(/\/+$/, '');
  
  const withoutScheme = url.replace(/^https?:\/\//, '');
  if (!withoutScheme.includes(':') && !withoutScheme.includes('/')) {
    url = url + ':8000';
  }
  
  return url;
}

function getBaseUrl(): string {
  return normalizeBackendUrl(useSettingsStore.getState().pcBackendUrl);
}

function getApiKey(): string {
  return useSettingsStore.getState().mobileApiKey || 'testkey123';
}

function getClient(overrideBaseUrl?: string) {
  return axios.create({
    baseURL: overrideBaseUrl ? normalizeBackendUrl(overrideBaseUrl) : getBaseUrl(),
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function checkPcConnection(overrideUrl?: string): Promise<boolean> {
  try {
    const client = getClient(overrideUrl);
    devLog.info(`Checking PC link at: ${client.defaults.baseURL}/health`);
    const response = await client.get('/health', { timeout: 6000 });
    return response.data?.status === 'ok' || response.status === 200;
  } catch (err: any) {
    devLog.warn('PC check error:', err?.message || err);
    return false;
  }
}

export async function sendToPc(tool: string, params: Record<string, unknown>) {
  const client = getClient();
  // Backend provides /action endpoint for tool execution
  try {
    const response = await client.post('/action', { tool, params });
    return response.data;
  } catch (err) {
    // Fallback: send as chat command to backend agent if /action is not matched
    const chatFallback = await client.post('/chat', { message: `${tool} ${JSON.stringify(params)}`, history: [] });
    return chatFallback.data;
  }
}

export async function speakOnPc(text: string): Promise<boolean> {
  try {
    const client = getClient();
    // Send speech broadcast command to PC
    await client.post('/action', {
      tool: 'speak',
      params: { text },
    });
    return true;
  } catch (err) {
    devLog.warn('Failed to speak on PC', err);
    return false;
  }
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
    // Fixed endpoint: /system-stats
    const res = await client.get('/system-stats', { timeout: 5000 });
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
    // Fixed endpoint: /now-playing
    const res = await client.get('/now-playing', { timeout: 5000 });
    return res.data;
  } catch {
    return null;
  }
}

export async function getFocus(): Promise<FocusInfo | null> {
  try {
    const client = getClient();
    const res = await client.get('/api/activity/log', { timeout: 5000 });
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
  // Fixed method: GET /vault/read?title=...
  const res = await client.get('/vault/read', { params: { title } });
  return res.data;
}

export async function vaultCreate(title: string, content: string): Promise<void> {
  const client = getClient();
  await client.post('/vault/create', { title, content });
}

export async function vaultDelete(title: string): Promise<void> {
  const client = getClient();
  // Fixed method: DELETE /vault/delete?title=...
  await client.delete('/vault/delete', { params: { title } });
}
