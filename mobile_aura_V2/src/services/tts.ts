import * as Speech from 'expo-speech';
import { useSettingsStore } from '../store/settingsStore';
import { devLog } from '../utils/devLog';

const MAX_TEXT_LENGTH = 400;

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
  const { ttsEnabled, ttsSpeed, voiceProvider, voiceGender } = useSettingsStore.getState();
  if (!ttsEnabled) return;

  try {
    const cleaned = stripMarkdown(text).slice(0, MAX_TEXT_LENGTH);
    if (!cleaned) return;

    // First try expo-speech with high quality voice matching
    const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
    
    // Look for neural or high quality female/male voices
    let selectedVoice: string | undefined;
    if (voices && voices.length > 0) {
      if (voiceGender === 'female') {
        const femaleVoice = voices.find(
          (v) =>
            (v.language.startsWith('en') &&
              (v.name.toLowerCase().includes('ava') ||
                v.name.toLowerCase().includes('samantha') ||
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('karen') ||
                v.name.toLowerCase().includes('en-us-neural2-f') ||
                v.quality === 'Enhanced'))
        );
        selectedVoice = femaleVoice?.identifier;
      }
    }

    Speech.speak(cleaned, {
      rate: ttsSpeed,
      pitch: 1.05, // Slightly warmer pitch for companion feel
      language: 'en-US',
      voice: selectedVoice,
      onStart: () => devLog.info('TTS started speaking'),
      onDone: () => devLog.info('TTS finished speaking'),
      onError: (err) => devLog.warn('TTS error', err),
    });
  } catch (e) {
    devLog.warn('Speech engine exception', e);
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {}
}
