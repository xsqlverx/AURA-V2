"""Now-playing detection via window titles + media transport via system tools.

get_now_playing() uses ctypes/psutil to detect media player windows and parse
their titles for song metadata. No WinRT/pythonnet dependency needed.

send_media_command() delegates to tools.system (pyautogui keyboard shortcuts).
"""

import logging
import threading
import time

import psutil

logger = logging.getLogger(__name__)

# Cache last known track so paused apps still show metadata
_last_track: dict | None = None
_last_track_time: float = 0.0
_last_track_lock = threading.Lock()
_CACHE_TTL = 60  # seconds — if no window found, return cached data as paused

# ── Window title detection via ctypes ─────────────────────────────────────────

_KNOWN_PLAYERS = {
    "spotify.exe": "Spotify",
    "wmplayer.exe": "Windows Media Player",
    "vlc.exe": "VLC",
    "chrome.exe": "Chrome",
    "msedge.exe": "Edge",
    "firefox.exe": "Firefox",
    "brave.exe": "Brave",
    "opera.exe": "Opera",
    "comet.exe": "Comet",
    "youtube music.exe": "YouTube Music",
}

_APP_EXCLUDES = {
    # Window title substrings that indicate "not playing anything"
    "spotify": [
        "spotify premium",
        "spotify free",
        "spotify - ",
        "advertisement",
    ],
    "wmplayer.exe": ["windows media player"],
    "vlc.exe": ["vlc media player"],
}

try:
    import ctypes
    from ctypes import wintypes

    _user32 = ctypes.windll.user32
    _WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    _CTYPES_OK = True
except Exception:
    _CTYPES_OK = False


def _is_playing_content(title: str, proc_name: str) -> bool:
    """Heuristic: reject window titles that look like the app's default chrome."""
    lowered = title.lower().strip()
    lookup_name = proc_name.replace(".exe", "").strip().lower()
    excludes = _APP_EXCLUDES.get(proc_name, _APP_EXCLUDES.get(lookup_name, []))
    for pattern in excludes:
        if lowered == pattern.strip().lower() or lowered.startswith(pattern.strip().lower()):
            return False
    # A single word that matches the app name = idle
    if lowered == proc_name.replace(".exe", "").strip().lower():
        return False
    return True


def get_now_playing() -> dict:
    """Detect currently playing media by scanning visible window titles.

    Returns: {title, artist, album (""), thumbnail_b64 (None),
              is_playing (bool), source_app (str)}
    """
    global _last_track, _last_track_time

    if not _CTYPES_OK:
        return {"error": "ctypes window enumeration unavailable"}

    candidates: list[dict] = []

    def _enum_proc(hwnd, _lparam):
        if not _user32.IsWindowVisible(hwnd):
            return True
        length = _user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return True
        buffer = ctypes.create_unicode_buffer(length + 1)
        _user32.GetWindowTextW(hwnd, buffer, length + 1)
        window_text = buffer.value

        pid = wintypes.DWORD()
        _user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            proc = psutil.Process(pid.value)
            proc_name = proc.name().lower()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return True

        if proc_name not in _KNOWN_PLAYERS:
            return True
        if not _is_playing_content(window_text, proc_name):
            return True

        candidates.append({
            "window_text": window_text,
            "proc_name": proc_name,
            "pid": pid.value,
        })
        return True

    cb = _WNDENUMPROC(_enum_proc)
    _user32.EnumWindows(cb, 0)

    now = time.time()

    if not candidates:
        with _last_track_lock:
            if _last_track and (now - _last_track_time) < _CACHE_TTL:
                cached = dict(_last_track)
                cached["is_playing"] = False
                return cached
        return {"error": "No active media player window detected"}

    best = candidates[0]

    title = best["window_text"]
    artist = ""

    # Try to parse "Song - Artist" or "Artist - Song" from window title
    if " - " in title:
        app_name = _KNOWN_PLAYERS.get(best["proc_name"], "")
        suffix = f" - {app_name}"
        clean_title = title[: -len(suffix)] if title.endswith(suffix) else title

        parts = clean_title.rsplit(" - ", 1)
        if len(parts) == 2:
            maybe_artist = parts[1].strip()
            maybe_title = parts[0].strip()
            if not maybe_artist.startswith(("http", "www", "//")) and not app_name.lower() in maybe_artist.lower():
                title = maybe_title
                artist = maybe_artist
                if len(maybe_artist) > len(maybe_title):
                    parts2 = clean_title.split(" - ", 1)
                    if len(parts2) == 2:
                        title = parts2[1].strip()
                        artist = parts2[0].strip()

    result = {
        "title": title,
        "artist": artist,
        "album": "",
        "thumbnail_b64": None,
        "is_playing": True,
        "source_app": _KNOWN_PLAYERS.get(best["proc_name"], best["proc_name"]),
    }

    with _last_track_lock:
        _last_track = result
        _last_track_time = now

    return result


# ── Media transport ───────────────────────────────────────────────────────────

def send_media_command(action: str) -> dict:
    """Delegate transport commands to tools.system (pyautogui).

    Actions: 'play_pause', 'next', 'prev'.
    """
    from tools import system

    match action:
        case "play_pause":
            return system.play_pause()
        case "next":
            return system.next_track()
        case "prev":
            return system.prev_track()
        case _:
            return {"error": f"Unknown action: {action}"}
