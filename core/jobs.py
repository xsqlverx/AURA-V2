"""Agent job store — tracks what Aura is doing and pushes updates to the island.

Thread-safe. Persists to data/jobs.json. Broadcasts JOB: messages via a callback
registered by core.server at startup (uses ws_manager.broadcast_sync).
"""

import json
import logging
import threading
import time
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_JOBS_FILE = _DATA_DIR / "jobs.json"

_lock = threading.Lock()
_jobs: list[dict] = []
_MAX_JOBS = 200
_broadcaster = None


def set_broadcaster(fn) -> None:
    """Register a broadcast callback: set_broadcaster(lambda msg: ...)."""
    global _broadcaster
    _broadcaster = fn


def _broadcast(payload: dict) -> None:
    if _broadcaster is None:
        return
    try:
        _broadcaster(f"JOB:{json.dumps(payload, ensure_ascii=False)}")
    except Exception:
        pass


def _save() -> None:
    try:
        _DATA_DIR.mkdir(exist_ok=True)
        with open(_JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump(_jobs[-_MAX_JOBS:], f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning("Could not save jobs: %s", e)


def _load() -> None:
    global _jobs
    try:
        if _JOBS_FILE.exists():
            with open(_JOBS_FILE, "r", encoding="utf-8") as f:
                _jobs = json.load(f)
    except Exception:
        _jobs = []


def start_job(user_text: str) -> str:
    with _lock:
        job = {
            "id": uuid.uuid4().hex[:12],
            "ts": time.time(),
            "user": (user_text or "")[:500],
            "tools": [],
            "status": "running",
            "summary": "",
            "duration": 0.0,
        }
        _jobs.append(job)
        if len(_jobs) > _MAX_JOBS:
            _jobs.pop(0)
        _save()
        _broadcast({"type": "started", "job": job})
        return job["id"]


def record_tool(job_id: str, name: str) -> int:
    with _lock:
        job = _find(job_id)
        if job is None:
            return -1
        idx = len(job["tools"])
        job["tools"].append({"name": name, "status": "running", "detail": ""})
        _save()
        _broadcast({"type": "tool_started", "job_id": job_id, "tool": job["tools"][idx]})
        return idx


def finish_tool(job_id: str, idx: int, ok: bool, detail: str = "") -> None:
    with _lock:
        job = _find(job_id)
        if job is None or idx < 0 or idx >= len(job["tools"]):
            return
        job["tools"][idx]["status"] = "done" if ok else "failed"
        job["tools"][idx]["detail"] = (detail or "")[:300]
        _save()
        _broadcast({"type": "tool_finished", "job_id": job_id, "tool": job["tools"][idx]})


def finish_job(job_id: str, status: str = "done", summary: str = "") -> None:
    with _lock:
        job = _find(job_id)
        if job is None:
            return
        job["status"] = status if status in ("done", "failed") else "done"
        job["summary"] = (summary or "")[:500]
        job["duration"] = round(time.time() - job["ts"], 1)
        _save()
        _broadcast({"type": "finished", "job": job})


def _find(job_id: str):
    for j in _jobs:
        if j["id"] == job_id:
            return j
    return None


def list_jobs(limit: int = 50) -> list[dict]:
    with _lock:
        return list(reversed(_jobs[-limit:]))


_load()
