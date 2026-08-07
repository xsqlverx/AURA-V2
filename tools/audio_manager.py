"""COM-threaded AudioManager — ported directly from v1 working implementation."""

import threading
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from ctypes import cast, POINTER
    from comtypes import CLSCTX_ALL, CoInitialize
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    PYCAW_AVAILABLE = True
except ImportError:
    logger.warning("pycaw not installed. Audio control disabled.")
    PYCAW_AVAILABLE = False

_thread_local = threading.local()


def _reset_com():
    """Reset COM state so next call reinitialises."""
    if hasattr(_thread_local, "com_initialized"):
        del _thread_local.com_initialized


def _get_interface():
    """Get Windows audio endpoint interface (thread-safe). Exact v1 logic."""
    if not PYCAW_AVAILABLE:
        return None
    try:
        if not getattr(_thread_local, "com_initialized", False):
            CoInitialize()
            _thread_local.com_initialized = True

        devices = AudioUtilities.GetSpeakers()
        interface = devices.EndpointVolume  # ← the line that actually works
        return cast(interface, POINTER(IAudioEndpointVolume))
    except Exception as e:
        logger.error("Failed to get audio interface: %s", e)
        _reset_com()
        return None


def _handle_com_error(e: Exception):
    """Reset COM if the audio device has disappeared."""
    msg = str(e)
    if "removed" in msg.lower() or "not found" in msg.lower() or "element not found" in msg.lower():
        _reset_com()


def get_volume() -> Optional[int]:
    """Return current master volume as integer 0–100, or None on failure."""
    interface = _get_interface()
    if interface is None:
        return None
    try:
        return round(interface.GetMasterVolumeLevelScalar() * 100)
    except Exception as e:
        logger.error("get_volume failed: %s", e)
        _handle_com_error(e)
        return None


def set_volume(level: int) -> bool:
    """Set master volume to level (0–100). Returns True on success."""
    interface = _get_interface()
    if interface is None:
        return False
    try:
        clamped = max(0, min(100, int(float(str(level).replace("%", "").strip()))))
        interface.SetMasterVolumeLevelScalar(clamped / 100.0, None)
        logger.info("Volume set to %d%%", clamped)
        return True
    except Exception as e:
        logger.error("set_volume failed: %s", e)
        _handle_com_error(e)
        return False


def mute(muted: bool = True) -> bool:
    """Mute or unmute. Returns True on success."""
    interface = _get_interface()
    if interface is None:
        return False
    try:
        interface.SetMute(1 if muted else 0, None)
        return True
    except Exception as e:
        logger.error("mute failed: %s", e)
        _handle_com_error(e)
        return False