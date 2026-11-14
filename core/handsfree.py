"""Aura Hands-Free Mode Controller.

Owns the authoritative state machine, monotonic generation counters,
cancellation tokens, structured result contracts, and voice command parsing.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
import uuid
from typing import Callable, Optional

logger = logging.getLogger(__name__)


# ── Structured Result Schema ──────────────────────────────────────────────────

class HandsFreeResult:
    """Standardized result schema for all hands-free operations."""

    def __init__(
        self,
        command_id: str,
        session_id: str,
        status: str,  # success | failed | cancelled | needs_input | unverified
        action: str,
        target_summary: str = "",
        verification: str = "",
        error_code: str = "",
        timing: Optional[dict] = None,
    ):
        self.command_id = command_id
        self.session_id = session_id
        self.status = status
        self.action = action
        self.target_summary = target_summary
        self.verification = verification
        self.error_code = error_code
        self.timing = timing or {}

    def to_dict(self) -> dict:
        return {
            "command_id": self.command_id,
            "session_id": self.session_id,
            "status": self.status,
            "action": self.action,
            "target_summary": self.target_summary,
            "verification": self.verification,
            "error_code": self.error_code,
            "timing": self.timing,
        }


# ── Deterministic Intent Parser ───────────────────────────────────────────────

_ENABLE_PATTERNS = [
    r"^(?:aura\s*,?\s*)?(?:please\s+)?(?:activate|enable|turn\s+on|start)\s+hands[- ]?free(?:\s+mode)?$",
    r"^(?:aura\s*,?\s*)?hands[- ]?free(?:\s+mode)?\s+(?:on|activated|enabled)$",
]

_DISABLE_PATTERNS = [
    r"^(?:aura\s*,?\s*)?(?:please\s+)?(?:deactivate|disable|turn\s+off|exit|close)\s+hands[- ]?free(?:\s+mode)?$",
    r"^(?:aura\s*,?\s*)?hands[- ]?free(?:\s+mode)?\s+(?:off|deactivated|disabled|turned\s+off)$",
]

_STOP_PATTERNS = [
    r"^(?:aura\s*,?\s*)?(?:please\s+)?(?:stop|cancel|abort)(?:\s+(?:that|it|everything))?$",
    r"^(?:aura\s*,?\s*)?(?:please\s+)?stop\s+reading$",
]

_DICTATION_PATTERNS = [
    r"^(?:aura\s*,?\s*)?(?:please\s+)?start\s+dictation$",
    r"^(?:aura\s*,?\s*)?(?:please\s+)?(?:stop|finish|exit)\s+dictation$",
]

# Negation and question safeguards
_SAFEGUARD_PATTERNS = [
    r"\b(?:don'?t|do\s+not|never|should\s+i|how\s+to|what\s+is|what\s+does|can\s+you\s+explain)\b",
    r"\?$",
]

# Words that indicate a dictated or quoted payload rather than a mode command
_LITERAL_PREFIXES = [
    r"^(?:type|write|say|dictate|input|paste|enter)\b",
]


def match_handsfree_phrase(text: str) -> Optional[dict]:
    """Parse text for authoritative hands-free control commands.

    Returns a dict with {"intent": intent_name, "raw": text} or None.
    Guarantees:
      - Ignores questions ("what does hands-free mean?")
      - Ignores negated phrases ("don't activate hands-free")
      - Ignores literal typing instructions ("type turn off hands-free mode")
    """
    if not text:
        return None

    cleaned = text.strip()
    lowered = cleaned.lower()

    # Reject if command is explicitly a literal typing command
    for lp in _LITERAL_PREFIXES:
        if re.search(lp, lowered):
            return None

    # Reject if questions or negations are detected
    for sp in _SAFEGUARD_PATTERNS:
        if re.search(sp, lowered):
            return None

    # Check Stop / Cancel first (urgent priority)
    if lowered == "stop reading":
        return {"intent": "stop_reading", "raw": text}

    for pat in _STOP_PATTERNS:
        if re.match(pat, lowered):
            return {"intent": "stop", "raw": text}

    # Check Disable
    for pat in _DISABLE_PATTERNS:
        if re.match(pat, lowered):
            return {"intent": "disable", "raw": text}

    # Check Enable
    for pat in _ENABLE_PATTERNS:
        if re.match(pat, lowered):
            return {"intent": "enable", "raw": text}

    # Check Dictation mode
    for pat in _DICTATION_PATTERNS:
        if "start" in pat and re.match(pat, lowered):
            return {"intent": "start_dictation", "raw": text}
        elif "stop" in pat and re.match(pat, lowered):
            return {"intent": "stop_dictation", "raw": text}

    return None


# ── Authoritative Controller ──────────────────────────────────────────────────

class HandsFreeController:
    """Authoritative singleton tracking hands-free session lifecycle and generation."""

    def __init__(self):
        self._lock = threading.RLock()
        self._enabled: bool = False
        self._activity: str = "idle"  # listening | transcribing | executing | speaking | clarifying | error | idle
        self._mic_status: str = "ready"  # ready | unavailable | recovering
        self._session_id: str = ""
        self._generation: int = 0
        self._command_id: Optional[str] = None
        self._detail: str = ""
        self._last_request_id: Optional[str] = None

        # Threading event for compatibility with voice.pipeline flow_mode
        self._flow_event = threading.Event()

        # Listeners registered for state transitions
        self._listeners: list[Callable[[dict], None]] = []

    # ── State Accessors ──

    @property
    def enabled(self) -> bool:
        with self._lock:
            return self._enabled

    @property
    def activity(self) -> str:
        with self._lock:
            return self._activity

    @property
    def mic_status(self) -> str:
        with self._lock:
            return self._mic_status

    @property
    def session_id(self) -> str:
        with self._lock:
            return self._session_id

    @property
    def generation(self) -> int:
        with self._lock:
            return self._generation

    @property
    def command_id(self) -> Optional[str]:
        with self._lock:
            return self._command_id

    @property
    def flow_event(self) -> threading.Event:
        return self._flow_event

    def register_listener(self, callback: Callable[[dict], None]) -> None:
        with self._lock:
            if callback not in self._listeners:
                self._listeners.append(callback)

    def unregister_listener(self, callback: Callable[[dict], None]) -> None:
        with self._lock:
            if callback in self._listeners:
                self._listeners.remove(callback)

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "enabled": self._enabled,
                "activity": self._activity,
                "mic_status": self._mic_status,
                "session_id": self._session_id,
                "generation": self._generation,
                "command_id": self._command_id,
                "detail": self._detail,
            }

    # ── Generation Validation ──

    def is_valid(self, session_id: str, generation: int) -> bool:
        """Verify that a worker task belongs to the current session generation.
        If generation has advanced or mode was disabled, the task is stale and must abort.
        """
        with self._lock:
            return (
                self._enabled
                and self._session_id == session_id
                and self._generation == generation
            )

    # ── Lifecycle Operations ──

    def enable(self, source: str = "user", request_id: Optional[str] = None) -> bool:
        """Enable hands-free mode idempotently."""
        with self._lock:
            if request_id and request_id == self._last_request_id and self._enabled:
                return True
            if request_id:
                self._last_request_id = request_id

            if not self._enabled:
                self._enabled = True
                self._session_id = str(uuid.uuid4())[:8]
                self._generation += 1
                self._activity = "listening"
                self._detail = f"Enabled via {source}"
                self._flow_event.set()
                logger.info("Hands-free ENABLED (session=%s, gen=%d, source=%s)", self._session_id, self._generation, source)
                self._notify()
                return True
            return True

    def disable(self, reason: str = "user", request_id: Optional[str] = None) -> bool:
        """Disable hands-free mode immediately and invalidate pending jobs."""
        with self._lock:
            if request_id and request_id == self._last_request_id and not self._enabled:
                return False
            if request_id:
                self._last_request_id = request_id

            if self._enabled:
                self._enabled = False
                self._generation += 1
                self._activity = "idle"
                self._command_id = None
                self._detail = f"Disabled: {reason}"
                self._flow_event.clear()
                logger.info("Hands-free DISABLED (reason=%s, new_gen=%d)", reason, self._generation)
                self._notify()
                return False
            return False

    def toggle(self, source: str = "hotkey") -> bool:
        """Toggle hands-free state."""
        with self._lock:
            if self._enabled:
                self.disable(reason=f"toggle_from_{source}")
                return False
            else:
                self.enable(source=source)
                return True

    def cancel_current(self, command_id: Optional[str] = None, reason: str = "cancelled") -> None:
        """Cancel current command/reading while staying in hands-free mode."""
        with self._lock:
            if not self._enabled:
                return
            # Advance generation to immediately invalidate running execution futures
            self._generation += 1
            old_cmd = self._command_id
            self._command_id = None
            self._activity = "listening"
            self._detail = f"Cancelled ({reason}) [prev={old_cmd}]"
            logger.info("Hands-free cancelled action (new_gen=%d, reason=%s)", self._generation, reason)
            self._notify()

    def set_activity(self, activity: str, detail: str = "", command_id: Optional[str] = None) -> None:
        """Update live activity state (e.g., listening, transcribing, executing)."""
        with self._lock:
            self._activity = activity
            if detail:
                self._detail = detail
            if command_id is not None:
                self._command_id = command_id
            self._notify()

    def set_mic_status(self, status: str, detail: str = "") -> None:
        """Update microphone health status."""
        with self._lock:
            self._mic_status = status
            if detail:
                self._detail = detail
            logger.info("Mic status changed to: %s (%s)", status, detail)
            self._notify()

    def create_command_token(self, action_name: str) -> tuple[str, str, int]:
        """Generate a new command token bound to the current session & generation."""
        with self._lock:
            cmd_id = f"cmd_{int(time.time()*1000)%1000000:06d}"
            self._command_id = cmd_id
            self._activity = "executing"
            self._detail = f"Executing {action_name}"
            self._notify()
            return cmd_id, self._session_id, self._generation

    # ── Notification Dispatch ──

    def _notify(self) -> None:
        snap = self.snapshot()
        listeners = list(self._listeners)
        for listener in listeners:
            try:
                listener(snap)
            except Exception as e:
                logger.warning("Error in hands-free listener: %s", e)


# Global singleton instance
controller = HandsFreeController()
