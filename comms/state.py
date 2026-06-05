"""
Active Discord session state + shared TTS engine reference.
Thread-safe. Tracks session mode, message summary, and last activity time.
"""

import threading
import time

_lock = threading.Lock()
_session: dict | None = None

# TTS engine registry — set once at startup in main.py, read by the FastAPI
# server (different thread/process boundary, but same process) to expose
# voice-switching endpoints and broadcast voice changes to the UI.
_tts = None


def set_session(user_id: str, username: str, mode: str = "single") -> None:
    """
    mode: "single" — reply once per PTT command
          "auto"   — bot handles convo autonomously
    """
    global _session
    with _lock:
        _session = {
            "user_id":       user_id,
            "username":      username,
            "mode":          mode,
            "last_message":  "",
            "summary":       [],       # list of (sender, text) tuples
            "last_activity": time.time(),
        }


def get_session() -> dict | None:
    with _lock:
        return _session


def clear_session() -> None:
    global _session
    with _lock:
        _session = None


def is_active() -> bool:
    with _lock:
        return _session is not None


def set_mode(mode: str) -> None:
    with _lock:
        if _session:
            _session["mode"] = mode


def get_mode() -> str | None:
    with _lock:
        return _session["mode"] if _session else None


def set_last_message(text: str) -> None:
    with _lock:
        if _session:
            _session["last_message"] = text
            _session["last_activity"] = time.time()


def append_summary(sender: str, text: str) -> None:
    with _lock:
        if _session:
            _session["summary"].append((sender, text))
            _session["last_activity"] = time.time()


def get_summary() -> list:
    with _lock:
        return list(_session["summary"]) if _session else []


def get_last_activity() -> float:
    with _lock:
        return _session["last_activity"] if _session else 0.0


# ── TTS engine registry ───────────────────────────────────────────────────────

def set_tts(tts_engine) -> None:
    """Register the singleton TTS engine for cross-thread access."""
    global _tts
    with _lock:
        _tts = tts_engine


def get_tts():
    """Return the registered TTS engine, or None if not yet initialized."""
    with _lock:
        return _tts