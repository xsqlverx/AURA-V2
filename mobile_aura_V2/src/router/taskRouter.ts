import { devLog } from '../utils/devLog';
import type { RouteTarget, MobileCapability } from '../types';

const MOBILE_CAPABILITY_MAP: Record<string, MobileCapability> = {
  'call': 'make_call',
  'phone': 'make_call',
  'ring': 'make_call',
  'text': 'send_sms',
  'sms': 'send_sms',
  'message': 'send_sms',
  'volume': 'set_volume',
  'sound': 'set_volume',
  'open': 'open_app',
  'launch': 'open_app',
  'start': 'open_app',
  'url': 'open_url',
  'website': 'open_url',
  'link': 'open_url',
  'settings': 'open_settings',
  'battery': 'get_battery_level',
  'wifi': 'get_wifi_status',
  'internet': 'get_wifi_status',
};

const PC_CAPABILITY_MAP: Record<string, string> = {
  'search': 'web_search',
  'google': 'web_search',
  'find online': 'web_search',
  'clipboard': 'get_clipboard',
  'copy': 'get_clipboard',
  'paste': 'get_clipboard',
  'music': 'media_control',
  'play': 'media_control',
  'pause': 'media_control',
  'skip': 'media_control',
  'notes': 'get_notes',
  'obsidian': 'obsidian_query',
  'weather': 'get_weather',
};

export interface RouterResult {
  target: RouteTarget;
  capability?: MobileCapability | string;
  confidence: 'high' | 'low';
}

export function classifyMessage(message: string): RouterResult {
  const lower = message.toLowerCase();

  for (const [keyword, capability] of Object.entries(MOBILE_CAPABILITY_MAP)) {
    if (lower.includes(keyword)) {
      devLog.info(`Router: MOBILE match`, { keyword, capability });
      return { target: 'MOBILE', capability, confidence: 'high' };
    }
  }

  for (const [keyword, capability] of Object.entries(PC_CAPABILITY_MAP)) {
    if (lower.includes(keyword)) {
      devLog.info(`Router: PC match`, { keyword, capability });
      return { target: 'PC', capability, confidence: 'high' };
    }
  }

  devLog.info(`Router: CHAT fallthrough`, { message: lower.slice(0, 50) });
  return { target: 'CHAT', confidence: 'low' };
}
