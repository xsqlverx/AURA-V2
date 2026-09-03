import { useSettingsStore, OPENROUTER_BASE_URL } from '../store/settingsStore';

const AURA_SYSTEM_PROMPT = `You are AURA, a personal AI assistant running on the user's phone. You are concise, direct, and helpful. You speak naturally — no filler, no fluff.

You can call tools by writing a tool_call block like this:
\`\`\`tool_call
{"tool": "tool_name", "params": {"key": "value"}}
\`\`\`

Available tools:
- open_app: {"tool": "open_app", "params": {"package": "com.package.name"}}
- make_call: {"tool": "make_call", "params": {"number": "+1234567890"}}
- send_sms: {"tool": "send_sms", "params": {"number": "+1234567890", "message": "text"}}
- open_url: {"tool": "open_url", "params": {"url": "https://example.com"}}
- set_reminder: {"tool": "set_reminder", "params": {"text": "reminder text", "time": "ISO string"}}

If the user asks something that doesn't need a tool, just respond normally in plain text. Keep responses short and useful.`;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function streamFromOpenRouter(
  message: string,
  history: { role: string; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): () => void {
  const { openrouterApiKey, llmModel } = useSettingsStore.getState();

  if (!openrouterApiKey) {
    callbacks.onError(new Error('No API key configured. Go to Settings to add your OpenRouter key.'));
    return () => {};
  }

  const messages = [
    { role: 'system', content: AURA_SYSTEM_PROMPT },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const model = llmModel || 'openrouter/free';

  let cancelled = false;
  let accumulated = '';

  (async () => {
    try {
      const res = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://aura-mobile.app',
          'X-Title': 'AURA Mobile',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 429) {
          throw new Error('Rate limited. Try again in a moment.');
        }
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              accumulated += token;
              callbacks.onToken(accumulated);
            }
          } catch {}
        }
      }

      if (!cancelled) {
        callbacks.onDone(accumulated);
      }
    } catch (err: any) {
      if (!cancelled && err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}
