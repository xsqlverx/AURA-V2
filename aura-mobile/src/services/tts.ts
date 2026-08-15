import { File, Paths } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettings } from '../stores/settingsStore';

let sherpaAvailable = true;
let sherpaTts: any = null;
let sherpaDownload: any = null;

async function loadSherpa() {
  if (!sherpaAvailable) return false;
  try {
    sherpaTts = await import('react-native-sherpa-onnx/tts');
    sherpaDownload = await import('react-native-sherpa-onnx/download');
    return true;
  } catch {
    sherpaAvailable = false;
    console.warn('[TTS] sherpa-onnx native module not available — on-device TTS disabled');
    return false;
  }
}

export const SUPERTONIC_MODEL_ID = 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11';
export const SUPERTONIC_VOICES = ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'] as const;
export type SupertonicVoice = (typeof SUPERTONIC_VOICES)[number];

export function voiceToSid(voice: string): number {
  const idx = SUPERTONIC_VOICES.indexOf(voice as SupertonicVoice);
  return idx >= 0 ? idx : 0;
}

export type ModelStatus = {
  state: 'unknown' | 'ready' | 'downloading' | 'error' | 'unavailable';
  percent?: number;
  path?: string;
};

let engine: any = null;
let initPromise: Promise<any> | null = null;
let modelPath: string | undefined = undefined;
let modelState: ModelStatus = { state: 'unknown' };
let generation = 0;
let queue: Promise<boolean> = Promise.resolve(false);
let currentPlayer: AudioPlayer | null = null;

const EMOTION_TAG_RE = /<\/?[a-z_][a-z0-9_]*>/gi;
const MAX_TEXT_LENGTH = 320;
const PLAYBACK_TIMEOUT_MS = 30000;

export function getModelStatus(): ModelStatus {
  if (!sherpaAvailable && modelState.state === 'unknown') {
    return { state: 'unavailable' };
  }
  return modelState;
}

export async function isVoiceModelReady(): Promise<boolean> {
  if (!(await loadSherpa())) return false;
  return sherpaDownload.isModelDownloadedByCategory(
    sherpaDownload.ModelCategory.Tts,
    SUPERTONIC_MODEL_ID,
  );
}

export async function ensureVoiceModel(onProgress?: (percent: number) => void): Promise<string> {
  if (modelPath) return modelPath;
  if (!(await loadSherpa())) throw new Error('sherpa-onnx not available');
  const result = await sherpaDownload.ensureModelByCategory(
    sherpaDownload.ModelCategory.Tts,
    SUPERTONIC_MODEL_ID,
    {
      onProgress: (p: any) => {
        if (p.percent != null) {
          modelState = { state: 'downloading', percent: Math.round(p.percent) };
          onProgress?.(p.percent);
        }
      },
    },
  );
  modelPath = result.localPath ?? undefined;
  modelState = { state: 'ready', path: modelPath };
  return modelPath as string;
}

async function getEngine(): Promise<any> {
  if (engine) return engine;
  if (!initPromise) {
    initPromise = (async () => {
      const path = await ensureVoiceModel();
      const tts = await sherpaTts.createTTS({
        modelPath: { type: 'file', path },
        modelType: 'supertonic',
        numThreads: 2,
        provider: 'cpu',
      });
      engine = tts;
      return tts;
    })();
  }
  return initPromise;
}

export async function destroyEngine(): Promise<void> {
  generation++;
  stopPlayer();
  try {
    await engine?.destroy();
  } catch {}
  engine = null;
  initPromise = null;
}

function stopPlayer(): void {
  try {
    currentPlayer?.remove();
  } catch {}
  currentPlayer = null;
}

function cleanText(text: string): string {
  const cleaned = text.replace(EMOTION_TAG_RE, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > MAX_TEXT_LENGTH ? cleaned.slice(0, MAX_TEXT_LENGTH) : cleaned;
}

async function playFile(uri: string): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true });
  const player = createAudioPlayer({ uri });
  currentPlayer = player;
  await new Promise<void>((resolve) => {
    let sub: { remove: () => void } | null = null;
    const finishTimer = setTimeout(() => {
      sub?.remove();
      player.remove();
      if (currentPlayer === player) currentPlayer = null;
      resolve();
    }, PLAYBACK_TIMEOUT_MS);
    sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status?.didJustFinish) {
        clearTimeout(finishTimer);
        sub?.remove();
        player.remove();
        if (currentPlayer === player) currentPlayer = null;
        resolve();
      }
    });
    player.play();
  });
}

export type SpeakOptions = {
  sid?: number;
  voice?: string;
  speed?: number;
  lang?: string;
};

export function speak(text: string, opts?: SpeakOptions): Promise<boolean> {
  const task = queue.then(async () => {
    const myGen = generation;
    let tmp: File | null = null;
    try {
      const tts = await getEngine();
      if (myGen !== generation) return false;
      const audio = await tts.generateSpeech(cleanText(text), {
        sid: opts?.sid ?? voiceToSid(opts?.voice ?? 'F1'),
        speed: opts?.speed ?? 1.0,
        extra: { lang: opts?.lang ?? 'en' },
      });
      if (myGen !== generation) return false;
      tmp = new File(Paths.cache, `tts_${Date.now()}_${Math.floor(Math.random() * 1e6)}.wav`);
      await sherpaTts.saveAudioToFile(audio, tmp.uri);
      if (myGen !== generation) return false;
      await playFile(tmp.uri);
      return true;
    } catch (e) {
      console.warn('On-device TTS failed:', e);
      if (myGen === generation) {
        try {
          await engine?.destroy();
        } catch {}
        engine = null;
        initPromise = null;
      }
      return false;
    } finally {
      if (tmp) {
        try {
          tmp.delete();
        } catch {}
      }
    }
  });
  queue = task.catch(() => false);
  return task;
}

export function stopSpeaking(): void {
  generation++;
  stopPlayer();
}

const CONFIRMATIONS: Record<string, string[]> = {
  open_app: ['Opening that for you.', 'Done, there you go.', 'Opening.'],
  open_settings: ['Opening settings.', 'Settings are up.'],
  send_whatsapp: ['WhatsApp sent.', 'Message delivered.'],
  send_sms: ['SMS sent.', 'Text sent.'],
  make_call: ['Calling now.', 'Dialing.'],
  open_url: ['Opening that page.', 'There you go.'],
  share_sheet: ['Sharing that now.'],
};

export function speakConfirmation(action: string): void {
  const phrases = CONFIRMATIONS[action];
  if (!phrases || !useSettings.getState().voiceEnabled) return;
  void speak(phrases[Math.floor(Math.random() * phrases.length)]);
}
