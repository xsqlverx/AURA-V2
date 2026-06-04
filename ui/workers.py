"""QThread workers — HealthCheck, BackendStream, UISocketServer."""

import json
import logging
import socket
import requests
from PySide6.QtCore import QThread, Signal
from core.config import SERVER_URL, UI_SOCKET_PORT

logger = logging.getLogger(__name__)


# ── Health Check ──────────────────────────────────────────────────────────────

class HealthCheck(QThread):
    status_changed = Signal(bool)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._running = True
        self._last_status = None

    def run(self):
        while self._running:
            try:
                r = requests.get(f"{SERVER_URL}/health", timeout=2)
                online = r.status_code == 200
            except Exception:
                online = False
            if online != self._last_status:
                self._last_status = online
                self.status_changed.emit(online)
            self.msleep(5000)

    def stop(self):
        self._running = False
        self.wait()


# ── Backend Stream ────────────────────────────────────────────────────────────

class BackendStream(QThread):
    chunk_received = Signal(str)
    done = Signal()
    error = Signal(str)

    def __init__(self, message: str, history: list, mode: str = "deep", parent=None):
        super().__init__(parent)
        self.message = message
        self.history = history
        self.mode = mode

    def run(self):
        try:
            with requests.post(
                f"{SERVER_URL}/chat",
                json={"message": self.message, "history": self.history, "mode": self.mode},
                stream=True,
                timeout=60,
            ) as r:
                for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
                    if chunk:
                        self.chunk_received.emit(chunk)
            self.done.emit()
        except Exception as e:
            logger.error("BackendStream error: %s", e)
            self.error.emit(str(e))


# ── UI Socket Server ──────────────────────────────────────────────────────────

class UISocketServer(QThread):
    """
    Listens on UI_SOCKET_PORT for messages from the voice pipeline and Discord bot.

    Protocol:
        STATE:xxx                        → update orb/HUD state
        USER:text                        → display user bubble
        AURA:text                        → display aura bubble
        DISCORD:{"sender":…,"message":…} → Discord message → discord_message signal
        plain text                       → send as user message to backend
    """
    message_received = Signal(str)
    state_received   = Signal(str)
    display_user     = Signal(str)
    display_aura     = Signal(str)
    discord_message  = Signal(str, str)   # sender, message

    def __init__(self, parent=None):
        super().__init__(parent)
        self._running = True

    def run(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.settimeout(1.0)
            s.bind(("127.0.0.1", UI_SOCKET_PORT))
            s.listen(1)
            logger.info("UISocketServer listening on port %d", UI_SOCKET_PORT)

            while self._running:
                try:
                    conn, _ = s.accept()
                    with conn:
                        data = conn.recv(4096).decode("utf-8").strip()
                        if not data:
                            continue
                        if data.startswith("STATE:"):
                            self.state_received.emit(data[6:].strip())
                        elif data.startswith("USER:"):
                            self.display_user.emit(data[5:].strip())
                        elif data.startswith("AURA:"):
                            self.display_aura.emit(data[5:].strip())
                        elif data.startswith("DISCORD:"):
                            try:
                                payload = json.loads(data[8:])
                                self.discord_message.emit(
                                    payload.get("sender", "?"),
                                    payload.get("message", ""),
                                )
                            except Exception:
                                pass
                        else:
                            self.message_received.emit(data)
                except socket.timeout:
                    continue
                except Exception as e:
                    if self._running:
                        logger.warning("UISocketServer error: %s", e)

    def stop(self):
        self._running = False
        self.wait()