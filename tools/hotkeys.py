"""Global hotkeys — Alt+M to stop TTS playback, Ctrl+Alt+S to toggle flow mode."""

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


def _on_flow_toggle():
    try:
        from core import handsfree
        new_state = handsfree.controller.toggle(source="hotkey")
        if _tts:
            if new_state:
                _tts.speak("Hands-free mode active. I'm listening.")
            else:
                _tts.speak("Hands-free mode deactivated.")
    except Exception as e:
        logger.error("Error in hands-free hotkey handler: %s", e)


def _on_emergency_handsfree_off():
    try:
        from core import handsfree
        handsfree.controller.disable(reason="emergency_hotkey")
        if _tts:
            _tts.stop_playback()
            _tts.speak("Hands-free mode emergency stopped.")
        logger.info("Emergency hands-free disable triggered via Ctrl+Alt+Esc.")
    except Exception as e:
        logger.error("Error in emergency handsfree hotkey handler: %s", e)


def _run_listener():
    if not PYNPUT_AVAILABLE:
        return
    try:
        hotkeys = keyboard.GlobalHotKeys({
            "<alt>+m": _on_mute,
            "<ctrl>+<alt>+s": _on_flow_toggle,
            "<ctrl>+<alt>+<esc>": _on_emergency_handsfree_off,
        })
        hotkeys.start()
    except Exception as e:
        logger.warning("Hotkey listener failed: %s", e)


def start_hotkeys():
    if not PYNPUT_AVAILABLE:
        return
    t = Thread(target=_run_listener, daemon=True)
    t.start()
