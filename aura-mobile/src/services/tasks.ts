import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aura from '../api/aura';

const STORAGE_KEY = 'aura_tasks_mirror';

export type LocalTask = {
  id: string;
  name: string;
  category?: string;
  color?: string;
  time?: string;
  date?: string;
  done: boolean;
  createdAt: number;
  synced: boolean;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadLocal(): Promise<LocalTask[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocal(tasks: LocalTask[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getLocalTasks(date?: string): Promise<LocalTask[]> {
  const all = await loadLocal();
  const d = date || todayStr();
  return all.filter((t) => t.date === d);
}

export async function getLocalTaskById(id: string): Promise<LocalTask | undefined> {
  const all = await loadLocal();
  return all.find((t) => t.id === id);
}

export async function addLocalTask(task: {
  name: string;
  category?: string;
  color?: string;
  time?: string;
  date?: string;
}): Promise<LocalTask> {
  const all = await loadLocal();
  const newTask: LocalTask = {
    id: makeId(),
    name: task.name,
    category: task.category || 'mobile',
    color: task.color || 'cyan',
    time: task.time,
    date: task.date || todayStr(),
    done: false,
    createdAt: Date.now(),
    synced: false,
  };
  all.push(newTask);
  await saveLocal(all);
  return newTask;
}

export async function completeLocalTask(id: string): Promise<LocalTask | undefined> {
  const all = await loadLocal();
  const task = all.find((t) => t.id === id);
  if (!task) return undefined;
  task.done = true;
  task.synced = false;
  await saveLocal(all);
  return task;
}

export async function deleteLocalTask(id: string): Promise<boolean> {
  const all = await loadLocal();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await saveLocal(all);
  return true;
}

export async function updateLocalTask(id: string, patch: Partial<Pick<LocalTask, 'name' | 'done' | 'time' | 'date'>>): Promise<LocalTask | undefined> {
  const all = await loadLocal();
  const task = all.find((t) => t.id === id);
  if (!task) return undefined;
  Object.assign(task, patch, { synced: false });
  await saveLocal(all);
  return task;
}

export async function syncTasks(): Promise<{ pushed: number; pulled: number; errors: number }> {
  let pushed = 0;
  let pulled = 0;
  let errors = 0;

  try {
    const pcRes = await aura.getTasks();
    const pcTasks = (pcRes.tasks || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      color: t.color,
      time: t.time,
      date: t.date,
      done: t.done,
      createdAt: 0,
      synced: true,
    }));

    const local = await loadLocal();
    const unsynced = local.filter((t) => !t.synced);

    for (const lt of unsynced) {
      try {
        if (lt.done && pcTasks.find((pt: any) => pt.id === lt.id)) {
          await aura.updateTask(lt.id, { done: true });
        } else if (!pcTasks.find((pt: any) => pt.id === lt.id)) {
          await aura.createTask({
            name: lt.name,
            category: lt.category,
            color: lt.color,
            time: lt.time,
            date: lt.date,
            done: lt.done,
          });
        }
        lt.synced = true;
        pushed++;
      } catch {
        errors++;
      }
    }

    for (const pt of pcTasks) {
      const existing = local.find((lt) => lt.id === pt.id);
      if (!existing) {
        local.push({ ...pt, createdAt: Date.now(), synced: true });
        pulled++;
      } else if (existing.synced) {
        existing.name = pt.name;
        existing.done = pt.done;
        existing.time = pt.time;
        existing.date = pt.date;
        existing.category = pt.category;
        existing.color = pt.color;
      }
    }

    await saveLocal(local);
  } catch {
    errors++;
  }

  return { pushed, pulled, errors };
}

export async function clearLocalTasks(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
