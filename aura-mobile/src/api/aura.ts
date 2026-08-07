const DEFAULT_URL = 'http://100.100.100.100:8000';
const DEFAULT_KEY = 'testkey123';

let _baseUrl = DEFAULT_URL;
let _apiKey = DEFAULT_KEY;

export function configure(baseUrl: string, apiKey: string) {
  _baseUrl = baseUrl.replace(/\/+$/, '');
  _apiKey = apiKey;
}

export function getBaseUrl() { return _baseUrl; }
export function getApiKey() { return _apiKey; }

async function request(path: string, options: RequestInit = {}) {
  const url = `${_baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${_apiKey}`,
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text.slice(0, 100)}`);
  }
  return res;
}

// ── Chat ─────────────────────────────────────────────────────────────

export async function chat(
  message: string,
  history: { role: string; content: string }[] = [],
  mode: string = 'deep',
  onChunk: (text: string) => void
): Promise<string> {
  const res = await request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, mode }),
  });
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(chunk);
  }
  return full;
}

// ── Health ───────────────────────────────────────────────────────────

export async function getHealth() {
  const res = await fetch(`${_baseUrl}/health`);
  return res.json();
}

// ── Memory CRUD ──────────────────────────────────────────────────────

export async function getMemory() {
  const res = await request('/memory');
  const data = await res.json();
  return data.entries as { id: string; text: string; metadata?: any }[];
}

export async function createMemory(text: string) {
  const res = await request('/memory', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function updateMemory(id: string, text: string) {
  const res = await request(`/memory/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function deleteMemory(id: string) {
  const res = await request(`/memory/${id}`, { method: 'DELETE' });
  return res.json();
}

// ── System Stats ─────────────────────────────────────────────────────

export async function getStats() {
  const res = await request('/system-stats');
  return res.json();
}

// ── Weather ──────────────────────────────────────────────────────────

export async function getWeather() {
  const res = await request('/weather');
  return res.json();
}

// ── News ─────────────────────────────────────────────────────────────

export async function getNews(count: number = 5) {
  const res = await request(`/news?count=${count}`);
  return res.json();
}

// ── Search ───────────────────────────────────────────────────────────

export async function webSearch(query: string) {
  const res = await request(`/search?query=${encodeURIComponent(query)}`);
  return res.json();
}

// ── System Control ───────────────────────────────────────────────────

export async function systemLock() {
  const res = await request('/system/lock', { method: 'POST' });
  return res.json();
}

export async function systemSleep() {
  const res = await request('/system/sleep', { method: 'POST' });
  return res.json();
}

export async function systemShutdown(delay: number = 20) {
  const res = await request('/system/shutdown', {
    method: 'POST',
    body: JSON.stringify({ delay_seconds: delay }),
  });
  return res.json();
}

export async function systemRestart(delay: number = 30) {
  const res = await request('/system/restart', {
    method: 'POST',
    body: JSON.stringify({ delay_seconds: delay }),
  });
  return res.json();
}

export async function systemCancelShutdown() {
  const res = await request('/system/cancel-shutdown', { method: 'POST' });
  return res.json();
}

// ── Volume ───────────────────────────────────────────────────────────

export async function getVolume() {
  const res = await request('/volume');
  return res.json();
}

export async function setVolume(level: number) {
  const res = await request('/volume/set', {
    method: 'POST',
    body: JSON.stringify({ level }),
  });
  return res.json();
}

export async function muteAudio(muted: boolean = true) {
  const res = await request('/volume/mute', {
    method: 'POST',
    body: JSON.stringify({ muted }),
  });
  return res.json();
}

// ── Media ────────────────────────────────────────────────────────────

export async function getNowPlaying() {
  const res = await request('/now-playing');
  return res.json();
}

export async function mediaControl(action: string, value?: number) {
  const res = await request('/media/control', {
    method: 'POST',
    body: JSON.stringify({ action, value }),
  });
  return res.json();
}

// ── Apps ─────────────────────────────────────────────────────────────

export async function launchApp(appName: string) {
  const res = await request('/apps/launch', {
    method: 'POST',
    body: JSON.stringify({ app_name: appName }),
  });
  return res.json();
}

export async function getProcesses(filterPattern?: string, excludeSystem: boolean = true) {
  const params = new URLSearchParams();
  if (filterPattern) params.set('filter_pattern', filterPattern);
  if (excludeSystem) params.set('exclude_system', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request(`/apps/processes${qs}`);
  return res.json();
}

export async function killProcess(pid: number) {
  const res = await request('/apps/kill', {
    method: 'POST',
    body: JSON.stringify({ pid }),
  });
  return res.json();
}

// ── Clipboard ────────────────────────────────────────────────────────

export async function clipboardCopy(text: string) {
  const res = await request('/clipboard/copy', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function clipboardPaste() {
  const res = await request('/clipboard/paste');
  return res.json();
}

// ── Files ────────────────────────────────────────────────────────────

export async function fileList(path: string = '.') {
  const res = await request(`/files/list?path=${encodeURIComponent(path)}`);
  return res.json();
}

export async function fileOpen(path: string) {
  const res = await request('/files/open', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
  return res.json();
}

// ── Vault / Notes ────────────────────────────────────────────────────

export async function vaultList(folder?: string) {
  const qs = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  const res = await request(`/vault/list${qs}`);
  return res.json();
}

export async function vaultRead(title: string) {
  const res = await request(`/vault/read?title=${encodeURIComponent(title)}`);
  return res.json();
}

export async function vaultCreate(title: string, content: string, folder?: string) {
  const res = await request('/vault/create', {
    method: 'POST',
    body: JSON.stringify({ title, content, folder }),
  });
  return res.json();
}

export async function vaultAppend(title: string, content: string) {
  const res = await request(`/vault/append?title=${encodeURIComponent(title)}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function vaultDelete(title: string) {
  const res = await request(`/vault/delete?title=${encodeURIComponent(title)}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ── Input ────────────────────────────────────────────────────────────

export async function inputType(text: string) {
  const res = await request('/input/type', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function inputKey(key: string) {
  const res = await request('/input/key', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
  return res.json();
}

export async function inputHotkey(keys: string[]) {
  const res = await request('/input/hotkey', {
    method: 'POST',
    body: JSON.stringify({ keys }),
  });
  return res.json();
}

// ── Discord ──────────────────────────────────────────────────────────

export async function getDiscordFriends() {
  const res = await request('/discord/friends');
  return res.json();
}

// ── Voice ────────────────────────────────────────────────────────────

export async function getVoiceOptions() {
  const res = await request('/voice/options');
  return res.json();
}

export async function selectVoice(voice: string) {
  const res = await request('/voice/select', {
    method: 'POST',
    body: JSON.stringify({ voice }),
  });
  return res.json();
}

export async function speak(text: string) {
  const res = await request('/speak', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return res.json();
}

// ── Briefing ─────────────────────────────────────────────────────────

export async function triggerBriefing() {
  const res = await request('/briefing', { method: 'POST' });
  return res.text();
}

// ── STT (Speech-to-Text) ────────────────────────────────────────────

import { File, Paths } from 'expo-file-system';

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunk) as any);
  }
  return btoa(binary);
}

export async function uploadAudio(uri: string): Promise<string> {
  const srcPath = uri.replace('file://', '');
  const src = new File(srcPath);
  const dest = new File(Paths.document, 'stt_upload.m4a');
  await src.copy(dest);
  const buffer = await dest.arrayBuffer();
  await dest.delete();
  const base64 = toBase64(buffer);
  const res = await fetch(`${_baseUrl}/stt/base64`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${_apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio: base64, format: 'm4a' }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text.slice(0, 100)}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Transcription failed');
  return data.text;
}

// ── WebSocket ────────────────────────────────────────────────────────

export function getWebSocketUrl() {
  return _baseUrl.replace(/^http/, 'ws') + '/ws';
}
