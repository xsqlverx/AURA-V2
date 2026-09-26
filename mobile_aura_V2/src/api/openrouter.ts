import { useSettingsStore, LLMProvider } from '../store/settingsStore';
import { devLog } from '../utils/devLog';

const AURA_SYSTEM_PROMPT = `You are AURA, an elite personal AI companion and copilot living on Kenaz's phone. You are warm, confident, sharp, and concise. You speak naturally with intelligence and a subtle companion warmth — never robotic or overly verbose.

If the prompt is conversational, answer with high intelligence and elegance. Keep spoken replies natural and crisp.`;

const TOOL_PLANNER_SYSTEM_PROMPT = `You are AURA's Multi-Step Action Planning Engine.
Break down complex user requests across Android applications into an executable JSON action sequence.

Supported Atomic Actions:
- {"action": "open_app", "package": "package_name"}
- {"action": "whatsapp_chat", "contact": "name", "message": "text"}
- {"action": "whatsapp_call", "contact": "name"}
- {"action": "phone_call", "number_or_name": "value"}
- {"action": "camera_front"}
- {"action": "camera_rear"}
- {"action": "open_url", "url": "https://..."}
- {"action": "copy_to_clipboard", "text": "value"}
- {"action": "speak_on_pc", "text": "phrase"}
- {"action": "pc_action", "command": "lock_pc|mute_audio|sleep_pc"}

Output ONLY valid JSON with this schema:
\`\`\`json
{
  "summary": "Brief summary of the plan",
  "steps": [
    {"action": "open_app", "package": "com.whatsapp"},
    {"action": "whatsapp_chat", "contact": "Max", "message": "Here is the link"}
  ]
}
\`\`\``;

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

// 1. Conversational Chat Stream (Uses Chat Provider, e.g. OpenRouter / Nvidia)
export function streamFromOpenRouter(
  message: string,
  history: { role: string; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): () => void {
  const { chatProvider, chatModel, customEndpointUrl } = useSettingsStore.getState();
  const apiKey = useSettingsStore.getState().getApiKeyForProvider(chatProvider);

  if (!apiKey && chatProvider !== 'openrouter') {
    callbacks.onError(
      new Error(`No API key for Chat Provider (${chatProvider.toUpperCase()}). Configure in Settings.`)
    );
    return () => {};
  }

  const endpoint = getProviderEndpoint(chatProvider, customEndpointUrl);

  const messages = [
    { role: 'system', content: AURA_SYSTEM_PROMPT },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const model = chatModel || (chatProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'openrouter/free');

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

      if (chatProvider === 'openrouter') {
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
          throw new Error('Rate limit reached on chat tier.');
        }
        if (res.status === 401) {
          throw new Error('Invalid Chat API Key. Check Settings.');
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

// 2. Tool & Multi-Action Planner Completion (Uses Tool Provider, e.g. Groq 70B for sub-second speed)
export async function planMultiStepAction(prompt: string): Promise<{ summary: string; steps: any[] } | null> {
  const { toolProvider, toolModel, customEndpointUrl } = useSettingsStore.getState();
  const apiKey = useSettingsStore.getState().getApiKeyForProvider(toolProvider);

  const endpoint = getProviderEndpoint(toolProvider, customEndpointUrl);
  const model = toolModel || 'llama-3.3-70b-versatile';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: TOOL_PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1, // Deterministic plan output
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Extract JSON block
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawContent];
    const parsed = JSON.parse(jsonMatch[1] || rawContent);
    return parsed;
  } catch (e) {
    devLog.warn('Tool action planning failed', e);
    return null;
  }
}
