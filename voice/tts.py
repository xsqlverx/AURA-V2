"""TTS engines — Supertonic (primary), Edge TTS, and Kokoro with emotion support."""

import asyncio
import io
import logging
import queue
import threading
import time

import miniaudio
import numpy as np
import sounddevice as sd

from voice import emotion

logger = logging.getLogger(__name__)


class BaseTTSEngine:
    """Abstract base. Subclasses must implement _synthesize_now(), list_voices(), set_voice()."""

    def __init__(self, voice: str):
        self._voice = voice
        self._sample_rate = 44100
        self._voice_lock = threading.Lock()
        self._text_queue: queue.Queue = queue.Queue()
        self._audio_queue: queue.Queue = queue.Queue()
        self._stop = threading.Event()
        self._paused = threading.Event()
        self.is_speaking = threading.Event()

        self._gen_thread = threading.Thread(target=self._generator, daemon=True)
        self._gen_thread.start()

        self._player_thread = threading.Thread(target=self._player, daemon=True)
        self._player_thread.start()

    def _synthesize_now(self, text: str):
        raise NotImplementedError

    def _generator(self):
        while not self._stop.is_set():
            if self._paused.is_set():
                time.sleep(0.1)
                continue
            try:
                text = self._text_queue.get(timeout=0.3)
            except queue.Empty:
                continue
            if not text:
                self._text_queue.task_done()
                continue
            try:
                wav, _duration = self._synthesize_now(text)
                if wav is not None and wav.size > 0:
                    audio = wav.squeeze()
                    self._audio_queue.put(audio)
            except Exception as e:
                logger.error("TTS generation error: %s", e)
            finally:
                self._text_queue.task_done()

    def _player(self):
        while not self._stop.is_set():
            try:
                audio = self._audio_queue.get(timeout=0.5)
            except queue.Empty:
                continue
            if self._paused.is_set():
                self._audio_queue.task_done()
                continue
            self.is_speaking.set()
            try:
                sd.play(audio, self._sample_rate)
                sd.wait()
            except Exception as e:
                logger.error("TTS playback error: %s", e)
            finally:
                self._audio_queue.task_done()
                if self._audio_queue.empty():
                    self.is_speaking.clear()
                time.sleep(0.05)

    def speak(self, text: str):
        if text and text.strip():
            self._text_queue.put(text)

    def stop_playback(self):
        sd.stop()
        while not self._text_queue.empty():
            try:
                self._text_queue.get_nowait()
                self._text_queue.task_done()
            except queue.Empty:
                break
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
                self._audio_queue.task_done()
            except queue.Empty:
                break
        self.is_speaking.clear()

    def pause(self):
        self._paused.set()
        sd.stop()

    def resume(self):
        self._paused.clear()

    def wait_until_done(self):
        self._text_queue.join()
        self._audio_queue.join()

    def stop(self):
        self._stop.set()

    def list_voices(self) -> list[str]:
        raise NotImplementedError

    def get_current_voice(self) -> str:
        with self._voice_lock:
            return self._voice

    def set_voice(self, voice_name: str) -> bool:
        raise NotImplementedError


class EdgeTTSEngine(BaseTTSEngine):
    """Microsoft Edge TTS via edge-tts. Supports SSML emotion tags."""

    def __init__(self, voice: str = "en-US-AvaNeural"):
        import edge_tts
        self._edge = edge_tts

        try:
            self._all_voices = asyncio.run(self._fetch_voices())
        except Exception as e:
            logger.warning("Failed to fetch Edge voice list: %s", e)
            self._all_voices = [voice]

        if voice not in self._all_voices:
            fallback = "en-US-AvaNeural"
            logger.warning("Voice %r not found, falling back to %s", voice, fallback)
            if fallback in self._all_voices:
                voice = fallback

        super().__init__(voice)
        logger.info("Edge TTS ready — voice: %s", voice)

    @staticmethod
    async def _fetch_voices():
        import edge_tts
        voices = await edge_tts.list_voices()
        return sorted(v["ShortName"] for v in voices)

    def _synthesize_now(self, text: str):
        _, clean = emotion.clean_for_tts(text)

        async def _do():
            communicate = self._edge.Communicate(clean, self._voice)
            mp3_bytes = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_bytes += chunk["data"]

            if not mp3_bytes:
                return np.array([], dtype=np.float32), 0.0

            decoded = miniaudio.decode(
                mp3_bytes, miniaudio.SampleFormat.FLOAT32,
                nchannels=1, sample_rate=self._sample_rate,
            )
            samples = np.frombuffer(decoded.samples, dtype=np.float32)
            return samples, len(samples) / self._sample_rate

        return asyncio.run(_do())

    def list_voices(self) -> list[str]:
        return list(self._all_voices)

    def set_voice(self, voice_name: str) -> bool:
        if voice_name in self._all_voices:
            with self._voice_lock:
                self._voice = voice_name
            logger.info("TTS voice switched to: %s", voice_name)
            return True
        logger.warning("Unknown voice: %s", voice_name)
        return False


class SupertonicTTSEngine(BaseTTSEngine):
    """Supertonic TTS — local ONNX, supports inline expression tags."""

    _SUPERTONIC_VOICES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]

    def __init__(self, voice: str = "F1"):
        from supertonic import TTS as SupertonicTTS

        if voice not in self._SUPERTONIC_VOICES:
            logger.warning("Unknown Supertonic voice %r, falling back to F1", voice)
            voice = "F1"

        self._st = SupertonicTTS()
        self._voice_style = self._st.get_voice_style(voice)

        super().__init__(voice)

        logger.info("Supertonic TTS ready — voice: %s (%d Hz)", voice, self._sample_rate)

    def _synthesize_now(self, text: str):
        tag, clean = emotion.parse(text)
        payload = emotion.wrap_supertonic(clean, tag)
        wav, _duration = self._st.synthesize(payload, voice_style=self._voice_style, lang="en")
        if wav is None or wav.size == 0:
            return np.array([], dtype=np.float32), 0.0
        samples = wav.squeeze()
        return samples, len(samples) / self._st.sample_rate

    def list_voices(self) -> list[str]:
        return list(self._SUPERTONIC_VOICES)

    def set_voice(self, voice_name: str) -> bool:
        if voice_name not in self._SUPERTONIC_VOICES:
            logger.warning("Unknown Supertonic voice: %s", voice_name)
            return False
        with self._voice_lock:
            self._voice = voice_name
            self._voice_style = self._st.get_voice_style(voice_name)
        logger.info("Supertonic voice switched to: %s", voice_name)
        return True


class KokoroTTSEngine(BaseTTSEngine):
    """Kokoro TTS fallback — local, offline, with basic emotion support."""

    def __init__(self, voice: str = "af_bella"):
        try:
            from kokoro import KPipeline
            import soundfile as sf
            self._kpipeline = KPipeline(lang_code="a")
            self._sf = sf
        except ImportError:
            logger.error(
                "kokoro not installed. Run: pip install kokoro misaki[zh] misaki[ja]"
            )
            raise

        super().__init__(voice)
        logger.info("Kokoro TTS ready — voice: %s", voice)

    def _synthesize_now(self, text: str):
        tag, clean = emotion.parse(text)
        payload = emotion.wrap_kokoro(clean, tag)

        generator = self._kpipeline(
            payload, voice=self._voice, speed=1.0,
        )
        all_audio = []
        sample_rate = None
        for gs, ps, audio in generator:
            if audio is None:
                continue
            if sample_rate is None:
                sample_rate = 24000
            all_audio.append(audio)

        if not all_audio:
            return np.array([], dtype=np.float32), 0.0

        full = np.concatenate(all_audio)

        if sample_rate != self._sample_rate:
            ratio = self._sample_rate / sample_rate
            new_len = int(len(full) * ratio)
            full = np.interp(
                np.linspace(0, len(full) - 1, new_len),
                np.arange(len(full)),
                full,
            )

        return full, len(full) / self._sample_rate

    def list_voices(self) -> list[str]:
        return ["af_bella", "af_sky", "af_nicole", "af_sarah"]

    def set_voice(self, voice_name: str) -> bool:
        available = self.list_voices()
        if voice_name in available:
            with self._voice_lock:
                self._voice = voice_name
            logger.info("Kokoro voice switched to: %s", voice_name)
            return True
        return False


def create_engine(provider: str = "supertonic", voice: str = "F1") -> BaseTTSEngine:
    """Factory: returns the appropriate TTS engine."""
    provider = provider.lower().strip()

    if provider == "edge":
        return EdgeTTSEngine(voice=voice)
    elif provider == "supertonic":
        return SupertonicTTSEngine(voice=voice)
    elif provider == "kokoro":
        return KokoroTTSEngine(voice=voice)
    else:
        raise ValueError(f"Unknown TTS provider: {provider!r}. Use 'edge', 'supertonic', or 'kokoro'.")
