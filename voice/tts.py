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
from voice.audio_utils import generate_amplitude_payload

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

        self._audio_buffer = np.array([], dtype=np.float32)
        self._buffer_lock = threading.Lock()

        self._last_callback_time = time.time()

        self._gen_thread = threading.Thread(target=self._generator, daemon=True)
        self._gen_thread.start()

        self._stream = None
        self._audio_available = True
        self._ensure_stream(start=True)

    def _create_stream(self):
        """Create a fresh OutputStream. Raises on failure."""
        return sd.OutputStream(
            samplerate=self._sample_rate,
            channels=1,
            callback=self._audio_callback,
            blocksize=1024,
        )

    def _ensure_stream(self, start: bool = True) -> bool:
        """(Re)create the output stream if missing/closed. Returns True if usable."""
        try:
            if self._stream is None:
                self._stream = self._create_stream()
            if start and not self._stream.active:
                self._stream.start()
            self._audio_available = True
            return True
        except Exception as e:
            # MME error 6 / PaErrorCode -9999 = Windows output device vanished
            # (BT unplugged, RDP, sleep, disabled audio). Don't crash — TTS
            # queues still work, playback resumes when device returns.
            self._audio_available = False
            try:
                default_out = sd.default.device[1] if hasattr(sd, "default") else "?"
            except Exception:
                default_out = "?"
            logger.warning(
                "Audio output unavailable (device=%s): %s. "
                "Playback paused until a device returns.",
                default_out, e,
            )
            try:
                if self._stream is not None:
                    self._stream.close(ignore_errors=True)
            except Exception:
                pass
            self._stream = None
            return False

    def _safe_start(self) -> bool:
        try:
            if self._stream is None:
                return self._ensure_stream(start=True)
            if not self._stream.active:
                self._stream.start()
            self._audio_available = True
            return True
        except Exception as e:
            logger.warning("Audio stream start failed (no output driver?): %s", e)
            self._audio_available = False
            return False

    def _safe_abort(self):
        try:
            if self._stream is not None:
                self._stream.abort()
        except Exception:
            pass  # already stopped / closed — not an error

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

    def _audio_callback(self, outdata, frames, time_info, status):
        self._last_callback_time = time.time()
        try:
            wrote_audio = False
            with self._buffer_lock:
                while self._audio_buffer.size < frames:
                    try:
                        chunk = self._audio_queue.get_nowait()
                        self._audio_buffer = np.concatenate([self._audio_buffer, chunk.ravel()])
                        self._audio_queue.task_done()
                    except queue.Empty:
                        break

                n = min(self._audio_buffer.size, frames)
                if n > 0:
                    outdata[:n, 0] = self._audio_buffer[:n]
                    outdata[n:, 0] = 0.0
                    self._audio_buffer = self._audio_buffer[n:]
                    wrote_audio = True
                else:
                    outdata[:, 0] = 0.0

            if wrote_audio:
                self.is_speaking.set()
            elif self._audio_queue.empty():
                self.is_speaking.clear()
        except Exception:
            outdata[:, 0] = 0.0

    def speak(self, text: str):
        if text and text.strip():
            self._text_queue.put(text)
            if not self._audio_available:
                # Device may have returned — retry once in background.
                self._safe_start()

    def stop_playback(self):
        # Clear queues first so this never raises, even with no audio driver.
        self._safe_abort()
        with self._buffer_lock:
            self._audio_buffer = np.array([], dtype=np.float32)
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
        self._safe_start()

    def pause(self):
        self._paused.set()
        self._safe_abort()

    def resume(self):
        self._paused.clear()
        self._safe_start()

    def wait_until_done(self, timeout: float = 120.0):
        import time as _time
        deadline = _time.time() + timeout
        while not self._text_queue.empty() and _time.time() < deadline:
            _time.sleep(0.1)
        while not self._audio_queue.empty() and _time.time() < deadline:
            _time.sleep(0.1)
        while _time.time() < deadline:
            with self._buffer_lock:
                if self._audio_buffer.size == 0:
                    break
            cb_idle = _time.time() - self._last_callback_time
            if cb_idle > 3.0:
                logger.warning("Audio callback stopped (%.1fs idle) — force-clearing", cb_idle)
                break
            _time.sleep(0.05)
        leftover = (self._audio_buffer.size > 0 or not self._audio_queue.empty())
        if leftover:
            if _time.time() - self._last_callback_time > 3.0:
                logger.warning("wait_until_done force-clearing dead stream")
                with self._buffer_lock:
                    self._audio_buffer = np.array([], dtype=np.float32)
                while not self._text_queue.empty():
                    try: self._text_queue.get_nowait(); self._text_queue.task_done()
                    except: break
                while not self._audio_queue.empty():
                    try: self._audio_queue.get_nowait(); self._audio_queue.task_done()
                    except: break
                self.is_speaking.clear()
            else:
                logger.info("Playback still active — waiting more")
                self.wait_until_done(timeout=60.0)

    def stop(self):
        self._stop.set()
        try:
            if self._stream is not None:
                self._stream.abort()
                self._stream.close(ignore_errors=True)
        except Exception:
            pass
        finally:
            self._stream = None

    def list_voices(self) -> list[str]:
        raise NotImplementedError

    def get_current_voice(self) -> str:
        with self._voice_lock:
            return self._voice

    def set_voice(self, voice_name: str) -> bool:
        raise NotImplementedError


class EdgeTTSEngine(BaseTTSEngine):
    """Microsoft Edge TTS via edge-tts with configurable speech rate boost."""

    _DEFAULT_VOICES = [
        "en-US-AvaNeural",
        "en-US-JennyNeural",
        "en-US-GuyNeural",
        "en-US-AriaNeural",
        "en-US-SteffanNeural",
        "en-US-ChristopherNeural",
        "en-GB-SoniaNeural",
        "en-GB-RyanNeural",
    ]

    def __init__(self, voice: str = "en-US-AvaNeural", rate: str = None):
        import edge_tts
        import os
        self._edge = edge_tts
        self._rate = rate or os.getenv("TTS_RATE", "+20%")

        # Default voice list to avoid blocking startup on network fetch
        self._all_voices = list(self._DEFAULT_VOICES)

        # Fallback if an invalid voice (like old Supertonic 'F1') was passed
        if voice not in self._all_voices:
            fallback = "en-US-AvaNeural"
            logger.info("Edge voice %r not in standard list, using %s", voice, fallback)
            voice = fallback

        super().__init__(voice)
        logger.info("Edge TTS ready — voice: %s (rate: %s)", voice, self._rate)

    def _synthesize_now(self, text: str):
        _, clean = emotion.clean_for_tts(text)

        async def _do():
            communicate = self._edge.Communicate(clean, self._voice, rate=self._rate)
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
        with self._voice_lock:
            self._voice = voice_name
        logger.info("TTS voice switched to: %s", voice_name)
        return True

    def set_rate(self, rate: str):
        self._rate = rate
        logger.info("Edge TTS rate set to: %s", rate)




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


def create_engine(provider: str = None, voice: str = None) -> BaseTTSEngine:
    """Factory: returns the appropriate TTS engine."""
    import os
    if not provider:
        provider = os.getenv("TTS_PROVIDER", "edge")
    if not voice:
        voice = os.getenv("TTS_VOICE", "en-US-AvaNeural" if provider == "edge" else "F1")
    provider = provider.lower().strip()

    logger.info("Creating TTS engine: provider=%s voice=%s", provider, voice)

    if provider == "edge":
        return EdgeTTSEngine(voice=voice)
    elif provider == "supertonic":
        return SupertonicTTSEngine(voice=voice)
    elif provider == "kokoro":
        return KokoroTTSEngine(voice=voice)
    else:
        raise ValueError(f"Unknown TTS provider: {provider!r}. Use 'edge', 'supertonic', or 'kokoro'.")

