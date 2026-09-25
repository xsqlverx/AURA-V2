import { useSettingsStore, LLMProvider } from '../store/settingsStore';

const AURA_SYSTEM_PROMPT = `You are AURA, an elite personal AI companion and copilot living on Kenaz's phone. You are warm, confident, sharp, and concise. You speak naturally with intelligence and a subtle companion warmth — never robotic or overly verbose.

You can trigger on-device phone capabilities by outputting a structured action block:
\`\`\`tool_call
{"tool": "open_app", "params": {"package": "com.whatsapp"}}
\`\`\`

Available on-device capabilities:
- open_app: {"tool": "open_app", "params": {"package": "app_name_or_id"}}
- make_call: {"tool": "make_call", "params": {"number": "phone_number"}}
- send_sms: {"tool": "send_sms", "params": {"number": "phone_number", "message": "text"}}
- open_url: {"tool": "open_url", "params": {"url": "https://..."}}
- open_settings: {"tool": "open_settings", "params": {}}

If the prompt is conversational, answer with high intelligence and elegance. Keep spoken replies natural and crisp.`;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

function getProviderEndpoint(provider: LLMProvider, customUrl?: string): string {
  switch (provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'nvidia':
      return 'https://integrate.api.nvidia.com/v1/chat/completions';
    case 'cerebras':
      return 'https://api.cerebras.ai/v1/chat/completions';
    case 'sambanova':
      return 'https://api.sambanova.ai/v1/chat/completions';
    case 'custom':
      return customUrl || 'https://openrouter.ai/api/v1/chat/completions';
    case 'openrouter':
    default:
      return 'https://openrouter.ai/api/v1/chat/completions';
  }
}

export function streamFromOpenRouter(
  message: string,
  history: { role: string; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): () => void {
  const { activeProvider, llmModel, customEndpointUrl } = useSettingsStore.getState();
  const apiKey = useSettingsStore.getState().getActiveApiKey();

  if (!apiKey && activeProvider !== 'openrouter') {
    callbacks.onError(
      new Error(`No API key for ${activeProvider.toUpperCase()}. Configure in Settings.`)
    );
    return () => {};
  }

  const endpoint = getProviderEndpoint(activeProvider, customEndpointUrl);

  const messages = [
    { role: 'system', content: AURA_SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const model = llmModel || (activeProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'openrouter/free');

  let cancelled = false;
  let accumulated = '';

  (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      if (activeProvider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://aura-mobile.app';
        headers['X-Title'] = 'AURA Mobile V2';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
        }),
        signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 429) {
          throw new Error('Rate limit reached on provider tier. Retrying fallback...');
        }
        if (res.status === 401) {
          throw new Error('Invalid API Key. Please verify key in Settings.');
        }
        throw new Error(`API Error ${res.status}: ${errBody.slice(0, 160)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported in this runtime');

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
