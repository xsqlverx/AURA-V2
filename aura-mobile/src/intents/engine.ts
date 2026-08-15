import {
  getTasks, createTask, updateTask,
  getStats, getWeather, getNews,
  getVolume, setVolume, muteAudio,
  mediaControl, getNowPlaying,
  systemLock, systemSleep, systemShutdown, systemRestart, systemCancelShutdown,
  clipboardCopy, clipboardPaste,
  inputType, inputKey, inputHotkey,
  getVoiceOptions, speak as pcSpeak,
} from '../api/aura';
import { openApp, openSettings } from '../services/phoneControl';
import {
  getLocalTasks, addLocalTask, completeLocalTask,
} from '../services/tasks';
import {
  scheduleReminder, timeTrigger, cancelAllReminders, listReminders,
} from '../services/reminders';
import { assembleBriefing } from '../services/briefing';

export type CommandResult = {
  replyText: string;
  spokenText?: string;
  phase?: 'executing_tool' | 'generating';
};

type IntentPattern = {
  regex: RegExp;
  kind: string;
  extract?: (match: RegExpMatchArray) => Record<string, string>;
};

const GREETINGS = [
  'Hey. What\'s up?',
  'Hey there.',
  'What do you need?',
  'I\'m here.',
  'Yes?',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function timeStr(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dateStr(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function hourOfDay(): number {
  return new Date().getHours();
}

function greetingByTime(): string {
  const h = hourOfDay();
  if (h < 12) return pick(['Good morning.', 'Morning.', 'Rise and shine.']);
  if (h < 17) return pick(['Good afternoon.', 'Afternoon.']);
  return pick(['Good evening.', 'Evening.', 'Hey.']);
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ── Greetings ─────────────────────────────────────────────────────
  {
    regex: /^(?:hi|hey|hello|yo|sup|what'?s up|how are you|good (?:morning|afternoon|evening))$/i,
    kind: 'greeting',
  },

  // ── Time / Date ───────────────────────────────────────────────────
  {
    regex: /^(?:what(?:'s| is)? (?:the )?time|current time|tell me the time|what time is it)/i,
    kind: 'time',
  },
  {
    regex: /^(?:what(?:'s| is)? (?:the )?(?:date|day)|what day is it|today(?:'s date)?|current date)/i,
    kind: 'date',
  },

  // ── Briefing ──────────────────────────────────────────────────────
  {
    regex: /^(?:briefing|daily briefing|morning briefing|what(?:'s| is) (?:the )?briefing|run briefing|give me (?:my )?briefing|start (?:my )?day)/i,
    kind: 'briefing',
  },

  // ── Phone: open app ───────────────────────────────────────────────
  {
    regex: /^(?:open|launch|start|go to|show)\s+(.+)/i,
    kind: 'open_app',
    extract: (m) => ({ app: m[1].trim() }),
  },

  // ── Phone: open settings ──────────────────────────────────────────
  {
    regex: /^open\s+(wifi|bluetooth|display|sound|battery|storage|apps|security|location|developer|about|network|airplane|nfc)\s*(?:settings?)?$/i,
    kind: 'open_settings',
    extract: (m) => ({ target: m[1].toLowerCase() }),
  },

  // ── Volume ────────────────────────────────────────────────────────
  {
    regex: /^(?:volume up|turn volume up|increase volume|louder)/i,
    kind: 'volume_up',
  },
  {
    regex: /^(?:volume down|turn volume down|decrease volume|quieter|softer)/i,
    kind: 'volume_down',
  },
  {
    regex: /^(?:set volume to? (\d+)|volume (\d+)|volume at (\d+))/i,
    kind: 'volume_set',
    extract: (m) => ({ level: m[1] || m[2] || m[3] }),
  },
  {
    regex: /^(?:mute|unmute|toggle mute)/i,
    kind: 'mute_toggle',
  },
  {
    regex: /^(?:what(?:'s| is) (?:the )?volume|volume level)/i,
    kind: 'volume_get',
  },

  // ── Media ─────────────────────────────────────────────────────────
  {
    regex: /^(?:play(?:\s+(?:music|something|a song|on spotify))?)$/i,
    kind: 'media_play',
  },
  {
    regex: /^(?:pause(?:\s+(?:music|playback))?|stop(?:\s+(?:music|playback))?)/i,
    kind: 'media_pause',
  },
  {
    regex: /^(?:next(?:\s+(?:track|song|track))?|skip(?:\s+(?:track|song))?)/i,
    kind: 'media_next',
  },
  {
    regex: /^(?:previous(?:\s+(?:track|song))?|go back|last(?:\s+(?:track|song))?)/i,
    kind: 'media_previous',
  },
  {
    regex: /^(?:what(?:'s| is) (?:playing|on|the song)|now playing|what song|what music)/i,
    kind: 'now_playing',
  },

  // ── System ────────────────────────────────────────────────────────
  {
    regex: /^(?:lock(?:\s+(?:the\s+)?(?:pc|computer))?|lock\s+pc)/i,
    kind: 'system_lock',
  },
  {
    regex: /^(?:sleep(?:\s+(?:the\s+)?(?:pc|computer))?|put (?:pc|computer) to sleep)/i,
    kind: 'system_sleep',
  },
  {
    regex: /^(?:shut\s*down|power off|turn off(?:\s+(?:the\s+)?(?:pc|computer))?)/i,
    kind: 'system_shutdown',
  },
  {
    regex: /^(?:restart|reboot|restart(?:\s+(?:the\s+)?(?:pc|computer))?)/i,
    kind: 'system_restart',
  },
  {
    regex: /^(?:cancel(?:\s+(?:the\s+)?)?(?:shutdown|power off|restart))/i,
    kind: 'system_cancel',
  },

  // ── PC Stats ──────────────────────────────────────────────────────
  {
    regex: /^(?:cpu|ram|memory|disk|battery|uptime|system stats|pc status|how(?:'s| is) (?:the )?(?:pc|computer|system)|computer status)/i,
    kind: 'pc_stats',
  },

  // ── Weather ───────────────────────────────────────────────────────
  {
    regex: /^(?:what(?:'s| is) (?:the )?weather|weather(?:\s+(?:now|today|forecast))?|is it raining|forecast)/i,
    kind: 'weather',
  },

  // ── News ──────────────────────────────────────────────────────────
  {
    regex: /^(?:news|what(?:'s| is) (?:happening|new|in the news)|today(?:'s)? news|headlines)/i,
    kind: 'news',
  },

  // ── Tasks ─────────────────────────────────────────────────────────
  {
    regex: /^(?:what(?:'s| is) (?:on|scheduled|upcoming)|my tasks|today(?:'s)? tasks|tasks for today|what do I have)/i,
    kind: 'tasks_list',
  },
  {
    regex: /^(?:add (?:a )?task[:\s]+(.+?))(?:\s+(?:at|for|by)\s+(.+))?$/i,
    kind: 'task_add',
    extract: (m) => ({ name: m[1].trim(), time: m[2]?.trim() }),
  },
  {
    regex: /^(?:complete|finish|done with|mark done)[:\s]+(.+)$/i,
    kind: 'task_complete',
    extract: (m) => ({ name: m[1].trim() }),
  },

  // ── Reminders ────────────────────────────────────────────────────
  {
    regex: /^(?:remind me to|reminder[:\s]+)(.+?)(?:\s+(?:at|in|by)\s+(.+))?$/i,
    kind: 'reminder_add',
    extract: (m) => ({ text: m[1].trim(), time: m[2]?.trim() }),
  },
  {
    regex: /^(?:cancel (?:all )?reminders|clear reminders)/i,
    kind: 'reminder_cancel_all',
  },
  {
    regex: /^(?:what(?:'s| are) (?:my )?reminders|list reminders)/i,
    kind: 'reminder_list',
  },

  // ── Clipboard ─────────────────────────────────────────────────────
  {
    regex: /^(?:copy|clipboard)\s+(.+?)(?:\s+to clipboard)?$/i,
    kind: 'clipboard_copy',
    extract: (m) => ({ text: m[1].trim() }),
  },
  {
    regex: /^(?:paste|paste from clipboard|clipboard paste)/i,
    kind: 'clipboard_paste',
  },

  // ── Input ─────────────────────────────────────────────────────────
  {
    regex: /^(?:type|enter|write)\s+(.+)/i,
    kind: 'input_type',
    extract: (m) => ({ text: m[1].trim() }),
  },
  {
    regex: /^(?:press|hit)\s+(.+)/i,
    kind: 'input_key',
    extract: (m) => ({ key: m[1].trim() }),
  },

  // ── Voice ─────────────────────────────────────────────────────────
  {
    regex: /^(?:what(?:'s| is) (?:your )?voice|which voice|voice options)/i,
    kind: 'voice_options',
  },
  {
    regex: /^(?:use|switch to|set voice)\s+(.+)/i,
    kind: 'voice_select',
    extract: (m) => ({ voice: m[1].trim().toUpperCase() }),
  },

  // ── PC Speak ──────────────────────────────────────────────────────
  {
    regex: /^(?:say|speak|read aloud|say aloud)\s+(.+)/i,
    kind: 'pc_speak',
    extract: (m) => ({ text: m[1].trim() }),
  },
];

export function matchIntent(text: string): IntentPattern | null {
  const trimmed = text.trim();
  for (const pattern of INTENT_PATTERNS) {
    if (pattern.regex.test(trimmed)) return pattern;
  }
  return null;
}

function parseTimeInput(input: string): string | null {
  const lower = input.toLowerCase().trim();

  const absMatch = lower.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
  if (absMatch) {
    let h = parseInt(absMatch[1], 10);
    const m = absMatch[2] ? parseInt(absMatch[2], 10) : 0;
    const ampm = absMatch[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (!ampm && h >= 1 && h <= 7) h += 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const relMatch = lower.match(/in (\d+)\s*(min|minute|hour|hr)/);
  if (relMatch) {
    const n = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    const d = new Date();
    if (unit.startsWith('hour') || unit === 'hr') d.setHours(d.getHours() + n);
    else d.setMinutes(d.getMinutes() + n);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return null;
}

export async function executeIntent(kind: string, params: Record<string, string>): Promise<CommandResult> {
  try {
    switch (kind) {
      case 'greeting':
        return { replyText: hourOfDay() < 17 ? greetingByTime() : pick(GREETINGS) };

      case 'time':
        return { replyText: `It's ${timeStr()}.` };

      case 'date':
        return { replyText: `Today is ${dateStr()}.` };

      case 'briefing': {
        const data = await assembleBriefing();
        return { replyText: data.fullText, spokenText: data.fullText };
      }

      case 'open_app': {
        const app = params.app || '';
        const success = await openApp(app);
        return { replyText: success ? `Opening ${app}.` : `Couldn't open ${app}.` };
      }

      case 'open_settings': {
        const target = params.target || '';
        await openSettings(target);
        return { replyText: `Opening ${target} settings.` };
      }

      case 'volume_up': {
        const data = await getVolume();
        const cur = data.level ?? 50;
        const next = Math.min(100, cur + 10);
        await setVolume(next);
        return { replyText: `Volume at ${next}%.` };
      }

      case 'volume_down': {
        const data = await getVolume();
        const cur = data.level ?? 50;
        const next = Math.max(0, cur - 10);
        await setVolume(next);
        return { replyText: `Volume at ${next}%.` };
      }

      case 'volume_set': {
        const level = Math.min(100, Math.max(0, parseInt(params.level || '50', 10)));
        await setVolume(level);
        return { replyText: `Volume set to ${level}%.` };
      }

      case 'mute_toggle': {
        const data = await getVolume();
        const muted = !data.muted;
        await muteAudio(muted);
        return { replyText: muted ? 'Muted.' : 'Unmuted.' };
      }

      case 'volume_get': {
        const data = await getVolume();
        return { replyText: `Volume is at ${data.level ?? '?'}%.${data.muted ? ' (Muted)' : ''}` };
      }

      case 'media_play': {
        await mediaControl('play');
        return { replyText: 'Playing.' };
      }

      case 'media_pause': {
        await mediaControl('pause');
        return { replyText: 'Paused.' };
      }

      case 'media_next': {
        await mediaControl('next');
        return { replyText: 'Next track.' };
      }

      case 'media_previous': {
        await mediaControl('previous');
        return { replyText: 'Previous track.' };
      }

      case 'now_playing': {
        const data = await getNowPlaying();
        if (data.title) {
          const artist = data.artist ? ` by ${data.artist}` : '';
          const app = data.app ? ` (${data.app})` : '';
          return { replyText: `Now playing: ${data.title}${artist}${app}.` };
        }
        return { replyText: 'Nothing is playing right now.' };
      }

      case 'system_lock': {
        await systemLock();
        return { replyText: 'PC is locked.' };
      }

      case 'system_sleep': {
        await systemSleep();
        return { replyText: 'PC is going to sleep.' };
      }

      case 'system_shutdown': {
        await systemShutdown(20);
        return { replyText: 'Shutting down in 20 seconds.' };
      }

      case 'system_restart': {
        await systemRestart(30);
        return { replyText: 'Restarting in 30 seconds.' };
      }

      case 'system_cancel': {
        await systemCancelShutdown();
        return { replyText: 'Shutdown cancelled.' };
      }

      case 'pc_stats': {
        const data = await getStats();
        const parts: string[] = [];
        if (data.cpu_percent != null) parts.push(`CPU at ${data.cpu_percent}%`);
        if (data.ram_percent != null) parts.push(`RAM at ${data.ram_percent}%`);
        if (data.disk_percent != null) parts.push(`disk at ${data.disk_percent}%`);
        if (data.battery_percent != null) parts.push(`battery at ${data.battery_percent}%`);
        if (data.uptime) parts.push(`uptime ${data.uptime}`);
        return { replyText: parts.length ? parts.join(', ') + '.' : 'No stats available.' };
      }

      case 'weather': {
        const data = await getWeather();
        if (data.temp != null) {
          const desc = data.description || data.condition || '';
          const loc = data.location ? ` in ${data.location}` : '';
          return { replyText: `Currently ${data.temp}°${data.units || 'C'}${desc ? ', ' + desc : ''}${loc}.` };
        }
        return { replyText: 'Weather data unavailable right now.' };
      }

      case 'news': {
        const data = await getNews(3);
        const items = data.articles || data.headlines || data.news || [];
        if (items.length === 0) return { replyText: 'No recent news.' };
        const headlines = items.slice(0, 3).map((a: any) => a.title).filter(Boolean);
        if (headlines.length === 0) return { replyText: 'No recent news.' };
        return { replyText: `Top headlines: ${headlines.join('. ')}.` };
      }

      case 'tasks_list': {
        let tasks: { name: string; time?: string; done?: boolean }[] = [];
        try {
          const data = await getTasks(todayStr());
          tasks = (data.tasks || []).filter((t: any) => !t.done);
        } catch {
          const local = await getLocalTasks(todayStr());
          tasks = local.filter((t) => !t.done);
        }
        if (tasks.length === 0) return { replyText: 'No tasks for today.' };
        const list = tasks.slice(0, 5).map((t: any) => {
          const time = t.time ? ` at ${t.time}` : '';
          return `${t.name}${time}`;
        });
        return {
          replyText: `${tasks.length} task${tasks.length > 1 ? 's' : ''} today: ${list.join(', ')}.`,
        };
      }

      case 'task_add': {
        const time = params.time ? parseTimeInput(params.time) : undefined;
        const task = {
          name: params.name,
          category: 'mobile',
          color: 'cyan',
          date: todayStr(),
          time: time || undefined,
          done: false,
        };
        try {
          await createTask(task);
        } catch {
          await addLocalTask(task);
        }
        const timeStr2 = time ? ` at ${time}` : '';
        return { replyText: `Added: ${params.name}${timeStr2}.` };
      }

      case 'task_complete': {
        let match: any = null;
        try {
          const data = await getTasks(todayStr());
          match = (data.tasks || []).find((t: any) =>
            !t.done && t.name.toLowerCase().includes(params.name.toLowerCase()),
          );
          if (match) await updateTask(match.id, { done: true });
        } catch {
          const local = await getLocalTasks(todayStr());
          match = local.find((t) =>
            !t.done && t.name.toLowerCase().includes(params.name.toLowerCase()),
          );
          if (match) await completeLocalTask(match.id);
        }
        if (!match) return { replyText: `Couldn't find "${params.name}" in today's tasks.` };
        return { replyText: `Marked "${match.name}" as done.` };
      }

      case 'reminder_add': {
        const time = params.time ? parseTimeInput(params.time) : null;
        if (!time) return { replyText: 'When should I remind you? Say "remind me to X at 3pm" or "remind me to X in 30 minutes".' };
        const [h, m] = time.split(':').map(Number);
        const trigger = timeTrigger(new Date(Date.now() + ((h * 60 + m - (new Date().getHours() * 60 + new Date().getMinutes())) * 60 * 1000)));
        if (!trigger) return { replyText: 'That time has already passed.' };
        const id = await scheduleReminder({
          id: `rem-${Date.now()}`,
          title: 'Aura Reminder',
          body: params.text,
          trigger,
        });
        return { replyText: `Reminding you to ${params.text} at ${time.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
          const hr = parseInt(h, 10);
          const ampm = hr >= 12 ? 'PM' : 'AM';
          const h12 = hr % 12 || 12;
          return `${h12}:${m} ${ampm}`;
        })}.` };
      }

      case 'reminder_cancel_all': {
        await cancelAllReminders();
        return { replyText: 'All reminders cancelled.' };
      }

      case 'reminder_list': {
        const reminders = await listReminders();
        if (reminders.length === 0) return { replyText: 'No active reminders.' };
        const list = reminders.slice(0, 5).map((r) => {
          const trigger = r.trigger as any;
          if (trigger?.date) return `${r.content.body} at ${new Date(trigger.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
          if (trigger?.seconds) return `${r.content.body} in ${Math.round(trigger.seconds / 60)} min`;
          return r.content.body;
        });
        return { replyText: `${reminders.length} reminder${reminders.length > 1 ? 's' : ''}: ${list.join(', ')}.` };
      }

      case 'clipboard_copy': {
        await clipboardCopy(params.text);
        return { replyText: 'Copied to clipboard.' };
      }

      case 'clipboard_paste': {
        const data = await clipboardPaste();
        return { replyText: data.text ? `Clipboard: ${data.text.slice(0, 200)}` : 'Clipboard is empty.' };
      }

      case 'input_type': {
        await inputType(params.text);
        return { replyText: `Typing: ${params.text.slice(0, 50)}.` };
      }

      case 'input_key': {
        const key = params.key.toLowerCase();
        const KEY_MAP: Record<string, string[]> = {
          enter: ['Enter'], return: ['Enter'], tab: ['Tab'], escape: ['Escape'], esc: ['Escape'],
          backspace: ['Backspace'], delete: ['Delete'], space: ['Space'],
          'ctrl+c': ['ControlLeft', 'KeyC'], 'ctrl+v': ['ControlLeft', 'KeyV'],
          'ctrl+z': ['ControlLeft', 'KeyZ'], 'ctrl+x': ['ControlLeft', 'KeyX'],
          'alt+tab': ['AltLeft', 'Tab'], 'alt+f4': ['AltLeft', 'F4'],
        };
        const keys = KEY_MAP[key] || [key];
        await inputHotkey(keys);
        return { replyText: `Pressed ${params.key}.` };
      }

      case 'voice_options': {
        const data = await getVoiceOptions();
        const voices = data.voices || data.options || [];
        return { replyText: `Available voices: ${voices.join(', ')}.` };
      }

      case 'voice_select': {
        const voice = params.voice;
        try {
          const { selectVoice } = await import('../api/aura');
          await selectVoice(voice);
          return { replyText: `Voice set to ${voice}.` };
        } catch {
          return { replyText: `Couldn't set voice to ${voice}.` };
        }
      }

      case 'pc_speak': {
        await pcSpeak(params.text);
        return { replyText: params.text, spokenText: params.text };
      }

      default:
        return { replyText: 'Unknown command.' };
    }
  } catch (e: any) {
    const msg = e?.message || 'Command failed';
    if (msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('abort')) {
      return { replyText: 'PC is offline — can\'t reach the computer.' };
    }
    return { replyText: `Error: ${msg.slice(0, 100)}` };
  }
}

export async function handleCommand(text: string): Promise<CommandResult | null> {
  const intent = matchIntent(text);
  if (!intent) return null;
  const params = intent.extract?.(text.match(intent.regex)!) || {};
  return executeIntent(intent.kind, params);
}