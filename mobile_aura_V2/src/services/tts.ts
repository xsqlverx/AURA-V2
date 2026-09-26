import * as Speech from 'expo-speech';
import { useSettingsStore } from '../store/settingsStore';
import { devLog } from '../utils/devLog';

const MAX_TEXT_LENGTH = 400;

// In-memory cached voice identifiers
let cachedFemaleVoice: string | undefined;
let cachedMaleVoice: string | undefined;
let voicesLoaded = false;

// Warm up and cache voice list once at app startup
export async function warmupVoiceEngine(): Promise<void> {
  if (voicesLoaded) return;
  try {
    const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
    if (voices && voices.length > 0) {
      // Find enhanced / neural female voice
      const female = voices.find(
        (v) =>
          v.language.startsWith('en') &&
          (v.name.toLowerCase().includes('ava') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('karen') ||
            v.name.toLowerCase().includes('en-us-neural2-f') ||
            v.quality === 'Enhanced')
      );
      if (female) cachedFemaleVoice = female.identifier;

      // Find male voice
      const male = voices.find(
        (v) =>
          v.language.startsWith('en') &&
          (v.name.toLowerCase().includes('guy') ||
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('en-us-neural2-d'))
      );
      if (male) cachedMaleVoice = male.identifier;
    }
    voicesLoaded = true;
    devLog.info('TTS Voice engine warmed up & cached successfully');
  } catch (e) {
    devLog.warn('Voice warmup error', e);
  }
}

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
  const { ttsEnabled, ttsSpeed, voiceGender } = useSettingsStore.getState();
  if (!ttsEnabled) return;

  try {
    const cleaned = stripMarkdown(text).slice(0, MAX_TEXT_LENGTH);
    if (!cleaned) return;

    // Stop ongoing speech before triggering new phrase
    try {
      await Speech.stop();
    } catch {}

    const options: Speech.SpeechOptions = {
      rate: Math.min(Math.max(ttsSpeed, 0.75), 1.75),
      pitch: voiceGender === 'female' ? 1.05 : 0.95,
      language: 'en-US',
    };

    const selectedVoice = voiceGender === 'female' ? cachedFemaleVoice : cachedMaleVoice;
    if (selectedVoice) {
      options.voice = selectedVoice;
    }

    Speech.speak(cleaned, options);
  } catch (e) {
    devLog.warn('Speech engine exception safely caught:', e);
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {}
}
