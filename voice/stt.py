"""Speech recording and Whisper transcription. Ported from v1."""

import wave
import logging
import tempfile
import threading

import numpy as np
import sounddevice as sd

logger = logging.getLogger(__name__)

SAMPLE_RATE  = 16000
CHUNK_SIZE   = 1280
SILENCE_SECS = 0.4
SPEECH_THRESH = 300

_model = None
_model_lock = threading.Lock()
_groq_client = None


def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        try:
            import os
            from groq import Groq
            api_key = os.getenv("GROQ_API_KEY")
            if api_key:
                _groq_client = Groq(api_key=api_key)
        except Exception as e:
            logger.warning("Could not initialize Groq client for STT: %s", e)
    return _groq_client


def load_whisper(size: str = "base"):
    global _model
    with _model_lock:
        if _model is None:
            from faster_whisper import WhisperModel
            logger.info("Loading Whisper [%s]...", size)
            _model = WhisperModel(size, device="cpu", compute_type="int8")
            logger.info("Whisper ready.")
    return _model


def transcribe(wav_path: str) -> str:
    # 1. Try Groq Whisper (ultra-fast cloud STT ~100-150ms)
    client = _get_groq_client()
    if client is not None:
        try:
            import os
            with open(wav_path, "rb") as f:
                res = client.audio.transcriptions.create(
                    file=(os.path.basename(wav_path), f.read()),
                    model="whisper-large-v3-turbo",
                    response_format="text",
                    language="en",
                )
            text = str(res).strip() if res else ""
            if text:
                logger.info("[STT] Groq Whisper: %r", text)
                return text
        except Exception as e:
            logger.warning("[STT] Groq Whisper failed (%s), using local Whisper fallback", e)

    # 2. Local Whisper fallback
    model = _model
    if model is None:
        logger.error("Whisper not loaded.")
        return ""
    try:
        segments, _ = model.transcribe(wav_path)
        return " ".join(s.text for s in segments).strip()
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        return ""


def record_speech(stop_event: threading.Event = None, ptt_event: threading.Event = None) -> str | None:
    """
    Record audio until silence (wake-word mode) or until ptt_event is cleared (PTT mode).
    stop_event: set this to abort recording from outside.
    ptt_event:  if provided, recording stops when this event is cleared (key released).
    Returns path to a temp wav file, or None if nothing was captured.
    """
    ptt_mode = ptt_event is not None
    frames = []
    silent_chunks = 0
    speech_started = False
    chunks_per_sec = SAMPLE_RATE / CHUNK_SIZE
    required_silent = int(SILENCE_SECS * chunks_per_sec)
    max_chunks = int(15 * chunks_per_sec)
    drain_chunks = int(0.4 * SAMPLE_RATE / CHUNK_SIZE)

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=CHUNK_SIZE) as stream:
        # Drain stale mic buffer
        for _ in range(drain_chunks):
            stream.read(CHUNK_SIZE)

        while True:
            if stop_event and stop_event.is_set():
                break

            chunk, _ = stream.read(CHUNK_SIZE)
            amplitude = np.abs(chunk).max()
            frames.append(chunk.copy())

            if amplitude > SPEECH_THRESH:
                speech_started = True
                silent_chunks = 0
            else:
                silent_chunks += 1

            if ptt_mode:
                if not ptt_event.is_set():
                    break  # key released
            else:
                if speech_started and silent_chunks >= required_silent:
                    break

            if len(frames) >= max_chunks:
                break

    if ptt_mode:
        if len(frames) < int(0.5 * chunks_per_sec):
            return None  # too short — accidental tap
    else:
        if not speech_started:
            return None

    if not frames:
        return None

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    audio_data = np.concatenate(frames, axis=0)
    with wave.open(tmp.name, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_data.tobytes())
    tmp.close()
    return tmp.name