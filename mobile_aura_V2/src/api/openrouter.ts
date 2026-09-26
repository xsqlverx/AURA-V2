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

// 1. Conversational Chat Stream (Uses Chat Provider, e.g. OpenRouter / Nvidia / Groq)
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
      new Error(`No API key for ${chatProvider.toUpperCase()}. Please configure in Settings.`)
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
  let timerId: ReturnType<typeof setInterval> | null = null;

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

      devLog.info(`Querying ${chatProvider} with model ${model}`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          temperature: 0.7,
        }),
        signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 429) {
          throw new Error('Rate limit reached on AI provider.');
        }
        if (res.status === 401) {
          throw new Error('Invalid API Key. Please verify in Settings.');
        }
        throw new Error(`API ${res.status}: ${errBody.slice(0, 100) || 'Service error'}`);
      }

      const data = await res.json();
      const fullText: string = data.choices?.[0]?.message?.content || 'Directive processed.';

      if (cancelled) return;

      // Simulate ultra-smooth fluid streaming in React Native Hermes
      const words = fullText.split(/(\s+)/);
      let currentIdx = 0;
      let accumulated = '';

      // Stream words smoothly at 25ms intervals
      timerId = setInterval(() => {
        if (cancelled) {
          if (timerId) clearInterval(timerId);
          return;
        }

        if (currentIdx < words.length) {
          accumulated += words[currentIdx];
          currentIdx++;
          callbacks.onToken(accumulated);
        } else {
          if (timerId) clearInterval(timerId);
          callbacks.onDone(fullText);
        }
      }, 25);
    } catch (err: any) {
      if (timerId) clearInterval(timerId);
      if (!cancelled && err?.name !== 'AbortError') {
        devLog.error('Chat stream error', err);
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return () => {
    cancelled = true;
    if (timerId) clearInterval(timerId);
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
