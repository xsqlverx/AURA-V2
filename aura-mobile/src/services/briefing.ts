import {
  getWeather, getTasks, getNowPlaying, getStats,
} from '../api/aura';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeStr(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dateStr(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export type BriefingData = {
  greeting: string;
  time: string;
  date: string;
  weather: string | null;
  tasks: string | null;
  media: string | null;
  system: string | null;
  fullText: string;
};

export async function assembleBriefing(): Promise<BriefingData> {
  const parts: string[] = [];

  const greet = `${greetingByTime()}. It's ${timeStr()}, ${dateStr()}.`;
  parts.push(greet);

  let weather: string | null = null;
  try {
    const data = await getWeather();
    if (data.temp != null) {
      const desc = data.description || data.condition || '';
      weather = `Weather: ${data.temp}°${data.units || 'C'}${desc ? ', ' + desc : ''}.`;
      parts.push(weather);
    }
  } catch {}

  let tasks: string | null = null;
  try {
    const data = await getTasks(todayStr());
    const pending = (data.tasks || []).filter((t: any) => !t.done);
    if (pending.length > 0) {
      const list = pending.slice(0, 5).map((t: any) => {
        const time = t.time ? ` at ${t.time}` : '';
        return `${t.name}${time}`;
      });
      tasks = `You have ${pending.length} task${pending.length > 1 ? 's' : ''} today: ${list.join(', ')}.`;
      parts.push(tasks);
    } else {
      tasks = 'No tasks for today.';
      parts.push(tasks);
    }
  } catch {}

  let media: string | null = null;
  try {
    const data = await getNowPlaying();
    if (data.title) {
      const artist = data.artist ? ` by ${data.artist}` : '';
      media = `Now playing: ${data.title}${artist}.`;
      parts.push(media);
    }
  } catch {}

  let system: string | null = null;
  try {
    const data = await getStats();
    const sysParts: string[] = [];
    if (data.cpu_percent != null) sysParts.push(`CPU ${data.cpu_percent}%`);
    if (data.ram_percent != null) sysParts.push(`RAM ${data.ram_percent}%`);
    if (data.battery_percent != null) sysParts.push(`battery ${data.battery_percent}%`);
    if (sysParts.length > 0) {
      system = `System: ${sysParts.join(', ')}.`;
      parts.push(system);
    }
  } catch {}

  return {
    greeting: greet,
    time: timeStr(),
    date: dateStr(),
    weather,
    tasks,
    media,
    system,
    fullText: parts.join(' '),
  };
}
