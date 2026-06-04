"""Global hotkeys — map Alt+M to stop TTS playback."""

import logging
from threading import Thread

logger = logging.getLogger(__name__)

try:
    from pynput import keyboard
    PYNPUT_AVAILABLE = True
except Exception:
    logger.warning("pynput not installed; global hotkeys disabled.")
    PYNPUT_AVAILABLE = False


_tts = None


def set_tts(tts):
    global _tts
    _tts = tts


def _on_mute():
    try:
        if _tts is not None:
            _tts.stop_playback()
            logger.info("Global hotkey pressed: stopped TTS playback.")
        else:
            logger.info("Global hotkey pressed but TTS not available.")
    except Exception as e:
        logger.error("Error in hotkey handler: %s", e)


def _run_listener():
    if not PYNPUT_AVAILABLE:
        return
    try:
        hotkeys = keyboard.GlobalHotKeys({"<alt>+m": _on_mute})
        hotkeys.start()
    except Exception as e:
        logger.warning("Hotkey listener failed: %s", e)


def start_hotkeys():
    if not PYNPUT_AVAILABLE:
        return
    t = Thread(target=_run_listener, daemon=True)
    t.start()
