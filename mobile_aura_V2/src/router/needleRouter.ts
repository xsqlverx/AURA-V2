import { devLog } from '../utils/devLog';
import type { RouteTarget, MobileCapability } from '../types';
import type { RouterResult } from './taskRouter';
import { classifyMessage as keywordClassify } from './taskRouter';

// Re-export for chat.tsx fallback
export { keywordClassify };

let needleModule: typeof import('react-native-needle') | null = null;
let needleReady = false;
let needleInitializing: Promise<boolean> | null = null;

// Lazily import so web/unsupported platforms don't crash on require
async function getNeedle(): Promise<typeof import('react-native-needle') | null> {
  if (needleModule) return needleModule;
  try {
    needleModule = await import('react-native-needle');
    return needleModule;
  } catch (e) {
    devLog.warn('Needle import failed', e);
    return null;
  }
}

export function isNeedleSupported(): boolean {
  // Synchronous fast-path: if module not loaded yet, assume unsupported until init
  // Real check is async via getNeedle()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-needle');
    return !!mod.needleSupported;
  } catch {
    return false;
  }
}

const NEEDLE_TOOLS = [
  {
    name: 'make_call',
    description: 'Initiate a phone call to a number',
    parameters: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Phone number to call, include country code if present' },
      },
      required: ['number'],
    },
  },
  {
    name: 'send_sms',
    description: 'Send an SMS text message',
    parameters: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Recipient phone number' },
        message: { type: 'string', description: 'Text message body' },
      },
      required: ['number', 'message'],
    },
  },
  {
    name: 'open_url',
    description: 'Open a website URL in browser',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to open, must start with https://' },
      },
      required: ['url'],
    },
  },
  {
    name: 'open_app',
    description: 'Open an installed app by package name or common name',
    parameters: {
      type: 'object',
      properties: {
        package: { type: 'string', description: 'App package like com.whatsapp or common name like whatsapp, youtube, chrome' },
      },
      required: ['package'],
    },
  },
  {
    name: 'set_volume',
    description: 'Set device volume',
    parameters: {
      type: 'object',
      properties: {
        stream: { type: 'string', enum: ['music', 'ring', 'alarm', 'notification', 'system', 'call'] },
        volume: { type: 'integer', minimum: 0, maximum: 15 },
      },
      required: ['stream', 'volume'],
    },
  },
  {
    name: 'get_battery_level',
    description: 'Get battery percentage and charging status',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_wifi_status',
    description: 'Get WiFi connection status and SSID',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'open_settings',
    description: 'Open system settings',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];

const TOOL_TO_ROUTE: Record<string, { target: RouteTarget; capability: MobileCapability | string }> = {
  make_call: { target: 'MOBILE', capability: 'make_call' },
  send_sms: { target: 'MOBILE', capability: 'send_sms' },
  open_url: { target: 'MOBILE', capability: 'open_url' },
  open_app: { target: 'MOBILE', capability: 'open_app' },
  set_volume: { target: 'MOBILE', capability: 'set_volume' },
  get_battery_level: { target: 'MOBILE', capability: 'get_battery_level' },
  get_wifi_status: { target: 'MOBILE', capability: 'get_wifi_status' },
  open_settings: { target: 'MOBILE', capability: 'open_settings' },
};

export async function initNeedle(): Promise<boolean> {
  if (needleReady) return true;
  if (needleInitializing) return needleInitializing;
  needleInitializing = (async () => {
    const needle = await getNeedle();
    if (!needle) return false;
    if (!needle.needleSupported) {
      devLog.info('Needle not supported on this device (32-bit or iOS), using keyword fallback');
      return false;
    }
    try {
      const loaded = await needle.loadBundledModel();
      if (!loaded) {
        devLog.warn('Needle loadBundledModel failed');
        return false;
      }
      await needle.configure('You are a device tool router. Only emit tool calls that are grounded in the user message.', NEEDLE_TOOLS as any);
      needleReady = true;
      devLog.info('Needle ready (arm64-v8a)');
      return true;
    } catch (e) {
      devLog.error('Needle init failed', e);
      return false;
    }
  })();
  return needleInitializing;
}

export function isNeedleReady(): boolean {
  return needleReady;
}

/**
 * Try Needle routing. Returns null to signal "decline / ungrounded / unsupported -> fallback to keyword".
 * Gating uses BOTH confidence and ungroundedFields per Claude's binding notes.
 */
export async function tryNeedleRoute(message: string): Promise<RouterResult | null> {
  const needle = await getNeedle();
  if (!needle || !needle.needleSupported || !needleReady) return null;

  // Segment leading unrelated clauses: take last clause after comma/also/and then
  // Mitigates "remind me to..., also ..." decline bug
  const segments = message.split(/\b(?:also|and then|then)\b|,|;/i);
  const query = segments[segments.length - 1].trim() || message;

  try {
    const raw = await needle.complete(query);
    if (!raw) return null;

    const envelope = needle.parseEnvelope(raw) as any;
    if (!envelope) return null;

    // Check gating signals: ungrounded fields first (stronger than confidence)
    const ungrounded: string[] = needle.ungroundedFields(raw) as any;
    if (ungrounded.length > 0) {
      devLog.info('Needle ungrounded fields, fallback', { ungrounded, raw: raw.slice(0, 200) });
      return null;
    }

    // Confidence gating (per Claude: not authoritative, but still log)
    const confidence = envelope.confidence ?? envelope?.validation?.confidence ?? 0;
    if (typeof confidence === 'number' && confidence < 0.7) {
      devLog.info('Needle low confidence, fallback', { confidence });
      return null;
    }

    const calls = envelope.function_calls;
    if (!Array.isArray(calls) || calls.length === 0) {
      // Empty array is explicit decline per docs
      return null;
    }

    const first = calls[0];
    const toolName = first.name;
    const mapping = TOOL_TO_ROUTE[toolName];
    if (!mapping) {
      devLog.warn(`Needle returned unknown tool: ${toolName}`);
      return null;
    }

    // Validate string fields don't over-capture (phone/url sanity)
    if (toolName === 'make_call' || toolName === 'send_sms') {
      const num = first.arguments?.number as string;
      if (num && /[a-zA-Z]{3,}/.test(num) && !/^\+\d/.test(num.trim())) {
        devLog.info('Needle over-capture on number, fallback');
        return null;
      }
    }

    devLog.info('Needle routed', { toolName, confidence, ungrounded });
    return { target: mapping.target, capability: mapping.capability as any, confidence: 'high' };
  } catch (e) {
    devLog.error('Needle complete failed, fallback', e);
    return null;
  }
}
