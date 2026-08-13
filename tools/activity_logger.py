"""Continuous activity logger — boot/logon, apps+duration, browser history.

Daemon threads write to data/activity/log.jsonl on every backend boot.
Exposes get_activity_log() and get_activity_summary() for API endpoints."""

import json
import logging
import os
import shutil
import sqlite3
import subprocess
import tempfile
import threading
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "activity"
LOG_FILE = DATA_DIR / "log.jsonl"

POLL_APPS_INTERVAL = 5
POLL_BROWSER_INTERVAL = 60
FOREGROUND_STALE_THRESHOLD = 120

_lock = threading.Lock()
_running = False

FILETIME_EPOCH = datetime(1601, 1, 1, tzinfo=timezone.utc)


# ── JSONL persistence ──────────────────────────────────────────────────────────

def _append_event(event_type: str, data: dict) -> None:
    try:
        with _lock:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            entry = {"ts": datetime.now().isoformat(timespec="seconds"), "type": event_type, "data": data}
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        logger.debug("Activity log write error: %s", e)


def _read_log(limit: int = 0) -> list[dict]:
    if not LOG_FILE.exists():
        return []
    try:
        with _lock:
            lines = LOG_FILE.read_text(encoding="utf-8").strip().splitlines()
        if limit > 0:
            lines = lines[-limit:]
        events = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return events
    except Exception:
        return []


# ── Boot / logon events ───────────────────────────────────────────────────────

def _filetime_to_iso(ft: int) -> str | None:
    if ft <= 0:
        return None
    try:
        dt = FILETIME_EPOCH + timedelta(microseconds=ft // 10)
        return dt.isoformat(timespec="seconds")
    except Exception:
        return None


def _record_boot_event() -> None:
    import psutil
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    _append_event("boot", {"boot_time": boot_time.isoformat(timespec="seconds"), "type": "startup"})


def _read_security_logon_events() -> None:
    try:
        result = subprocess.run(
            ["wevtutil", "qe", "Security", "/c:10", "/f:xml", "/rd:true",
             "/q:*[System[(EventID=4624)]]"],
            capture_output=True, text=True, timeout=15,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if result.returncode != 0 or not result.stdout.strip():
            return
        import xml.etree.ElementTree as ET
        root = ET.fromstring(result.stdout)
        for event in root.findall(".//Event"):
            data_nodes = {d.get("Name"): d.text for d in event.findall(".//EventData/Data") if d.get("Name")}
            logon_type = data_nodes.get("LogonType", "")
            if logon_type not in ("2", "10", "7"):
                continue
            user = data_nodes.get("TargetUserName", "")
            if user and not user.endswith("$"):
                _append_event("logon", {
                    "user": user,
                    "sid": data_nodes.get("TargetUserSid", ""),
                    "logon_type": logon_type,
                    "source_ip": data_nodes.get("IpAddress", ""),
                })
    except Exception as e:
        logger.debug("Security logon read failed: %s", e)


# ── App tracking ───────────────────────────────────────────────────────────────

_foreground_state: dict = {
    "current_app": None,
    "current_title": None,
    "last_change": time.time(),
    "seen_pids": set(),
}

_foreground_lock = threading.Lock()


def _get_foreground_info() -> tuple[str | None, str | None, int | None]:
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        length = user32.GetWindowTextLengthW(hwnd) + 1
        buf = ctypes.create_unicode_buffer(length)
        user32.GetWindowTextW(hwnd, buf, length)
        title = buf.value or None

        pid = ctypes.c_ulong()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        pid_val = pid.value

        app_name = None
        try:
            import psutil
            p = psutil.Process(pid_val)
            app_name = p.name()
        except Exception:
            app_name = f"pid:{pid_val}"

        return app_name, title, pid_val
    except Exception:
        return None, None, None


def _app_poll_loop() -> None:
    import psutil

    process_launches: dict[int, dict] = {}
    foreground_accum: dict[str, float] = defaultdict(float)
    last_flush = time.time()

    while _running:
        try:
            now = time.time()
            current_pids = set()

            for proc in psutil.process_iter(["pid", "name", "exe", "create_time"]):
                try:
                    info = proc.info
                    pid = info["pid"]
                    current_pids.add(pid)
                    if pid not in _foreground_state["seen_pids"] and pid not in process_launches:
                        process_launches[pid] = {
                            "pid": pid,
                            "name": info["name"] or f"pid:{pid}",
                            "path": info.get("exe") or "",
                            "started": datetime.fromtimestamp(info.get("create_time", now), tz=timezone.utc).isoformat(timespec="seconds"),
                        }
                        _append_event("app_launch", {
                            "pid": pid,
                            "name": info["name"] or f"pid:{pid}",
                            "path": info.get("exe") or "",
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            with _foreground_lock:
                _foreground_state["seen_pids"] = current_pids

            app_name, title, pid_val = _get_foreground_info()

            with _foreground_lock:
                if app_name:
                    elapsed = now - _foreground_state["last_change"]
                    if elapsed > 0 and elapsed < FOREGROUND_STALE_THRESHOLD and _foreground_state["current_app"]:
                        foreground_accum[_foreground_state["current_app"]] += elapsed
                    _foreground_state["current_app"] = app_name
                    _foreground_state["current_title"] = title
                    _foreground_state["last_change"] = now

            if now - last_flush >= 60:
                for app, dur in sorted(foreground_accum.items(), key=lambda x: -x[1]):
                    if dur >= 5:
                        _append_event("foreground", {"app": app, "duration_s": round(dur, 1)})
                foreground_accum.clear()
                last_flush = now

        except Exception as e:
            logger.debug("App poll error: %s", e)

        time.sleep(POLL_APPS_INTERVAL)


# ── Browser history ────────────────────────────────────────────────────────────

_browser_state: dict = {"last_visit_time": {}, "last_search_id": {}}

BROWSER_PATHS = {
    "chrome": Path(os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\History")),
    "edge": Path(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\History")),
}


def _read_browser_history(browser: str, history_path: Path) -> None:
    if not history_path.exists():
        return

    tmp_path = None
    try:
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".db", prefix=f"history_{browser}_")
        os.close(tmp_fd)
        shutil.copy2(str(history_path), tmp_path)

        conn = sqlite3.connect(tmp_path)
        cursor = conn.cursor()

        last_visit = _browser_state["last_visit_time"].get(browser, 0)
        cursor.execute("SELECT MAX(last_visit_time) FROM urls")
        max_visit = cursor.fetchone()[0] or 0

        if max_visit > last_visit:
            cursor.execute(
                "SELECT url, title, last_visit_time FROM urls WHERE last_visit_time > ? ORDER BY last_visit_time DESC LIMIT 50",
                (last_visit,),
            )
            for url, title, visit_time in cursor.fetchall():
                iso = _filetime_to_iso(visit_time)
                if iso:
                    _append_event("website", {"browser": browser, "url": url, "title": title or "", "ts": iso})
            _browser_state["last_visit_time"][browser] = max_visit

        last_search = _browser_state["last_search_id"].get(browser, 0)
        cursor.execute("SELECT MAX(id) FROM keyword_search_terms")
        max_search = cursor.fetchone()[0] or 0

        if max_search > last_search:
            cursor.execute(
                """SELECT kws.term, kws.url_id, urls.url, urls.last_visit_time
                   FROM keyword_search_terms kws
                   JOIN urls ON kws.url_id = urls.id
                   WHERE kws.id > ? ORDER BY kws.id DESC LIMIT 30""",
                (last_search,),
            )
            for term, url_id, url, visit_time in cursor.fetchall():
                iso = _filetime_to_iso(visit_time) if visit_time else None
                _append_event("search", {"browser": browser, "term": term, "url": url or "", "ts": iso or ""})
            _browser_state["last_search_id"][browser] = max_search

        conn.close()
    except Exception as e:
        logger.debug("Browser history read error (%s): %s", browser, e)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def _browser_poll_loop() -> None:
    while _running:
        try:
            for browser, path in BROWSER_PATHS.items():
                _read_browser_history(browser, path)
        except Exception as e:
            logger.debug("Browser poll error: %s", e)
        time.sleep(POLL_BROWSER_INTERVAL)


# ── API functions ──────────────────────────────────────────────────────────────

def get_activity_log(event_type: str = "", limit: int = 200) -> list[dict]:
    events = _read_log(limit=limit * 3)
    if event_type:
        events = [e for e in events if e.get("type") == event_type]
    return events[-limit:]


def get_activity_summary(hours: int = 24) -> dict:
    cutoff = (datetime.now() - timedelta(hours=hours)).isoformat(timespec="seconds")
    events = _read_log()

    boots = [e for e in events if e["type"] == "boot" and e["ts"] >= cutoff]
    logons = [e for e in events if e["type"] == "logon" and e["ts"] >= cutoff]
    launches = [e for e in events if e["type"] == "app_launch" and e["ts"] >= cutoff]
    foreground = [e for e in events if e["type"] == "foreground" and e["ts"] >= cutoff]
    websites = [e for e in events if e["type"] == "website" and e["ts"] >= cutoff]
    searches = [e for e in events if e["type"] == "search" and e["ts"] >= cutoff]

    app_duration: dict[str, float] = defaultdict(float)
    for e in foreground:
        app_duration[e["data"]["app"]] += e["data"].get("duration_s", 0)
    top_apps = sorted(app_duration.items(), key=lambda x: -x[1])[:10]

    return {
        "hours": hours,
        "boots": [{"ts": e["ts"], **e["data"]} for e in boots],
        "logons": [{"ts": e["ts"], **e["data"]} for e in logons[-10:]],
        "launches_count": len(launches),
        "top_apps": [{"app": app, "foreground_s": round(dur, 1)} for app, dur in top_apps],
        "websites": [{"url": e["data"]["url"], "title": e["data"]["title"], "browser": e["data"]["browser"], "ts": e["ts"]} for e in websites[-30:]],
        "searches": [{"term": e["data"]["term"], "browser": e["data"]["browser"], "ts": e["ts"]} for e in searches[-20:]],
    }


# ── Start / stop ───────────────────────────────────────────────────────────────

def start() -> None:
    global _running
    if _running:
        return
    _running = True

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    threading.Thread(target=_record_boot_event, daemon=True, name="activity-boot").start()
    threading.Thread(target=_read_security_logon_events, daemon=True, name="activity-logon").start()
    threading.Thread(target=_app_poll_loop, daemon=True, name="activity-apps").start()
    threading.Thread(target=_browser_poll_loop, daemon=True, name="activity-browser").start()

    logger.info("Activity logger started (apps %ds, browser %ds)", POLL_APPS_INTERVAL, POLL_BROWSER_INTERVAL)


def stop() -> None:
    global _running
    _running = False
