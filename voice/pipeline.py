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
import time

import numpy as np
import sounddevice as sd

from core.config import SERVER_URL, UI_SOCKET_PORT

logger = logging.getLogger(__name__)

SAMPLE_RATE    = 16000
CHUNK_SIZE     = 1280
SILENCE_SECS   = 0.8
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

GENDER_MAP = {
    "a guy": "M1", "the guy": "M1",
    "a male": "M1", "the male": "M1",
    "a man": "M1", "the man": "M1",
    "a boy": "M1", "the boy": "M1",
    "a girl": "F1", "the girl": "F1",
    "a female": "F1", "the female": "F1",
    "a woman": "F1", "the woman": "F1",
    "a lady": "F1", "the lady": "F1",
    "guy voice": "M1", "male voice": "M1",
    "man voice": "M1",
    "girl voice": "F1", "female voice": "F1",
    "woman voice": "F1",
}

_VOICE_INTENT_KEYWORDS = {
    "switch voice", "change voice", "use a different voice", "new voice",
    "different voice", "voice change", "change the voice",
    "list voices", "what voices", "which voices",
    "what voice", "current voice", "which voice",
    # broader conversational forms — 3+ words to minimise false positives
    "switch your voice", "change your voice",
    "deep voice", "high voice", "softer voice", "deeper voice",
    "lower voice", "higher voice",
    # gender-specific phrases that won't easily false-positive
    "male voice", "female voice", "guy voice", "girl voice",
    "man voice", "woman voice", "boy voice", "lady voice",
    # no-article gender-switch patterns (very specific, low false-positive)
    "switch to male", "switch to female",
    "switch to guy", "switch to girl",
    "switch to man", "switch to woman",
}

ptt_active = threading.Event()
flow_mode  = threading.Event()
_stop      = threading.Event()

# When True, the voice session releases the mic so dictation (/dictation) can record.
_dictation_active = False


def set_dictation_active(active: bool) -> None:
    global _dictation_active
    _dictation_active = bool(active)


def is_dictation_active() -> bool:
    return _dictation_active


def toggle_flow_mode(tts=None) -> bool:
    """Toggle flow mode on/off. Returns the new state."""
    if flow_mode.is_set():
        flow_mode.clear()
        logger.info("Flow mode deactivated.")
        send_state("idle")
        if tts:
            tts.speak("Flow mode deactivated.")
        return False
    else:
        flow_mode.set()
        logger.info("Flow mode activated.")
        send_state("flow_mode")
        if tts:
            tts.speak("Flow mode active. I'm listening.")
        return True


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
def display_briefing_chunk(text: str):  _send_socket(f"BRIEFING_CHUNK:{text}")


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
            try:
                stream.read(CHUNK_SIZE)
            except sd.PortAudioError:
                logger.warning("Audio device error during drain")
                return None

        while True:
            if _stop.is_set():
                break
            try:
                chunk, _ = stream.read(CHUNK_SIZE)
            except sd.PortAudioError:
                logger.warning("Audio device error during recording")
                return None
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
                if not speech_started and len(frames) >= int(3.0 * chunks_per_sec):
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
                    display_briefing_chunk(sentence)
                    full_reply.append(sentence)
            buffer = parts[-1]

    if buffer.strip():
        send_state("speaking")
        tts.speak(buffer.strip())
        display_briefing_chunk(buffer.strip())
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


# ── Voice switch (keyword + Groq LLM double-check) ────────────────────────────

_groq_client = None

def _llm_confirm_voice_intent(user_text: str) -> dict:
    """Cheap Groq call that classifies the spoken text as a voice-switch
    request. Returns one of:

        {"intent": "switch"}
        {"intent": "list"}
        {"intent": "current"}
        {"intent": "none"}

    Falls back to {"intent": "none"} on any error.
    """
    import json
    from groq import Groq
    from core.config import GROQ_API_KEY

    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)

    system = (
        "You classify short voice-pipeline commands about TTS voices. "
        "Respond with ONLY a JSON object with key 'intent': "
        "one of: switch, list, current, none. "
        "Examples: "
        '{"intent":"switch"}  ("change your voice", "use a different voice") '
        '{"intent":"list"}    ("what voices do you have", "list voices") '
        '{"intent":"current"} ("what voice are you using", "current voice") '
        '{"intent":"none"}'
    )
    try:
        client = _groq_client
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            temperature=0,
            max_tokens=40,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content.strip()
        data = json.loads(raw)
        intent = data.get("intent", "none")
        if intent not in ("switch", "list", "current", "none"):
            intent = "none"
        return {"intent": intent}
    except Exception as e:
        logger.warning("Voice intent LLM check failed: %s", e)
        return {"intent": "none"}


def _broadcast_voice_change(voice_name: str) -> None:
    """Notify the UI that the active voice changed (over the 9001 socket
    bridge, which the FastAPI server then re-broadcasts over WebSocket)."""
    try:
        _send_socket(f"VOICE_CHANGED:{voice_name}")
    except Exception:
        pass


def _handle_voice_switch(tts, user_text: str) -> None:
    """Voice-switch: keyword + Groq LLM double-check."""

    lowered = user_text.lower()
    available = tts.list_voices()

    # Gender-based candidate
    candidate = None
    for phrase, code in GENDER_MAP.items():
        if phrase in lowered:
            candidate = code
            break

    # Try to extract a voice name from the text (e.g. "switch to en-US-JennyNeural")
    if candidate is None:
        for v in available:
            name_lower = v.lower()
            if name_lower in lowered:
                candidate = v
                break

    asks_to_list = any(kw in lowered for kw in (
        "list voices", "what voices", "which voices",
    ))
    asks_current = any(kw in lowered for kw in (
        "what voice", "current voice", "which voice",
    ))
    asks_switch = candidate is not None or any(
        kw in lowered for kw in _VOICE_INTENT_KEYWORDS
    )

    if not (asks_switch or asks_to_list or asks_current):
        return

    decision = _llm_confirm_voice_intent(user_text)
    logger.info("Voice intent: candidate=%s, llm=%s", candidate, decision)

    if decision["intent"] == "none":
        tts.speak(
            "I want to be sure — did you mean to change my voice? "
            "Say something like: switch to a male voice, or list voices."
        )
        return

    if decision["intent"] == "current" or (asks_current and not asks_switch and not asks_to_list):
        tts.speak(f"I'm currently using voice {tts.get_current_voice()}.")
        return

    if decision["intent"] == "list":
        if len(available) > 20:
            tts.speak(f"There are {len(available)} voices available. Try saying switch to a male voice or switch to Jenny.")
        else:
            tts.speak("Available voices: " + ", ".join(available[:20]) + ".")
        return

    if not candidate:
        tts.speak(
            "I caught the voice-switch intent but didn't catch which voice. "
            "Try: switch to a male voice, or switch to Jenny."
        )
        return

    if tts.set_voice(candidate):
        tts.speak(f"Switched to {candidate}.")
        _broadcast_voice_change(candidate)
    else:
        tts.speak(f"Sorry, I couldn't load voice {candidate}.")


# ── Chat → TTS stream ─────────────────────────────────────────────────────────

async def _stream_to_tts_async(text: str, history: list, tts) -> str:
    """Async: calls agent.run() directly (no HTTP loopback) and feeds TTS phrase-by-phrase."""
    from core.agent import run
    history.append({"role": "user", "content": text})
    past = [m for m in history[:-1] if m["role"] != "system"]

    buffer = ""
    full_reply = []

    async for chunk in run(text, past):
        if not chunk:
            continue
        buffer += chunk

        # Feed TTS — sentence-boundary splits at ~60+ chars for fast first audio
        while len(buffer) > 60:
            split_at = -1
            for sep in (". ", "! ", "? "):
                idx = buffer.rfind(sep, 0, -1)
                if idx > 30:
                    split_at = max(split_at, idx + 1)
            if split_at > 30:
                phrase = buffer[:split_at]
                buffer = buffer[split_at + 1:]
            else:
                last_space = buffer.rfind(" ", 0, -1)
                if last_space < 30:
                    break
                phrase = buffer[:last_space]
                buffer = buffer[last_space + 1:]
            if phrase.strip():
                send_state("speaking")
                tts.speak(phrase.strip())
                display_briefing_chunk(phrase.strip())
                full_reply.append(phrase.strip())

    # Flush remaining buffer
    if buffer.strip():
        send_state("speaking")
        tts.speak(buffer.strip())
        display_briefing_chunk(buffer.strip())
        full_reply.append(buffer.strip())

    reply = " ".join(full_reply)
    if reply:
        logger.info("Aura: %s", reply)
    history.append({"role": "assistant", "content": reply})
    if len(history) > 20:
        history[:] = history[-20:]
    return reply


def stream_to_tts(text: str, history: list, tts) -> str:
    """Sync wrapper — runs the async version in a new event loop on this thread."""
    import asyncio
    try:
        return asyncio.run(_stream_to_tts_async(text, history, tts))
    except Exception as e:
        logger.error("stream_to_tts failed: %s", e)
        return ""


# ── Utterance processing ──────────────────────────────────────────────────────

def _process_utterance(tts, whisper, history, wav_path) -> bool:
    """Transcribe a wav and handle the result. Returns True if something was processed."""
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
        return False

    logger.info("You said: %s", user_text)
    display_user(user_text)

    from comms import state as comms_state
    session = comms_state.get_session()

    if session and _matches(user_text, _END_KEYWORDS):
        _handle_end_session(tts)
        tts.wait_until_done()
        return True

    if session and _matches(user_text, _AUTOCONVO_KEYWORDS):
        from comms.discord_bot import set_mode
        set_mode("auto")
        tts.wait_until_done()
        return True

    if session and _matches(user_text, _INTERCEPT_KEYWORDS):
        _handle_single_intercept(session, history, tts)
        tts.wait_until_done()
        return True

    if _matches(user_text, _BRIEFING_KEYWORDS):
        _handle_briefing(tts)
        tts.wait_until_done()
        return True

    if _matches(user_text, _VOICE_INTENT_KEYWORDS):
        _handle_voice_switch(tts, user_text)
        tts.wait_until_done()
        return True

    reply = stream_to_tts(user_text, history, tts)
    if reply:
        display_aura(reply)
    tts.wait_until_done()
    return True


# ── Session ───────────────────────────────────────────────────────────────────

def run_session(tts, whisper, history: list, ptt_mode: bool = False):
    tts.wait_until_done()

    wav_path = record_speech(ptt_mode=ptt_mode)
    if not wav_path:
        logger.info("Nothing recorded.")
        if not flow_mode.is_set():
            send_state("idle")
        return

    _process_utterance(tts, whisper, history, wav_path)

    if not flow_mode.is_set():
        send_state("idle")


# ── Flow mode continuous listen ──────────────────────────────────────────────
# Adopts the Mark-L pattern: keep the InputStream alive, use VAD to segment
# utterances, check flow_mode between every chunk for instant deactivation.

def _flow_listen_loop(tts, whisper, history):
    """Continuous-stream listen loop for flow mode. Never opens/closes the mic."""
    required_silent = int(SILENCE_SECS * SAMPLE_RATE / CHUNK_SIZE)
    drain_chunks = int(0.4 * SAMPLE_RATE / CHUNK_SIZE)
    # Rolling buffer ~0.3s to capture speech onset
    pre_buf = []
    pre_max = int(0.3 * SAMPLE_RATE / CHUNK_SIZE)

    send_state("listening")

    with sd.InputStream(
        samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=CHUNK_SIZE
    ) as stream:
        for _ in range(drain_chunks):
            if not flow_mode.is_set() or _stop.is_set():
                return
            try:
                stream.read(CHUNK_SIZE)
            except sd.PortAudioError:
                return

        while flow_mode.is_set() and not _stop.is_set() and not _dictation_active:
            frames = []
            silent_chunks = 0
            speech_started = False

            # Wait for speech onset (check flow_mode between chunks)
            while flow_mode.is_set() and not _stop.is_set() and not _dictation_active:
                try:
                    chunk, _ = stream.read(CHUNK_SIZE)
                except sd.PortAudioError:
                    return
                amplitude = np.abs(chunk).max()
                pre_buf.append(chunk.copy())
                if len(pre_buf) > pre_max:
                    pre_buf.pop(0)

                if amplitude > SPEECH_THRESH:
                    frames = list(pre_buf) + [chunk.copy()]
                    speech_started = True
                    pre_buf.clear()
                    break

            if not speech_started or not flow_mode.is_set():
                continue

            # Record until silence (check flow_mode between chunks)
            while flow_mode.is_set() and not _stop.is_set() and not _dictation_active:
                try:
                    chunk, _ = stream.read(CHUNK_SIZE)
                except sd.PortAudioError:
                    break
                amplitude = np.abs(chunk).max()
                frames.append(chunk.copy())

                if amplitude > SPEECH_THRESH:
                    silent_chunks = 0
                else:
                    silent_chunks += 1

                if silent_chunks >= required_silent:
                    break

            if not flow_mode.is_set() or _stop.is_set() or len(frames) < 5:
                continue

            send_state("thinking")

            tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            audio = np.concatenate(frames, axis=0)
            with wave.open(tmp.name, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(SAMPLE_RATE)
                wf.writeframes(audio.tobytes())
            tmp.close()

            _process_utterance(tts, whisper, history, tmp.name)

            tts.wait_until_done()
            if flow_mode.is_set() and not _stop.is_set():
                send_state("listening")


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
        if _dictation_active:
            time.sleep(0.2)
            continue

        # Flow mode — continuous-stream listen loop (Mark-L style)
        if flow_mode.is_set():
            _flow_listen_loop(tts, whisper, history)
            continue

        # Open the input stream only for wakeword/ptt detection, but
        # defer any call to `run_session()` until after the stream is
        # closed to avoid nested InputStream instances (PortAudio crashes).
        do_session = None
        with sd.InputStream(
            samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=CHUNK_SIZE
        ) as stream:
            while not _stop.is_set():
                if flow_mode.is_set() or _dictation_active:
                    break

                if ptt_active.is_set():
                    do_session = (True)
                    break

                try:
                    chunk, _ = stream.read(CHUNK_SIZE)
                except sd.PortAudioError:
                    logger.warning("Audio device error, reopening stream...")
                    break

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