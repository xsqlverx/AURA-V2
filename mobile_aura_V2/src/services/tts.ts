import * as Speech from 'expo-speech';
import { useSettingsStore } from '../store/settingsStore';

const MAX_TEXT_LENGTH = 320;

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/[*_~#>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .trim();
}

export async function speak(text: string): Promise<void> {
  const { ttsEnabled, ttsSpeed } = useSettingsStore.getState();
  if (!ttsEnabled) return;

  try {
    const cleaned = stripMarkdown(text).slice(0, MAX_TEXT_LENGTH);
    if (!cleaned) return;

    Speech.speak(cleaned, {
      rate: ttsSpeed,
      pitch: 1.0,
      language: 'en-US',
    });
  } catch {}
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {}
}
