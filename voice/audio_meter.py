"""Bounded, best-effort audio envelopes for the existing local UI bridge.

Audio callbacks only copy the latest small PCM block into a one-item mailbox.
Analysis and network I/O run on a daemon worker, never on the playback thread.
No recordings are saved and no additional audio device is opened.
"""

import socket
import threading
import time
from collections import deque

import numpy as np

from voice.audio_utils import generate_amplitude_payload


class AudioMeter:
    def __init__(self, port, *, interval=1 / 30, stale_after=0.18):
        self.port = port
        self.interval = interval
        self.stale_after = stale_after
        self._pending = {source: deque(maxlen=1) for source in ("mic", "tts")}
        self._active = {"mic": False, "tts": False}
        self._last_seen = {"mic": 0.0, "tts": 0.0}
        self._stop = threading.Event()
        self._thread = None

    def start(self):
        if self._thread is None:
            self._thread = threading.Thread(target=self._run, name="AuraAudioMeter", daemon=True)
            self._thread.start()

    def submit(self, source, pcm):
        """Non-blocking, bounded handoff. Never let visual telemetry break sound."""
        try:
            if source in self._pending and pcm.size:
                self._pending[source].append((time.monotonic(), pcm.reshape(-1)[:4096].copy()))
        except Exception:
            pass

    def clear(self, source):
        self.submit(source, np.zeros(4, dtype=np.float32))

    def _send(self, message):
        try:
            with socket.create_connection(("127.0.0.1", self.port), timeout=0.06) as connection:
                connection.sendall(message.encode("ascii"))
        except OSError:
            pass  # UI unavailable: drop this frame; never accumulate a backlog.

    def _tick(self, now):
        for source, pending in self._pending.items():
            try:
                captured_at, pcm = pending.pop()
            except IndexError:
                if self._active[source] and now - self._last_seen[source] > self.stale_after:
                    self._send(f"AMPLITUDE:{source}:0.0,0.0,0.0,0.0")
                    self._active[source] = False
                continue
            # Old frames are discarded after a slow/disconnected transport.
            if now - captured_at > self.stale_after:
                pcm = np.zeros(4, dtype=np.float32)
            if np.issubdtype(pcm.dtype, np.integer):
                pcm = pcm.astype(np.float32) / max(abs(np.iinfo(pcm.dtype).min), np.iinfo(pcm.dtype).max)
            payload = generate_amplitude_payload(pcm)
            active = any(float(value) > 0 for value in payload.split(":", 1)[1].split(","))
            if active or self._active[source]:
                self._send(payload.replace("AMPLITUDE:", f"AMPLITUDE:{source}:", 1))
            self._active[source] = active
            self._last_seen[source] = captured_at

    def _run(self):
        while not self._stop.wait(self.interval):
            try:
                self._tick(time.monotonic())
            except Exception:
                pass  # This optional visual channel must never affect the pipeline.

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=0.5)


_meter = None
_meter_lock = threading.Lock()


def get_audio_meter():
    global _meter
    with _meter_lock:
        if _meter is None:
            from core.config import UI_SOCKET_PORT
            _meter = AudioMeter(UI_SOCKET_PORT)
            _meter.start()
        return _meter
