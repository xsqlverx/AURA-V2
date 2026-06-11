"""System tools — volume, media, apps, files, system control, clipboard, notes, input."""

import os
import re
import json
import subprocess
import webbrowser
import logging
import shutil
import tempfile
from pathlib import Path
from datetime import datetime

import psutil
import pyperclip

from tools.audio_manager import get_volume as _get_volume, set_volume as _set_volume, mute as _mute

logger = logging.getLogger(__name__)

NOTES_DIR = Path.home() / "Documents" / "AuraNotes"
NOTES_DIR.mkdir(parents=True, exist_ok=True)


# ── Audio ─────────────────────────────────────────────────────────────────────

def get_volume() -> dict:
    level = _get_volume()
    return {"success": True, "volume": level} if level is not None else {"error": "Could not read volume"}

def set_volume(level: int) -> dict:
    try:
        parsed = int(float(str(level).replace("%", "").strip()))
    except Exception:
        return {"error": "Invalid volume level"}

    ok = _set_volume(parsed)
    new_level = _get_volume()
    if ok:
        applied = new_level if new_level is not None else max(0, min(100, parsed))
        return {"success": True, "volume": applied}
    else:
        return {"error": "Could not set volume"}

def mute_audio(muted: bool = True) -> dict:
    ok = _mute(muted)
    return {"success": True, "muted": muted} if ok else {"error": "Could not mute/unmute"}


# ── Media ─────────────────────────────────────────────────────────────────────

def _press(key: str) -> dict:
    try:
        import pyautogui
        pyautogui.press(key)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def play_pause() -> dict:    return _press("playpause")
def next_track() -> dict:    return _press("nexttrack")
def prev_track() -> dict:    return _press("prevtrack")


# ── App Launcher ──────────────────────────────────────────────────────────────

APP_MAP = {
    "spotify":       "spotify.exe",
    "calculator":    "calc.exe",
    "notepad":       "notepad.exe",
    "vscode":        "code",
    "vs code":       "code",
    "chrome":        "chrome.exe",
    "brave":         "brave.exe",
    "firefox":       "firefox.exe",
    "opera":         "opera.exe",
    "task manager":  "taskmgr.exe",
    "file explorer": "explorer.exe",
    "explorer":      "explorer.exe",
    "settings":      "ms-settings:",
    "paint":         "mspaint.exe",
    "cmd":           "cmd.exe",
    "terminal":      "wt.exe",
    "powershell":    "powershell.exe",
    "word":          "winword.exe",
    "excel":         "excel.exe",
    "powerpoint":    "powerpnt.exe",
    "whatsapp":      "whatsapp:",
    "telegram":      "telegram.exe",
    "discord":       "discord.exe",
    "vlc":           "vlc.exe",
    "obs":           "obs64.exe",
    "steam":         "steam.exe",
}

def launch_app(app_name: str) -> dict:
    key = app_name.lower().strip()
    exe = APP_MAP.get(key, app_name)
    try:
        if exe.endswith(":") or exe.startswith("http"):
            os.startfile(exe)
        else:
            subprocess.Popen(exe, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info("Launched: %s", exe)
        return {"success": True, "launched": exe}
    except Exception as e:
        logger.error("launch_app failed: %s", e)
        return {"error": str(e)}

def list_running_processes(filter_pattern: str = None) -> dict:
    try:
        procs = []
        for p in psutil.process_iter(["pid", "name"]):
            try:
                name = p.info["name"]
                if filter_pattern is None or filter_pattern.lower() in name.lower():
                    procs.append(f"{name} (PID: {p.info['pid']})")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return {"processes": procs, "count": len(procs)}
    except Exception as e:
        return {"error": str(e)}


# ── File Management ───────────────────────────────────────────────────────────

SHORTCUTS = {
    "downloads": Path.home() / "Downloads",
    "documents": Path.home() / "Documents",
    "desktop":   Path.home() / "Desktop",
    "pictures":  Path.home() / "Pictures",
    "music":     Path.home() / "Music",
}

def open_path(path: str) -> dict:
    try:
        resolved = SHORTCUTS.get(path.lower().strip(), Path(path))
        os.startfile(str(resolved))
        return {"success": True, "opened": str(resolved)}
    except Exception as e:
        return {"error": str(e)}

def create_folder(folder_path: str) -> dict:
    try:
        Path(folder_path).mkdir(parents=True, exist_ok=True)
        return {"success": True, "path": folder_path}
    except Exception as e:
        return {"error": str(e)}

def list_directory(dir_path: str = ".") -> dict:
    try:
        p = Path(dir_path)
        if not p.exists():
            return {"error": f"Not found: {dir_path}"}
        return {
            "files":   [f.name for f in p.iterdir() if f.is_file()],
            "folders": [f.name for f in p.iterdir() if f.is_dir()],
        }
    except Exception as e:
        return {"error": str(e)}


# ── Web ───────────────────────────────────────────────────────────────────────

Z_AGENT_TOGGLE = (645, 236)
Z_CHAT_INPUT   = (662, 666)

def open_z_agent(elaborated_prompt: str) -> dict:
    import pyautogui, webbrowser, time
    try:
        webbrowser.open("https://chat.z.ai")
        time.sleep(4)
        pyautogui.hotkey('f11')
        time.sleep(1)
        pyautogui.click(*Z_AGENT_TOGGLE)
        time.sleep(0.5)
        pyautogui.click(*Z_CHAT_INPUT)
        time.sleep(0.3)
        pyautogui.write(elaborated_prompt, interval=0.015)
        time.sleep(0.2)
        pyautogui.press('enter')
        return {"success": True, "submitted": elaborated_prompt[:80] + "..."}
    except Exception as e:
        return {"error": str(e)}

def open_website(url: str) -> dict:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        webbrowser.open(url)
        return {"success": True, "url": url}
    except Exception as e:
        return {"error": str(e)}


# ── System Control ────────────────────────────────────────────────────────────

def shutdown(delay_seconds: int = 20) -> dict:
    try:
        subprocess.Popen(f"shutdown /s /t {delay_seconds}", shell=True)
        return {"success": True, "message": f"Shutting down in {delay_seconds}s"}
    except Exception as e:
        return {"error": str(e)}

def restart(delay_seconds: int = 30) -> dict:
    try:
        subprocess.Popen(f"shutdown /r /t {delay_seconds}", shell=True)
        return {"success": True, "message": f"Restarting in {delay_seconds}s"}
    except Exception as e:
        return {"error": str(e)}

def sleep_pc() -> dict:
    try:
        subprocess.Popen("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def lock_pc() -> dict:
    try:
        subprocess.Popen("rundll32.exe user32.dll,LockWorkStation", shell=True)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def cancel_shutdown() -> dict:
    try:
        subprocess.Popen("shutdown /a", shell=True)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def get_system_stats() -> dict:
    try:
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        result = {
            "cpu_percent":   psutil.cpu_percent(interval=0.5),
            "ram_percent":   ram.percent,
            "ram_used_gb":   round(ram.used / 1e9, 2),
            "ram_total_gb":  round(ram.total / 1e9, 2),
            "disk_percent":  disk.percent,
            "disk_used_gb":  round(disk.used / 1e9, 2),
            "disk_total_gb": round(disk.total / 1e9, 2),
        }

        # Battery
        battery = psutil.sensors_battery()
        if battery is not None:
            result["battery_percent"] = round(battery.percent, 1)
            result["power_plugged"] = battery.power_plugged

        # Uptime
        boot = psutil.boot_time()
        uptime_seconds = int(datetime.now().timestamp() - boot)
        days, remainder = divmod(uptime_seconds, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, _ = divmod(remainder, 60)
        parts = []
        if days:
            parts.append(f"{days}d")
        if hours:
            parts.append(f"{hours}h")
        parts.append(f"{minutes}m")
        result["uptime"] = " ".join(parts)
        result["uptime_seconds"] = uptime_seconds

        return result
    except Exception as e:
        return {"error": str(e)}


# ── Clipboard ─────────────────────────────────────────────────────────────────

def clipboard_copy(text: str) -> dict:
    try:
        pyperclip.copy(text)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def clipboard_paste() -> dict:
    try:
        return {"success": True, "text": pyperclip.paste()}
    except Exception as e:
        return {"error": str(e)}


# ── Notes ─────────────────────────────────────────────────────────────────────

def _note_path(name: str) -> Path:
    safe = re.sub(r"[^\w\s-]", "", name).strip().replace(" ", "_")
    return NOTES_DIR / f"{safe}.txt"

def write_note(name: str, content: str) -> dict:
    try:
        p = _note_path(name)
        p.write_text(content, encoding="utf-8")
        return {"success": True, "path": str(p)}
    except Exception as e:
        return {"error": str(e)}

def append_note(name: str, content: str) -> dict:
    try:
        p = _note_path(name)
        with open(p, "a", encoding="utf-8") as f:
            f.write(f"\n{content}")
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def read_note(name: str) -> dict:
    try:
        p = _note_path(name)
        if not p.exists():
            return {"error": f"Note '{name}' not found"}
        return {"success": True, "content": p.read_text(encoding="utf-8")}
    except Exception as e:
        return {"error": str(e)}

def list_notes() -> dict:
    try:
        notes = [f.stem for f in NOTES_DIR.glob("*.txt")]
        return {"notes": notes, "count": len(notes)}
    except Exception as e:
        return {"error": str(e)}

def search_notes(query: str) -> dict:
    try:
        matches = []
        for f in NOTES_DIR.glob("*.txt"):
            content = f.read_text(encoding="utf-8")
            if query.lower() in content.lower():
                matches.append(f.stem)
        return {"matches": matches, "count": len(matches)}
    except Exception as e:
        return {"error": str(e)}


# ── Input Control ─────────────────────────────────────────────────────────────

def type_text(text: str) -> dict:
    try:
        import pyautogui
        pyautogui.write(text, interval=0.03)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def press_key(key: str) -> dict:
    try:
        import pyautogui
        pyautogui.press(key)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def execute_hotkey(*keys) -> dict:
    try:
        import pyautogui
        pyautogui.hotkey(*keys)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}