import { create } from 'zustand';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'disconnected';

type WsStore = {
  state: OrbState;
  connected: boolean;
  _ws: WebSocket | null;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;
  connect: (url: string) => void;
  disconnect: () => void;
};

export const useWs = create<WsStore>((set, get) => ({
  state: 'disconnected',
  connected: false,
  _ws: null,
  _reconnectTimer: null,

  connect: (url: string) => {
    const existing = get()._ws;
    if (existing) {
      existing.close();
    }

    const wsUrl = url.replace(/^http/, 'ws') + '/ws';
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      set({ state: 'disconnected', connected: false });
      return;
    }

    ws.onopen = () => {
      set({ connected: true });
    };

    ws.onmessage = (e) => {
      const msg = e.data as string;
      if (msg.startsWith('STATE:')) {
        const s = msg.replace('STATE:', '').trim().toLowerCase() as OrbState;
        if (['idle', 'listening', 'thinking', 'speaking'].includes(s)) {
          set({ state: s });
        }
      }
    };

    ws.onclose = () => {
      set({ connected: false, state: 'disconnected', _ws: null });
      const timer = setTimeout(() => {
        const cur = get()._ws;
        if (!cur || cur.readyState === WebSocket.CLOSED) {
          get().connect(url);
        }
      }, 3000);
      set({ _reconnectTimer: timer });
    };

    ws.onerror = () => {
      ws.close();
    };

    set({ _ws: ws });
  },

  disconnect: () => {
    const { _ws, _reconnectTimer } = get();
    if (_reconnectTimer) clearTimeout(_reconnectTimer);
    if (_ws) {
      _ws.onclose = null;
      _ws.close();
    }
    set({ _ws: null, connected: false, state: 'disconnected' });
  },
}));
