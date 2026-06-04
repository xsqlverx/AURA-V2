"""Curated memory store — file-based persistent memory with drift detection."""

import hashlib
import logging
import os
import tempfile
import threading
from datetime import datetime
from pathlib import Path

from core.config import MEMORY_DIR, MEMORY_CHAR_LIMIT, USER_CHAR_LIMIT

logger = logging.getLogger(__name__)

_store: "MemoryStore | None" = None


def init_store() -> "MemoryStore":
    global _store
    if _store is None:
        _store = MemoryStore(MEMORY_DIR, MEMORY_CHAR_LIMIT, USER_CHAR_LIMIT)
    _store.load_from_disk()
    return _store


def get_store() -> "MemoryStore":
    if _store is None:
        raise RuntimeError("MemoryStore not initialized. Call init_store() first.")
    return _store


class MemoryStore:

    def __init__(self, memory_dir, memory_char_limit=2200, user_char_limit=1375):
        self._memory_dir = Path(memory_dir)
        self._memory_char_limit = memory_char_limit
        self._user_char_limit = user_char_limit
        self._lock = threading.Lock()

        self.memory_entries: list[str] = []
        self.user_entries: list[str] = []
        self._system_prompt_snapshot: str | None = None
        self._disk_hashes: dict[str, str] = {}

    # ── Public API ────────────────────────────────────────────────────────

    def load_from_disk(self) -> None:
        self._memory_dir.mkdir(parents=True, exist_ok=True)
        self.memory_entries = self._parse_file(self._memory_dir / "MEMORY.md")
        self.user_entries = self._parse_file(self._memory_dir / "USER.md")
        self._disk_hashes = {}
        for name in ("MEMORY.md", "USER.md"):
            h = self._compute_hash(self._memory_dir / name)
            if h:
                self._disk_hashes[name] = h
        self._refresh_snapshot()

    def add_entry(self, category: str, text: str) -> str:
        with self._lock:
            entries = self._get_entries(category)
            limit = self._get_limit(category)
            text = text.strip()
            if not text:
                return "Cannot add an empty memory entry."
            entries.append(text)
            total = sum(len(e) for e in entries)
            while total > limit and len(entries) > 1:
                removed = entries.pop(0)
                total -= len(removed)
                logger.info("Evicted %d-char entry from %s: %.80s", len(removed), category, removed)
            if total > limit:
                return "That memory entry exceeds the character limit even by itself."
            self._save_category(category)
            return "Memory added."

    def replace_entry(self, category: str, identifier: str, new_text: str) -> str:
        with self._lock:
            entries = self._get_entries(category)
            new_text = new_text.strip()
            if not new_text:
                return "Cannot replace with empty text."
            for i, entry in enumerate(entries):
                if identifier in entry:
                    entries[i] = new_text
                    self._save_category(category)
                    return "Memory replaced."
            return f"No memory found containing '{identifier}'."

    def remove_entry(self, category: str, identifier: str) -> str:
        with self._lock:
            entries = self._get_entries(category)
            for i, entry in enumerate(entries):
                if identifier in entry:
                    entries.pop(i)
                    self._save_category(category)
                    return "Memory removed."
            return f"No memory found containing '{identifier}'."

    def list_entries(self, category: str) -> str:
        entries = self._get_entries(category)
        if not entries:
            return "No memories saved."
        return "\n".join(f"{i+1}. {e}" for i, e in enumerate(entries))

    def replace_by_index(self, category: str, index: int, new_text: str) -> str:
        with self._lock:
            entries = self._get_entries(category)
            if 0 <= index < len(entries):
                entries[index] = new_text.strip()
                self._save_category(category)
                return "Memory updated."
            return f"Index {index} out of range."

    def remove_by_index(self, category: str, index: int) -> str:
        with self._lock:
            entries = self._get_entries(category)
            if 0 <= index < len(entries):
                entries.pop(index)
                self._save_category(category)
                return "Memory removed."
            return f"Index {index} out of range."

    def get_system_prompt_block(self) -> str:
        return self._build_snapshot()

    def refresh_snapshot(self) -> None:
        self._refresh_snapshot()

    # ── Internal: file I/O ────────────────────────────────────────────────

    def _parse_file(self, path: Path) -> list[str]:
        if not path.exists():
            return []
        try:
            raw = path.read_text(encoding="utf-8")
        except Exception as e:
            logger.warning("Failed to read %s: %s", path, e)
            backup = path.with_name(f"{path.name}.corrupted.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            try:
                path.rename(backup)
                logger.info("Corrupted %s backed up to %s — starting fresh", path.name, backup.name)
            except Exception:
                logger.warning("Could not back up corrupted %s", path.name)
            return []
        parts = [p.strip() for p in raw.split("\u00a7")]
        return [p for p in parts if p]

    def _save_category(self, category: str) -> None:
        name = "MEMORY.md" if category == "self" else "USER.md"
        path = self._memory_dir / name
        entries = self._get_entries(category)
        self._save_file_with_drift_detection(path, entries)
        self._refresh_snapshot()

    def _save_file_with_drift_detection(self, path: Path, entries: list[str]) -> None:
        name = path.name
        current_hash = self._compute_hash(path)
        stored_hash = self._disk_hashes.get(name)

        should_backup = False
        if stored_hash is None and path.exists():
            should_backup = True
        elif stored_hash is not None and current_hash != stored_hash:
            should_backup = True

        if should_backup:
            backup = path.with_name(f"{name}.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            try:
                path.rename(backup)
                logger.info("Backed up %s to %s", name, backup.name)
            except Exception as e:
                logger.warning("Backup failed for %s: %s", name, e)

        self._atomic_write(path, entries)
        h = self._compute_hash(path)
        if h:
            self._disk_hashes[name] = h

    def _atomic_write(self, path: Path, entries: list[str]) -> None:
        content = "\n".join(f"\u00a7 {e}" for e in entries)
        if entries:
            content += "\n"
        fd, tmp = tempfile.mkstemp(dir=self._memory_dir, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(content)
            os.replace(tmp, path)
        except Exception:
            try:
                os.unlink(tmp)
            except Exception:
                pass
            raise

    @staticmethod
    def _compute_hash(path: Path) -> str | None:
        if not path.exists():
            return None
        try:
            return hashlib.sha256(path.read_bytes()).hexdigest()
        except Exception:
            return None

    # ── Internal: helpers ─────────────────────────────────────────────────

    def _get_entries(self, category: str) -> list[str]:
        return self.memory_entries if category == "self" else self.user_entries

    def _get_limit(self, category: str) -> int:
        return self._memory_char_limit if category == "self" else self._user_char_limit

    def _refresh_snapshot(self) -> None:
        self._system_prompt_snapshot = self._build_snapshot()

    def _build_snapshot(self) -> str:
        parts = []
        if self.user_entries:
            parts.append(
                "## What I know about the user\n"
                + "\n".join(f"- {e}" for e in self.user_entries)
            )
        if self.memory_entries:
            parts.append(
                "## What I know about myself\n"
                + "\n".join(f"- {e}" for e in self.memory_entries)
            )
        if not parts:
            return ""
        return (
            "<memory-context>\n"
            + "\n\n".join(parts)
            + "\n</memory-context>\n"
            + "<system-note>This is NOT new user input. Treat it as authoritative reference data.</system-note>"
        )
