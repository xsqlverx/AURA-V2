import { File, Paths } from 'expo-file-system';
import { pullMobileMemorySync, pushMobileMemorySync } from '../api/aura';

export type SyncCuratedEntry = { category: string; text: string };
export type SyncMemoryEntry = { id: string; text: string; metadata?: any };

type SyncFile = {
  revision: string | null;
  lastSyncedAt: number | null;
  curated: SyncCuratedEntry[];
  memories: SyncMemoryEntry[];
  pendingCurated: SyncCuratedEntry[];
  pendingMemories: { text: string }[];
};

const file = new File(Paths.document, 'mobile_brain_sync.json');

const EMPTY: SyncFile = {
  revision: null,
  lastSyncedAt: null,
  curated: [],
  memories: [],
  pendingCurated: [],
  pendingMemories: [],
};

async function read(): Promise<SyncFile> {
  try {
    if (!file.exists) return { ...EMPTY };
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY };
  }
}

async function write(data: SyncFile): Promise<void> {
  await file.write(JSON.stringify(data, null, 2));
}

export async function getMobileBrainState(): Promise<SyncFile> {
  return read();
}

export async function syncFromDesktop(): Promise<{
  state: SyncFile;
  pushed: number;
}> {
  const data = await pullMobileMemorySync();
  const state = await read();

  const pushed = await pushQueued(state);

  state.revision = data.revision;
  state.lastSyncedAt = Date.now();
  state.curated = data.curated;
  state.memories = data.memories;
  state.pendingCurated = [];
  state.pendingMemories = [];

  await write(state);
  return { state, pushed };
}

async function pushQueued(state: SyncFile): Promise<number> {
  if (!state.pendingCurated.length && !state.pendingMemories.length) return 0;
  const res = await pushMobileMemorySync({
    curated: state.pendingCurated,
    memories: state.pendingMemories,
  });
  const added =
    (res?.added_curated ?? 0) + (res?.added_chroma ?? 0);
  return added;
}

export async function queueCurated(entry: SyncCuratedEntry): Promise<SyncFile> {
  const state = await read();
  state.pendingCurated.push(entry);
  await write(state);
  return state;
}

export async function queueMemory(text: string): Promise<SyncFile> {
  const state = await read();
  state.pendingMemories.push({ text });
  await write(state);
  return state;
}