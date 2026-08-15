import { useSettings, OPENROUTER_BASE_URL } from '../stores/settingsStore';
import { getMobileBrainState } from '../services/memorySync';
import { executeToolCall, type ToolCall, requiresConfirmation } from './toolExecutor';

const MOBILE_AURA_PERSONA = `You are Aura — the MOBILE version, running on the user's phone. Warm, sharp, direct — never robotic.

You can: chat and answer questions, open any app (WhatsApp, Instagram, Settings, Camera), open phone settings (wifi, bluetooth, display, battery, apps, developer, about, network, location, security, storage, nfc), send WhatsApp messages and SMS, make calls, open URLs.

To DO something on the phone, output a tool_call block:
\`\`\`tool_call
{"name":"open_app","args":{"package":"com.whatsapp"}}
{"name":"open_settings","args":{"target":"wifi"}}
{"name":"send_whatsapp","args":{"phone":"+1234567890","message":"Hello!"}}
{"name":"send_sms","args":{"phone":"+1234567890","message":"Hello!"}}
{"name":"make_call","args":{"phone":"+1234567890"}}
{"name":"open_url","args":{"url":"https://example.com"}}
\`\`\`

Explain before calling. Multiple calls = multiple blocks.

You CANNOT access the PC (files, system stats, Windows controls, Obsidian vault, desktop apps). For PC-only requests, say: "That needs the PC version — I'll hand it off."

Always respond in English. Use the memories below to be personal and helpful.`;

function buildSystemPrompt(curated: { category: string; text: string }[], memories: { text: string }[]): string {
  const parts = [MOBILE_AURA_PERSONA];
  if (curated.length) {
    parts.push(`\n## What you know about the user\n${curated.map((c) => `- [${c.category}] ${c.text}`).join('\n')}`);
  }
  if (memories.length) {
    parts.push(`\n## Recent memories\n${memories.slice(-8).map((m) => `- ${m.text}`).join('\n')}`);
  }
  return parts.join('\n');
}

const TOOL_CALL_RE = /```tool_call\s*\n(\{.*?\})\s*\n```/gs;

export function extractToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  let match;
  while ((match = TOOL_CALL_RE.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name && parsed.args) {
        calls.push({ name: parsed.name, args: parsed.args });
      }
    } catch {}
  }
  return calls;
}

export function cleanToolCallBlocks(text: string): string {
  return text.replace(TOOL_CALL_RE, '').trim();
}

const TIMEOUT_MS = 60000;

export class DailyCapExceeded extends Error {
  constructor() {
    super("Aura's free brain hit its daily request limit (50 requests/day).");
    this.name = 'DailyCapExceeded';
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface BrainResponse {
  text: string;
  toolCalls: ToolCall[];
}

export async function routeMessage(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<BrainResponse> {
  const { localBrainMode, llmApiKey, llmModel } = useSettings.getState();

  if (localBrainMode && llmApiKey) {
    return runIndependentBrain(message, history, onChunk, signal);
  }
  return runPCBrain(message, history, onChunk, signal);
}

async function runPCBrain(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<BrainResponse> {
  const { chat } = await import('../api/aura');
  let fullText = '';
  await chat(message, history, 'deep', (chunk) => {
    fullText += chunk;
    onChunk(fullText);
  }, signal);
  return { text: fullText, toolCalls: [] };
}

async function runIndependentBrain(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<BrainResponse> {
  const { llmApiKey, llmModel } = useSettings.getState();
  if (!llmApiKey) throw new Error('No API key configured. Add your OpenRouter key in Settings.');

  const models = [...new Set([llmModel, 'openrouter/free'])];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await streamBrainModel(model, message, history, onChunk, signal);
    } catch (e: any) {
      if (e instanceof DailyCapExceeded) throw e;
      lastError = e;
      await sleep(800);
    }
  }

  if (lastError) console.warn('All brain models failed — falling back to PC brain:', lastError);
  return runPCBrain(message, history, onChunk, signal);
}

async function streamBrainModel(
  model: string,
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<BrainResponse> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await attemptStream(model, message, history, onChunk, signal);
    } catch (e: any) {
      if (e instanceof DailyCapExceeded) throw e;
      if (attempt === 0 && e?.retryAfterMs != null) {
        await sleep(e.retryAfterMs);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Brain request failed repeatedly');
}

async function attemptStream(
  model: string,
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<BrainResponse> {
  const { llmApiKey } = useSettings.getState();
  const brain = await getMobileBrainState();
  const systemContent = buildSystemPrompt(brain.curated, brain.memories);

  const messages = [
    { role: 'system', content: systemContent },
    ...history.slice(-6),
    { role: 'user', content: message },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmApiKey}`,
        'HTTP-Referer': 'https://aura-mobile.app',
        'X-Title': 'Aura Mobile',
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429) {
        const remaining = res.headers.get('X-RateLimit-Remaining');
        const limit = res.headers.get('X-RateLimit-Limit');
        const retryAfter = res.headers.get('Retry-After');
        const text = await res.text().catch(() => '');
        const isDaily = remaining === '0' && (limit === '50' || limit === '1000' || text.includes('day'));
        if (isDaily) throw new DailyCapExceeded();
        const err: any = new Error(`Rate limited on ${model}: ${text.slice(0, 100)}`);
        err.retryAfterMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 5000) : 1500;
        throw err;
      }
      const text = await res.text().catch(() => '');
      throw new Error(`${res.status}: ${text.slice(0, 120)}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error || parsed.choices?.[0]?.finish_reason === 'error') {
            const err: any = new Error(`Model ${model} stopped mid-stream`);
            err.retryAfterMs = 1500;
            throw err;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(cleanToolCallBlocks(fullText));
          }
        } catch (e: any) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }

    const toolCalls = extractToolCalls(fullText);
    return { text: cleanToolCallBlocks(fullText), toolCalls };
  } finally {
    clearTimeout(timer);
  }
}

export async function executeToolCalls(calls: ToolCall[]): Promise<void> {
  for (const call of calls) {
    if (requiresConfirmation(call)) {
      const confirmed = await new Promise<boolean>((resolve) => {
        const { Alert } = require('react-native');
        Alert.alert(
          'Confirm Action',
          `AURA wants to ${describeToolCall(call)}. Allow?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Allow', onPress: () => resolve(true) },
          ],
        );
      });
      if (!confirmed) continue;
    }
    await executeToolCall(call);
  }
}

function describeToolCall(call: ToolCall): string {
  switch (call.name) {
    case 'open_app': return `open ${call.args.package}`;
    case 'open_settings': return `open ${call.args.target} settings`;
    case 'send_whatsapp': return `send a WhatsApp to ${call.args.phone}`;
    case 'send_sms': return `send an SMS to ${call.args.phone}`;
    case 'make_call': return `call ${call.args.phone}`;
    case 'open_url': return `open ${call.args.url}`;
    default: return `run ${call.name}`;
  }
}
