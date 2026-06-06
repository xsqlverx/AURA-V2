"""Picovoice wake word detection, post-wake recording, STT, and UI socket handoff."""

from __future__ import annotations

import array
import logging
import os
import socket
import tempfile
import threading
import time
import wave
from collections.abc import Callable
from pathlib import Path

from core.config import PICOVOICE_KEY, UI_SOCKET_PORT, WAKE_WORD_PATH
from voice.stt import WhisperSTT
from voice.tts import BaseTTSEngine

logger = logging.getLogger(__name__)

# Simple energy gate for end-of-utterance (16-bit mono frames).
_ENERGY_SILENCE = 450
_ENERGY_SPEECH = 700
_SILENCE_FRAMES_TO_END = 18
_MAX_RECORD_SEC = 3.0
_BRIEF_PAUSE_SEC = 0.18
_FLUSH_FRAMES = 6


class WakeWordDetector:
    """
    Background Porcupine wake listener; after a hit, records until silence, STT, sends to UI.
    """

    def __init__(
        self,
        *,
        on_wake: Callable[[], None],
        tts: BaseTTSEngine | None = None,
    ) -> None:
        self._on_wake = on_wake
        self._tts = tts
        self._stt = WhisperSTT()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the wake listener thread."""
        try:
            if self._thread is not None and self._thread.is_alive():
                return
            self._stop.clear()
            self._thread = threading.Thread(
                target=self._run,
                name="WakeWordDetector",
                daemon=True,
            )
            self._thread.start()
        except Exception:
            logger.warning("WakeWordDetector.start failed", exc_info=True)

    def stop(self) -> None:
        """Signal the listener to stop and wait for the thread to exit."""
        try:
            self._stop.set()
            if self._thread is not None:
                self._thread.join(timeout=12.0)
                if self._thread.is_alive():
                    logger.warning("WakeWordDetector thread did not exit within timeout")
                self._thread = None
        except Exception:
            logger.warning("WakeWordDetector.stop failed", exc_info=True)

    def _run(self) -> None:
        porcupine = None
        recorder = None
        try:
            if not PICOVOICE_KEY or not WAKE_WORD_PATH:
                logger.warning(
                    "WakeWordDetector disabled: set PICOVOICE_KEY and WAKE_WORD_PATH"
                )
                while not self._stop.wait(0.4):
                    pass
                return
            if not WAKE_WORD_PATH.is_file():
                logger.warning("WakeWordDetector: WAKE_WORD_PATH is not a file: %s", WAKE_WORD_PATH)
                while not self._stop.wait(0.4):
                    pass
                return

            try:
                import pvporcupine
                import pvrecorder
            except ImportError:
                pass

            porcupine = pvporcupine.create(
                access_key=PICOVOICE_KEY,
                keyword_paths=[str(WAKE_WORD_PATH)],
                sensitivities=[0.55],
            )
            recorder = pvrecorder.PvRecorder(
                device_index=-1,
                frame_length=porcupine.frame_length,
            )
            recorder.start()
            sample_rate = porcupine.sample_rate

            while not self._stop.is_set():
                try:
                    pcm = recorder.read()
                    keyword_index = porcupine.process(pcm)
                    if keyword_index >= 0:
                        logger.info("Wake word detected (keyword_index=%s)", keyword_index)
                        try:
                            self._on_wake()
                        except Exception:
                            logger.warning("on_wake callback failed", exc_info=True)
                        try:
                            self._after_wake_pipeline(
                                recorder,
                                sample_rate,
                                porcupine.frame_length,
                            )
                        except Exception:
                            logger.warning("post-wake pipeline failed", exc_info=True)
                except Exception:
                    logger.warning("Wake listen loop error", exc_info=True)
                    time.sleep(0.15)
        except Exception:
            logger.warning("WakeWordDetector._run failed to initialize or run", exc_info=True)
        finally:
            try:
                if recorder is not None:
                    try:
                        recorder.stop()
                    except Exception:
                        logger.warning("PvRecorder.stop failed", exc_info=True)
                    try:
                        recorder.delete()
                    except Exception:
                        logger.warning("PvRecorder.delete failed", exc_info=True)
            except Exception:
                logger.warning("Recorder cleanup failed", exc_info=True)
            try:
                if porcupine is not None:
                    porcupine.delete()
            except Exception:
                logger.warning("Porcupine.delete failed", exc_info=True)

    def _after_wake_pipeline(
        self,
        recorder,
        sample_rate: int,
        frame_length: int,
    ) -> None:
        """Pause wake processing, record utterance, STT, notify UI, then resume context."""
        time.sleep(_BRIEF_PAUSE_SEC)
        self._discard_frames(recorder, _FLUSH_FRAMES)
        samples = self._record_until_silence(recorder, sample_rate, frame_length)
        if not samples or self._stop.is_set():
            return
        tmp_path: Path | None = None
        try:
            fd, name = tempfile.mkstemp(suffix=".wav", prefix="aura_wake_")
            os.close(fd)
            tmp_path = Path(name)
            self._write_wav_mono16(tmp_path, samples, sample_rate)
            text = self._stt.transcribe(str(tmp_path))
            if text:
                self._send_text_to_ui(text)
        except Exception:
            logger.warning("wake utterance capture / STT / send failed", exc_info=True)
        finally:
            if tmp_path is not None:
                try:
                    tmp_path.unlink(missing_ok=True)
                except OSError:
                    logger.warning("could not remove temp wav %s", tmp_path, exc_info=True)

    def _discard_frames(self, recorder, count: int) -> None:
        for _ in range(count):
            if self._stop.is_set():
                return
            try:
                recorder.read()
            except Exception:
                logger.warning("discard read failed", exc_info=True)
                return

    def _frame_energy_avg_abs(self, frame) -> float:
        if not frame:
            return 0.0
        return sum(abs(int(x)) for x in frame) / float(len(frame))

    def _record_until_silence(
        self,
        recorder,
        sample_rate: int,
        frame_length: int,
    ) -> list[int]:
        """Accumulate mono int16 samples until trailing silence or max duration."""
        max_samples = int(_MAX_RECORD_SEC * sample_rate)
        buf: list[int] = []
        silence_run = 0
        speech_started = False

        while len(buf) < max_samples and not self._stop.is_set():
            try:
                frame = recorder.read()
            except Exception:
                logger.warning("record read failed", exc_info=True)
                break
            e = self._frame_energy_avg_abs(frame)
            if not speech_started:
                if e >= _ENERGY_SPEECH:
                    speech_started = True
                    buf.extend(int(x) for x in frame)
                continue

            buf.extend(int(x) for x in frame)
            if e < _ENERGY_SILENCE:
                silence_run += 1
                if silence_run >= _SILENCE_FRAMES_TO_END:
                    break
            else:
                silence_run = 0

        return buf

    def _write_wav_mono16(self, path: Path, samples: list[int], sample_rate: int) -> None:
        arr = array.array("h")
        for s in samples:
            if s < -32768:
                s = -32768
            elif s > 32767:
                s = 32767
            arr.append(int(s))
        with wave.open(str(path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(arr.tobytes())

    def _send_text_to_ui(self, text: str) -> None:
        payload = text.strip()
        if not payload:
            return
        try:
            with socket.create_connection(("127.0.0.1", UI_SOCKET_PORT), timeout=4.0) as s:
                s.sendall(payload.encode("utf-8"))
        except Exception:
            logger.warning("failed to send transcript to UI socket", exc_info=True)
