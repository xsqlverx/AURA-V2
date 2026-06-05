"""TTS engine — Supertonic 3 ONNX, double-buffered audio queue, sounddevice playback."""

import queue
import time
import logging
import threading

import sounddevice as sd

logger = logging.getLogger(__name__)


class TTSEngine:
    AVAILABLE_VOICES: tuple[str, ...] = (
        "M1", "M2", "M3", "M4", "M5",
        "F1", "F2", "F3", "F4", "F5",
    )

    def __init__(
        self,
        voice: str = "F1",
    ):
        from supertonic import TTS

        self._tts = TTS(auto_download=True)

        if voice not in self.AVAILABLE_VOICES:
            logger.warning(
                "Unknown TTS_VOICE=%r, falling back to F1. Valid: %s",
                voice, ", ".join(self.AVAILABLE_VOICES),
            )
            voice = "F1"
        logger.info("Loading Supertonic TTS voice: %s", voice)
        self._voice_style = self._tts.get_voice_style(voice_name=voice)
        self._voice_name = voice

        self._sample_rate = 44100

        self._voice_lock = threading.Lock()

        self._text_queue: queue.Queue = queue.Queue()
        self._audio_queue: queue.Queue = queue.Queue()
        self._stop = threading.Event()
        self._paused = threading.Event()
        self.is_speaking = threading.Event()

        try:
            self._synthesize_now("Ready.")
            logger.info("TTS pre-warmed.")
        except Exception as e:
            logger.warning("TTS pre-warm failed (non-fatal): %s", e)

        self._gen_thread = threading.Thread(target=self._generator, daemon=True)
        self._gen_thread.start()

        self._player_thread = threading.Thread(target=self._player, daemon=True)
        self._player_thread.start()

    def _synthesize_now(self, text: str):
        with self._voice_lock:
            style = self._voice_style
        return self._tts.synthesize(text=text, voice_style=style)

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
        return list(self.AVAILABLE_VOICES)

    def get_current_voice(self) -> str:
        with self._voice_lock:
            return self._voice_name

    def set_voice(self, voice_name: str) -> bool:
        """Swap to a built-in voice. Returns True on success, False if invalid.

        Thread-safe: the running synthesis for an in-flight sentence will keep
        the old voice, but the next queued sentence will use the new one.
        """
        voice_name = voice_name.strip().upper()
        if voice_name not in self.AVAILABLE_VOICES:
            return False
        try:
            new_style = self._tts.get_voice_style(voice_name=voice_name)
        except Exception as e:
            logger.error("Failed to load voice %s: %s", voice_name, e)
            return False
        with self._voice_lock:
            self._voice_style = new_style
            self._voice_name = voice_name
        logger.info("TTS voice switched to: %s", voice_name)
        return True
