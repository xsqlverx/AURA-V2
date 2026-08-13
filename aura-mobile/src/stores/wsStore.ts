import { create } from 'zustand';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'disconnected';

type WsStore = {
  state: OrbState;
  connected: boolean;
  _ws: WebSocket | null;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;
  connect: (url: string) => void;
  disconnect: () => void;
  reconnect: (url: string) => void;
};

let connectToken = 0;

export const useWs = create<WsStore>((set, get) => ({
  state: 'disconnected',
  connected: false,
  _ws: null,
  _reconnectTimer: null,

  connect: (url: string) => {
    const existing = get()._ws;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (existing) {
      existing.onclose = null;
      existing.onerror = null;
      existing.close();
    }

    const token = ++connectToken;
    const wsUrl = url.replace(/^http/, 'ws') + '/ws';
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      set({ state: 'disconnected', connected: false });
      return;
    }

    ws.onopen = () => {
      if (token !== connectToken) return;
      set({ connected: true });
    };

    ws.onmessage = (e) => {
      if (token !== connectToken) return;
      const msg = e.data as string;
      if (msg.startsWith('STATE:')) {
        const s = msg.replace('STATE:', '').trim().toLowerCase() as OrbState;
        if (['idle', 'listening', 'thinking', 'speaking'].includes(s)) {
          set({ state: s });
        }
      }
    };

    ws.onclose = () => {
      if (token !== connectToken) return;
      set({ connected: false, state: 'disconnected', _ws: null });
      const timer = setTimeout(() => {
        if (token === connectToken) {
          get().connect(url);
        }
      }, 3000);
      set({ _reconnectTimer: timer });
    };

    ws.onerror = () => {
      // onclose fires after onerror and handles state + reconnect
    };

    set({ _ws: ws });
  },

  disconnect: () => {
    connectToken++;
    const { _ws, _reconnectTimer } = get();
    if (_reconnectTimer) clearTimeout(_reconnectTimer);
    if (_ws) {
      _ws.onclose = null;
      _ws.onerror = null;
      _ws.close();
    }
    set({ _ws: null, connected: false, state: 'disconnected' });
  },

  reconnect: (url: string) => {
    connectToken++;
    const { _ws, _reconnectTimer } = get();
    if (_reconnectTimer) clearTimeout(_reconnectTimer);
    if (_ws) {
      _ws.onclose = null;
      _ws.onerror = null;
      _ws.close();
    }
    set({ _ws: null, connected: false, state: 'disconnected' });
    get().connect(url);
  },
}));
