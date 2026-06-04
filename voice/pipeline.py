"""
Voice pipeline — PTT (Right Shift) + openwakeword + Whisper STT + piper TTS.
"""

import os
import re
import wave
import socket
import logging
import tempfile
import threading

import numpy as np
import sounddevice as sd
import requests

from core.config import SERVER_URL, UI_SOCKET_PORT

logger = logging.getLogger(__name__)

SAMPLE_RATE    = 16000
CHUNK_SIZE     = 1280
SILENCE_SECS   = 1.2
SPEECH_THRESH  = 300
WAKE_MODEL     = "hey_jarvis"
DETECT_THRESH  = 0.5

# ── Intercept keyword sets ────────────────────────────────────────────────────
_INTERCEPT_KEYWORDS = {
    "reply", "reply to that", "respond", "answer",
    "handle it", "send it", "go ahead", "reply to it",
}

_AUTOCONVO_KEYWORDS = {
    "talk to them", "take over", "manage it",
    "handle the conversation", "auto mode", "keep talking",
    "you talk to them", "take it",
}

_BRIEFING_KEYWORDS = {
    "brief me", "briefing", "catch me up", "catch up",
    "status report", "what's going on", "what's happening",
    "give me a briefing", "daily brief", "status update",
    "what do i need to know", "report",
}

_END_KEYWORDS = {
    "stop", "end it", "end session", "stop talking to them",
    "wrap it up", "finish", "close session", "done",
}

ptt_active = threading.Event()
_stop      = threading.Event()


# ── Socket helpers ────────────────────────────────────────────────────────────

def _send_socket(msg: str):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect(("127.0.0.1", UI_SOCKET_PORT))
            s.sendall(msg.encode())
    except Exception:
        pass


def send_state(state: str):   _send_socket(f"STATE:{state}")
def display_user(text: str):  _send_socket(f"USER:{text}")
def display_aura(text: str):  _send_socket(f"AURA:{text}")


# ── Keyboard listener ─────────────────────────────────────────────────────────

def _start_keyboard_listener():
    from pynput import keyboard

    def on_press(key):
        if key == keyboard.Key.shift_r and not ptt_active.is_set():
            ptt_active.set()
            logger.info("PTT active.")
            send_state("listening")

    def on_release(key):
        if key == keyboard.Key.shift_r and ptt_active.is_set():
            ptt_active.clear()
            logger.info("PTT released.")
            send_state("thinking")

    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.daemon = True
    listener.start()


# ── Recording ─────────────────────────────────────────────────────────────────

def record_speech(ptt_mode: bool = False) -> str | None:
    frames = []
    silent_chunks   = 0
    speech_started  = False
    chunks_per_sec  = SAMPLE_RATE / CHUNK_SIZE
    required_silent = int(SILENCE_SECS * chunks_per_sec)
    max_chunks      = int(15 * chunks_per_sec)
    drain_chunks    = int(0.4 * SAMPLE_RATE / CHUNK_SIZE)

    with sd.InputStream(
        samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=CHUNK_SIZE
    ) as stream:
        for _ in range(drain_chunks):
            stream.read(CHUNK_SIZE)

        while True:
            if _stop.is_set():
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
                if not ptt_active.is_set():
                    break
            else:
                if speech_started and silent_chunks >= required_silent:
                    break

            if len(frames) >= max_chunks:
                break

    if ptt_mode and len(frames) < int(0.5 * chunks_per_sec):
        return None
    if not ptt_mode and not speech_started:
        return None
    if not frames:
        return None

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    audio = np.concatenate(frames, axis=0)
    with wave.open(tmp.name, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio.tobytes())
    tmp.close()
    return tmp.name


# ── Transcribe ────────────────────────────────────────────────────────────────

def transcribe(whisper, wav_path: str) -> str:
    try:
        segments, _ = whisper.transcribe(wav_path)
        return " ".join(s.text for s in segments).strip()
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        return ""


# ── Keyword checks ────────────────────────────────────────────────────────────

def _matches(text: str, keyword_set: set) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in keyword_set)


# ── Intercept handlers ────────────────────────────────────────────────────────

def _handle_briefing(tts) -> str:
    import requests
    try:
        resp = requests.post(
            f"{SERVER_URL}/briefing",
            stream=True,
            timeout=120,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.error("Briefing request failed: %s", e)
        tts.speak("I tried to gather a briefing but ran into an error.")
        return ""

    buffer = ""
    full_reply = []
    sentence_end = re.compile(r"(?<=[.!?])\s+")

    for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
        if not chunk:
            continue
        buffer += chunk
        parts = sentence_end.split(buffer)
        if len(parts) > 1:
            for sentence in parts[:-1]:
                sentence = sentence.strip()
                if sentence:
                    send_state("speaking")
                    tts.speak(sentence)
                    full_reply.append(sentence)
            buffer = parts[-1]

    if buffer.strip():
        send_state("speaking")
        tts.speak(buffer.strip())
        full_reply.append(buffer.strip())

    reply = " ".join(full_reply)
    if reply:
        display_aura(reply)
    return reply


def _handle_single_intercept(session: dict, history: list, tts) -> None:
    from comms.discord_bot import send_reply

    sender   = session["username"]
    last_msg = session.get("last_message", "")
    summary  = session.get("summary", [])

    send_state("thinking")

    history_text = "\n".join(f"{s}: {m}" for s, m in summary[-10:]) if summary else ""

    intercept_prompt = (
        f"You are Aura, Kenaz's AI assistant replying on Discord to {sender}. "
        f"{'Conversation so far:' + chr(10) + history_text + chr(10) if history_text else ''}"
        f"Their latest message: \"{last_msg}\". "
        f"Write ONLY the reply — plain conversational text, no labels, no JSON. "
        f"Never pretend to be Kenaz."
    )

    tts.speak(f"Replying to {sender}.")
    reply = stream_to_tts(intercept_prompt, history, tts)
    if reply:
        send_reply(reply)
    else:
        tts.speak("Sorry, I couldn't generate a reply.")


def _handle_end_session(tts) -> None:
    from comms.discord_bot import end_session_with_summary
    tts.speak("Ending Discord session.")
    end_session_with_summary()


# ── Chat → TTS stream ─────────────────────────────────────────────────────────

def stream_to_tts(text: str, history: list, tts) -> str:
    history.append({"role": "user", "content": text})
    past = [m for m in history[:-1] if m["role"] != "system"]

    try:
        resp = requests.post(
            f"{SERVER_URL}/chat",
            json={"message": text, "history": past},
            stream=True,
            timeout=120,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.error("Chat request failed: %s", e)
        return ""

    buffer = ""
    full_reply = []
    sentence_end = re.compile(r"(?<=[.!?])\s+")
    clause_break = re.compile(r"(?<=[,;:])\s+")

    for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
        if not chunk or chunk.startswith("[AURA_"):
            continue
        buffer += chunk

        parts = sentence_end.split(buffer)
        if len(parts) > 1:
            for sentence in parts[:-1]:
                sentence = sentence.strip()
                if sentence:
                    send_state("speaking")
                    tts.speak(sentence)
                    full_reply.append(sentence)
            buffer = parts[-1]
        elif len(buffer) > 80:
            parts = clause_break.split(buffer)
            if len(parts) > 1:
                for clause in parts[:-1]:
                    clause = clause.strip()
                    if clause:
                        send_state("speaking")
                        tts.speak(clause)
                        full_reply.append(clause)
                buffer = parts[-1]

    if buffer.strip():
        send_state("speaking")
        tts.speak(buffer.strip())
        full_reply.append(buffer.strip())

    reply = " ".join(full_reply)
    if reply:
        logger.info("Aura: %s", reply)
    history.append({"role": "assistant", "content": reply})
    if len(history) > 20:
        history[:] = history[-20:]
    return reply


# ── Session ───────────────────────────────────────────────────────────────────

def run_session(tts, whisper, history: list, ptt_mode: bool = False):
    tts.wait_until_done()

    wav_path = record_speech(ptt_mode=ptt_mode)
    if not wav_path:
        logger.info("Nothing recorded.")
        send_state("idle")
        return

    send_state("thinking")

    try:
        user_text = transcribe(whisper, wav_path)
    finally:
        try:
            os.unlink(wav_path)
        except Exception:
            pass

    if not user_text:
        tts.speak("Didn't catch that.")
        tts.wait_until_done()
        send_state("idle")
        return

    logger.info("You said: %s", user_text)
    display_user(user_text)

    from comms import state as comms_state
    session = comms_state.get_session()

    # ── End session ───────────────────────────────────────────────────────────
    if session and _matches(user_text, _END_KEYWORDS):
        _handle_end_session(tts)
        tts.wait_until_done()
        send_state("idle")
        return

    # ── Switch to auto-convo mode ─────────────────────────────────────────────
    if session and _matches(user_text, _AUTOCONVO_KEYWORDS):
        from comms.discord_bot import set_mode
        set_mode("auto")
        tts.wait_until_done()
        send_state("idle")
        return

    # ── Single intercept ──────────────────────────────────────────────────────
    if session and _matches(user_text, _INTERCEPT_KEYWORDS):
        _handle_single_intercept(session, history, tts)
        tts.wait_until_done()
        send_state("idle")
        return

    # ── Briefing ──────────────────────────────────────────────────────────────
    if _matches(user_text, _BRIEFING_KEYWORDS):
        _handle_briefing(tts)
        tts.wait_until_done()
        send_state("idle")
        return

    # ── Normal conversation ───────────────────────────────────────────────────
    reply = stream_to_tts(user_text, history, tts)
    if reply:
        display_aura(reply)

    tts.wait_until_done()
    send_state("idle")


# ── Main loop ─────────────────────────────────────────────────────────────────

def run(tts, whisper_size: str = "tiny"):
    import openwakeword
    from openwakeword.model import Model
    from faster_whisper import WhisperModel

    openwakeword.utils.download_models()
    oww = Model(wakeword_models=[WAKE_MODEL], inference_framework="onnx")

    logger.info("Loading Whisper [%s]...", whisper_size)
    whisper = WhisperModel(whisper_size, device="cpu", compute_type="int8")
    logger.info("Whisper ready.")

    history = []
    _start_keyboard_listener()
    tts.speak("Aura is ready.")
    logger.info("Voice pipeline running. Hold Right Shift to talk.")

    while not _stop.is_set():
        # Open the input stream only for wakeword/ptt detection, but
        # defer any call to `run_session()` until after the stream is
        # closed to avoid nested InputStream instances (PortAudio crashes).
        do_session = None
        with sd.InputStream(
            samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=CHUNK_SIZE
        ) as stream:
            while not _stop.is_set():
                if ptt_active.is_set():
                    do_session = (True)
                    break

                chunk, _ = stream.read(CHUNK_SIZE)
                score = oww.predict(
                    chunk.flatten().astype(np.int16)
                ).get(WAKE_MODEL, 0)

                if score >= DETECT_THRESH:
                    logger.info("Wake word detected! (%.2f)", score)
                    oww.reset()
                    send_state("listening")
                    do_session = (False)
                    break

        if do_session is not None:
            run_session(tts, whisper, history, ptt_mode=do_session)


def stop():
    _stop.set()