"""TTS engine — Kokoro onnx model, double-buffered audio queue, sounddevice playback."""

import queue
import time
import logging
import threading

import sounddevice as sd

logger = logging.getLogger(__name__)


class TTSEngine:
    def __init__(self, voice: str = "af_heart"):
        from pykokoro import KokoroPipeline, PipelineConfig, with_spacy_model_size

        logger.info("Loading Kokoro TTS voice: %s", voice)
        config = with_spacy_model_size(PipelineConfig(voice=voice), size="sm")
        self._pipeline = KokoroPipeline(config)
        self._sample_rate = 24000

        self._text_queue = queue.Queue()
        self._audio_queue = queue.Queue()
        self._stop = threading.Event()
        self._paused = threading.Event()
        self.is_speaking = threading.Event()

        self._pipeline.run("Ready.")
        logger.info("TTS pre-warmed.")

        self._gen_thread = threading.Thread(target=self._generator, daemon=True)
        self._gen_thread.start()

        self._player_thread = threading.Thread(target=self._player, daemon=True)
        self._player_thread.start()

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
                result = self._pipeline.run(text)
                if result and result.audio is not None and len(result.audio) > 0:
                    self._audio_queue.put(result.audio)
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
        if text.strip():
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
