"""Staged actions — anything that would send/book/change waits for user approval.

The agent stages an action (e.g. send_whatsapp) instead of executing it. The
island shows a confirmation card; the user approves or cancels via the API.
Broadcasts PENDING: messages like the job store.
"""

import json
import logging
import threading
import time
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_PENDING_FILE = _DATA_DIR / "pending.json"

_lock = threading.Lock()
_pending: list[dict] = []
_MAX_PENDING = 20
_broadcaster = None


def set_broadcaster(fn) -> None:
    global _broadcaster
    _broadcaster = fn


def _broadcast(payload: dict) -> None:
    if _broadcaster is None:
        return
    try:
        _broadcaster(f"PENDING:{json.dumps(payload, ensure_ascii=False)}")
    except Exception:
        pass


def _save() -> None:
    try:
        _DATA_DIR.mkdir(exist_ok=True)
        with open(_PENDING_FILE, "w", encoding="utf-8") as f:
            json.dump(_pending, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning("Could not save pending actions: %s", e)


def _load() -> None:
    global _pending
    try:
        if _PENDING_FILE.exists():
            with open(_PENDING_FILE, "r", encoding="utf-8") as f:
                _pending = json.load(f)
    except Exception:
        _pending = []


def stage(app: str, title: str, detail: list, tool: str, payload: dict, confirm: str = "") -> dict:
    """Register a pending action. detail: list of (key, value) tuples."""
    with _lock:
        item = {
            "id": uuid.uuid4().hex[:12],
            "ts": time.time(),
            "app": app,
            "title": title,
            "detail": [{"k": k, "v": v} for k, v in detail],
            "tool": tool,
            "payload": payload,
            "confirm": confirm,
            "status": "pending",
        }
        _pending.append(item)
        if len(_pending) > _MAX_PENDING:
            _pending.pop(0)
        _save()
        _broadcast({"type": "staged", "item": item})
        return item


def approve(item_id: str) -> dict:
    with _lock:
        item = _find(item_id)
        if item is None:
            return {"error": "No pending action with that id"}
        if item["status"] != "pending":
            return {"error": f"Already {item['status']}"}
        item["status"] = "approved"
        _save()
        _broadcast({"type": "resolved", "item": item})
    result = _execute(item)
    return {"success": True, "result": result}


def cancel(item_id: str) -> dict:
    with _lock:
        item = _find(item_id)
        if item is None:
            return {"error": "No pending action with that id"}
        if item["status"] != "pending":
            return {"error": f"Already {item['status']}"}
        item["status"] = "cancelled"
        _save()
        _broadcast({"type": "resolved", "item": item})
        return {"success": True, "cancelled": True}


def _execute(item: dict) -> dict:
    try:
        if item["tool"] == "send_whatsapp":
            from tools.whatsapp_web import send_whatsapp
            return send_whatsapp(
                item["payload"].get("contact", ""),
                item["payload"].get("message", ""),
            )
        return {"error": f"No executor for staged tool: {item['tool']}"}
    except Exception as e:
        logger.error("Pending action execution failed: %s", e)
        return {"error": str(e)}


def _find(item_id: str):
    for it in _pending:
        if it["id"] == item_id:
            return it
    return None


def list_pending() -> list[dict]:
    with _lock:
        return list(_pending)


_load()
