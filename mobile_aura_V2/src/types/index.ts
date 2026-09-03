export type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'searching'
  | 'executing'
  | 'success'
  | 'warning'
  | 'error'
  | 'connecting'
  | 'disconnected'
  | 'sleeping'
  | 'updating';

export type RouteTarget = 'MOBILE' | 'PC' | 'CHAT';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  routedTo?: RouteTarget;
}

export interface AppState {
  pcConnected: boolean;
  orbState: OrbState;
  messages: Message[];
  isProcessing: boolean;
}

export type MobileCapability =
  | 'open_app'
  | 'make_call'
  | 'send_sms'
  | 'set_volume'
  | 'open_url'
  | 'open_settings'
  | 'get_battery_level'
  | 'get_wifi_status';

export type PCCapability =
  | 'web_search'
  | 'get_clipboard'
  | 'set_clipboard'
  | 'media_control'
  | 'get_notes'
  | 'get_weather';
