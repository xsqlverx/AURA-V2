"""System tools — volume, media, apps, files, system control, clipboard, notes, input."""

import json
import os
import re
import subprocess
import threading
import time
import webbrowser
import logging
from collections import deque
from pathlib import Path
from datetime import datetime
from urllib.parse import quote_plus

import psutil
import pyperclip
import requests

from tools.audio_manager import get_volume as _get_volume, set_volume as _set_volume, mute as _mute

logger = logging.getLogger(__name__)

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
    "obsidian":      "obsidian.exe",
    "steam":         "steam.exe",
    "logseq":        "logseq.exe",
    "notion":        "notion.exe",
    "slack":         "slack.exe",
}

def launch_app(app_name: str) -> dict:
    key = app_name.lower().strip()
    exe = APP_MAP.get(key, app_name)
    try:
        if exe.endswith(":") or exe.startswith("http"):
            os.startfile(exe)
        else:
            subprocess.Popen([exe], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info("Launched: %s", exe)
        return {"success": True, "launched": exe}
    except Exception as e:
        logger.error("launch_app failed: %s", e)
        return {"error": str(e)}

SYSTEM_PROC_NAMES = {
    "svchost.exe", "system", "system idle process", "registry",
    "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe",
    "services.exe", "lsass.exe", "lsm.exe", "svchost.exe",
    "fontdrvhost.exe", "dwm.exe", "conhost.exe",
    "runtimebroker.exe", "securityhealthservice.exe",
    "sihost.exe", "taskhostw.exe", "ctfmon.exe",
    "startmenuexperiencehost.exe", "searchapp.exe",
    "widgets.exe", "widgetservice.exe",
    "ntoskrnl.exe", "hal.dll", "ntdll.dll",
    "windows.internal.shellcommon.dll",
    "shellexperiencehost.exe",
    "systemsettings.exe", "lockapp.exe", "applicationframehost.exe",
    "backgroundtaskhost.exe", "userinit.exe",
    "wmiprvse.exe", "spoolsv.exe", "wlms.exe",
    "sppsvc.exe", "trustedinstaller.exe",
}

def list_running_processes(filter_pattern: str = None, exclude_system: bool = True) -> dict:
    try:
        procs = []
        for p in psutil.process_iter(["pid", "name"]):
            try:
                name = p.info["name"]
                if exclude_system and name.lower() in SYSTEM_PROC_NAMES:
                    continue
                if filter_pattern is None or filter_pattern.lower() in name.lower():
                    procs.append({"pid": p.info["pid"], "name": name})
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        procs.sort(key=lambda x: x["name"].lower())
        return {"processes": procs, "count": len(procs)}
    except Exception as e:
        return {"error": str(e)}


def get_top_processes(n: int = 15) -> dict:
    try:
        procs = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                cpu = p.info["cpu_percent"] or 0
                mem = p.info["memory_percent"] or 0
                procs.append({
                    "pid": p.info["pid"],
                    "name": p.info["name"],
                    "cpu_percent": round(cpu, 1),
                    "memory_percent": round(mem, 1),
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        procs.sort(key=lambda x: x["cpu_percent"], reverse=True)
        return {"processes": procs[:n], "count": len(procs[:n])}
    except Exception as e:
        return {"error": str(e)}


def kill_process(pid: int) -> dict:
    try:
        p = psutil.Process(pid)
        name = p.name()
        p.terminate()
        p.wait(timeout=3)
        return {"success": True, "terminated": name, "pid": pid}
    except psutil.TimeoutExpired:
        try:
            p.kill()
            return {"success": True, "killed": name, "pid": pid}
        except Exception as e:
            return {"error": f"Force kill failed: {e}"}
    except psutil.NoSuchProcess:
        return {"error": "Process not found"}
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

_last_z_agent_call = 0.0
_z_lock = threading.Lock()

def open_z_agent(elaborated_prompt: str) -> dict:
    from tools.browser_agent import z_agent_submit
    global _last_z_agent_call
    with _z_lock:
        if time.time() - _last_z_agent_call < 10:
            return {"success": True, "already_called": True}
        _last_z_agent_call = time.time()
    return z_agent_submit(elaborated_prompt)

def open_website(url: str) -> dict:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        webbrowser.open(url)
        return {"success": True, "url": url}
    except Exception as e:
        return {"error": str(e)}


def play_youtube(query: str) -> dict:
    """Play a YouTube video for the given song/artist/topic.

    Priority 1 for 'play/watch/listen' intent. Searches YouTube via the
    public frontend HTML, extracts the first non-Shorts video ID via regex,
    and opens the watch URL directly in the browser so the video actually
    plays. Falls back to opening the filtered search results page.
    """
    query = (query or "").strip()
    if not query:
        return {"error": "No query provided for play_youtube"}

    encoded = quote_plus(query)
    # Video filter (sp=EgIQAQ%3D%3D) narrows results to Videos only
    search_url = (
        f"https://www.youtube.com/results"
        f"?search_query={encoded}&sp=EgIQAQ%3D%3D"
    )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        r = requests.get(search_url, headers=headers, timeout=10)
        html = r.text

        # Extract all video IDs — YouTube embeds them as JSON in the HTML
        video_ids = re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', html)

        seen = set()
        for vid in video_ids:
            if vid in seen:
                continue
            seen.add(vid)
            # Skip YouTube Shorts
            if f'/shorts/{vid}' in html:
                continue
            watch_url = f"https://www.youtube.com/watch?v={vid}"
            webbrowser.open(watch_url)
            logger.info("play_youtube: opening %s for query=%s", watch_url, query)
            return {
                "success": True,
                "action": "playing_youtube",
                "query": query,
                "url": watch_url,
            }

        # No valid video found — open search page
        webbrowser.open(search_url)
        return {
            "success": True,
            "action": "opened_youtube_search",
            "query": query,
            "url": search_url,
            "warning": "Could not find a valid video, opened search results",
        }

    except Exception as e:
        logger.warning("play_youtube scrape failed (%s), falling back to search page", e)
        try:
            webbrowser.open(search_url)
            return {"success": True, "action": "opened_youtube_search_fallback", "query": query, "url": search_url}
        except Exception as e2:
            return {"error": str(e2)}


# ── System Control ────────────────────────────────────────────────────────────

def shutdown(delay_seconds: int = 20) -> dict:
    try:
        subprocess.Popen(["shutdown", "/s", "/t", str(delay_seconds)])
        return {"success": True, "message": f"Shutting down in {delay_seconds}s"}
    except Exception as e:
        return {"error": str(e)}

def restart(delay_seconds: int = 30) -> dict:
    try:
        subprocess.Popen(["shutdown", "/r", "/t", str(delay_seconds)])
        return {"success": True, "message": f"Restarting in {delay_seconds}s"}
    except Exception as e:
        return {"error": str(e)}

def sleep_pc() -> dict:
    try:
        subprocess.Popen(["rundll32.exe", "powrprof.dll", "SetSuspendState", "0", "1", "0"])
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def lock_pc() -> dict:
    try:
        subprocess.Popen(["rundll32.exe", "user32.dll", "LockWorkStation"])
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def cancel_shutdown() -> dict:
    try:
        subprocess.Popen(["shutdown", "/a"])
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

# ── Network throughput sampler (continuous background thread) ────────────────
_net_lock = threading.Lock()
_net_samples = deque(maxlen=6)  # last 6 samples (~12s window)
_net_smoothed = {"sent_mbps": 0.0, "recv_mbps": 0.0}
_net_thread_started = False

def _net_sampler_loop():
    """Sample network counters every 2 seconds, keep a rolling average."""
    global _net_smoothed, _net_samples, _net_thread_started
    try:
        prev = psutil.net_io_counters()
        prev_time = time.time()
        while True:
            time.sleep(2)
            try:
                cur = psutil.net_io_counters()
                cur_time = time.time()
                elapsed = cur_time - prev_time
                if elapsed > 0:
                    sent_mbps = (cur.bytes_sent - prev.bytes_sent) / elapsed / 1_000_000
                    recv_mbps = (cur.bytes_recv - prev.bytes_recv) / elapsed / 1_000_000
                    with _net_lock:
                        _net_samples.append((sent_mbps, recv_mbps))
                        if _net_samples:
                            avg_sent = sum(s for s, _ in _net_samples) / len(_net_samples)
                            avg_recv = sum(r for _, r in _net_samples) / len(_net_samples)
                            _net_smoothed = {
                                "sent_mbps": round(avg_sent, 2),
                                "recv_mbps": round(avg_recv, 2),
                            }
                prev, prev_time = cur, cur_time
            except Exception:
                pass
    except Exception:
        pass
    finally:
        _net_thread_started = False

def _ensure_net_sampler():
    global _net_thread_started
    if not _net_thread_started:
        _net_thread_started = True
        t = threading.Thread(target=_net_sampler_loop, daemon=True)
        t.start()


def get_system_stats() -> dict:
    _ensure_net_sampler()
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
        now_ts = datetime.now().timestamp()
        uptime_seconds = int(now_ts - boot)
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

        # Network throughput (smoothed from background sampler)
        with _net_lock:
            result["network_sent_mbps"] = _net_smoothed["sent_mbps"]
            result["network_recv_mbps"] = _net_smoothed["recv_mbps"]

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


# ── Tasks / Reminders ─────────────────────────────────────────────────────────

_TASKS_FILE = Path(__file__).resolve().parent.parent / "data" / "tasks.json"

def _load_tasks() -> list[dict]:
    if not _TASKS_FILE.exists():
        return []
    try:
        return json.loads(_TASKS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save_tasks(tasks: list[dict]):
    _TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _TASKS_FILE.write_text(json.dumps(tasks, indent=2), encoding="utf-8")

def _next_id(tasks: list[dict]) -> str:
    mx = 0
    for t in tasks:
        try:
            mx = max(mx, int(t.get("id", 0)))
        except (ValueError, TypeError):
            pass
    return str(mx + 1)

def create_task(name: str, date: str, time: str = "", category: str = "General") -> dict:
    try:
        if not name or not date:
            return {"error": "name and date are required"}
        tasks = _load_tasks()
        task = {
            "id": _next_id(tasks),
            "name": name,
            "category": category,
            "color": {"Work": "#00A0FF", "Health": "#00FF80", "Personal": "#FF5050", "Study": "#BF5AF2", "General": "#888888"}.get(category, "#888888"),
            "time": time,
            "date": date,
        }
        tasks.append(task)
        _save_tasks(tasks)
        return {"success": True, "task": task}
    except Exception as e:
        return {"error": str(e)}

def list_tasks(date: str = "") -> dict:
    try:
        tasks = _load_tasks()
        if date:
            tasks = [t for t in tasks if t.get("date", "") == date]
        return {"success": True, "tasks": tasks}
    except Exception as e:
        return {"error": str(e)}

def delete_task(task_id: str) -> dict:
    try:
        if not task_id:
            return {"error": "task_id is required"}
        tasks = _load_tasks()
        before = len(tasks)
        tasks = [t for t in tasks if t.get("id") != task_id]
        if len(tasks) < before:
            _save_tasks(tasks)
            return {"success": True, "deleted": True}
        return {"success": True, "deleted": False, "message": "Task not found"}
    except Exception as e:
        return {"error": str(e)}