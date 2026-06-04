"""Active window tracker — polls foreground window title every 30s.

Starts as a daemon thread on backend boot. Keeps last 20 entries in memory.
Exposes get_recent_activity() for the briefing pipeline."""

import logging
import threading
import time
from collections import deque
from datetime import datetime

logger = logging.getLogger(__name__)

POLL_INTERVAL = 30
MAX_ENTRIES = 20

_tracker: deque = deque(maxlen=MAX_ENTRIES)
_lock = threading.Lock()
_running = False


def _get_foreground_window_title() -> str | None:
    """Get the title of the currently focused window via Win32 API."""
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        length = user32.GetWindowTextLengthW(hwnd) + 1
        buf = ctypes.create_unicode_buffer(length)
        user32.GetWindowTextW(hwnd, buf, length)
        return buf.value or None
    except Exception:
        return None


def _poll_loop() -> None:
    global _running
    _running = True
    while _running:
        try:
            title = _get_foreground_window_title()
            now = datetime.now().isoformat(timespec="seconds")
            with _lock:
                if title:
                    if not _tracker or _tracker[-1]["title"] != title:
                        _tracker.append({"time": now, "title": title})
                else:
                    _tracker.append({"time": now, "title": "(unknown)"})
        except Exception as e:
            logger.debug("Tracker poll error: %s", e)
        time.sleep(POLL_INTERVAL)


def start() -> None:
    t = threading.Thread(target=_poll_loop, daemon=True, name="window-tracker")
    t.start()
    logger.info("Window tracker started (poll every %ds)", POLL_INTERVAL)


def stop() -> None:
    global _running
    _running = False


def get_recent_activity() -> list[dict]:
    with _lock:
        return list(_tracker)
