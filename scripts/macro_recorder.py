import json, time, threading, os, subprocess, sys
from pathlib import Path
from pynput import mouse, keyboard
from pynput.mouse import Controller as MouseController
from pynput.keyboard import Controller as KeyboardController, Key

MACROS_DIR = Path(__file__).resolve().parent.parent / "data" / "macros"
MACROS_DIR.mkdir(parents=True, exist_ok=True)

_STOP_POS_FILE = MACROS_DIR / "_stop_pos.json"
_STOP_SIGNAL_FILE = MACROS_DIR / "_stop_signal.json"


class MacroRecorder:
    def __init__(self):
        self._recording = False
        self._events: list[dict] = []
        self._start_time = 0.0
        self._mouse_listener = None
        self._key_listener = None
        self._lock = threading.Lock()
        self._stop_overlay_proc: subprocess.Popen | None = None
        self._poll_thread: threading.Thread | None = None
        self._overlay_rect: tuple[int, int, int, int] | None = None

    # ── Recording ────────────────────────────────────────────────────────────

    def start_recording(self, countdown: int = 0):
        if countdown > 0:
            _show_countdown_overlay(countdown)
        self._events = []
        self._start_time = time.perf_counter()
        self._recording = True

        def on_click(x, y, button, pressed):
            if not self._recording:
                return False
            with self._lock:
                self._events.append({
                    "t": round((time.perf_counter() - self._start_time) * 1000),
                    "type": "click",
                    "x": x, "y": y,
                    "btn": str(button),
                    "action": "down" if pressed else "up",
                })

        def on_press(key):
            if not self._recording:
                return False
            with self._lock:
                self._events.append({
                    "t": round((time.perf_counter() - self._start_time) * 1000),
                    "type": "key",
                    "key": str(key),
                    "action": "press",
                })

        def on_release(key):
            if not self._recording:
                return False
            with self._lock:
                self._events.append({
                    "t": round((time.perf_counter() - self._start_time) * 1000),
                    "type": "key",
                    "key": str(key),
                    "action": "release",
                })

        self._mouse_listener = mouse.Listener(on_click=on_click)
        self._key_listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        self._mouse_listener.start()
        self._key_listener.start()

        self._launch_stop_overlay()

    def _launch_stop_overlay(self):
        self._overlay_rect = None
        _clean_signal_files()
        script = Path(__file__).resolve().parent / "macro_overlay.py"
        if not script.exists():
            return
        self._stop_overlay_proc = subprocess.Popen(
            [sys.executable, str(script)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        self._poll_thread = threading.Thread(target=self._poll_stop_signal, daemon=True)
        self._poll_thread.start()

    def _poll_stop_signal(self):
        while self._recording:
            if _STOP_SIGNAL_FILE.exists():
                try:
                    with open(_STOP_SIGNAL_FILE) as f:
                        data = json.load(f)
                    if data.get("action") == "stop":
                        self._recording = False
                except Exception:
                    pass
                break
            time.sleep(0.3)

    def stop_recording(self, name: str) -> Path:
        self._recording = False
        if self._mouse_listener:
            self._mouse_listener.stop()
        if self._key_listener:
            self._key_listener.stop()
        self._kill_stop_overlay()
        filtered = self._filter_overlay_events()
        path = MACROS_DIR / f"{name}.json"
        with open(path, "w") as f:
            json.dump({"name": name, "events": filtered}, f, indent=2)
        self._events = []
        _clean_signal_files()
        return path

    def _kill_stop_overlay(self):
        if self._stop_overlay_proc:
            try:
                self._stop_overlay_proc.kill()
                self._stop_overlay_proc.wait(timeout=3)
            except Exception:
                pass
            self._stop_overlay_proc = None
        if self._poll_thread:
            self._poll_thread = None

    def _load_overlay_rect(self) -> tuple[int, int, int, int] | None:
        if self._overlay_rect:
            return self._overlay_rect
        if _STOP_POS_FILE.exists():
            try:
                with open(_STOP_POS_FILE) as f:
                    d = json.load(f)
                self._overlay_rect = (d["x"], d["y"], d["x"] + d["w"], d["y"] + d["h"])
                return self._overlay_rect
            except Exception:
                pass
        return None

    def _filter_overlay_events(self) -> list[dict]:
        rect = self._load_overlay_rect()
        if rect is None:
            return self._events
        x1, y1, x2, y2 = rect
        out = []
        for ev in self._events:
            if ev["type"] == "click" and x1 <= ev["x"] <= x2 and y1 <= ev["y"] <= y2:
                continue
            out.append(ev)
        return out

    # ── Replay ───────────────────────────────────────────────────────────────

    def play(self, macro_id: str):
        path = MACROS_DIR / f"{macro_id}.json"
        if not path.exists():
            return False
        with open(path) as f:
            macro = json.load(f)
        mouse_ctrl = MouseController()
        keyboard_ctrl = KeyboardController()
        start = time.perf_counter()
        for ev in macro["events"]:
            elapsed = (time.perf_counter() - start) * 1000
            delay = ev["t"] - elapsed
            if delay > 0:
                time.sleep(delay / 1000)
            if ev["type"] == "click":
                mouse_ctrl.position = (ev["x"], ev["y"])
                btn = mouse.Button.left if "left" in ev["btn"] else mouse.Button.right
                if ev["action"] == "down":
                    mouse_ctrl.press(btn)
                else:
                    mouse_ctrl.release(btn)
            elif ev["type"] == "key":
                k = self._parse_key(ev["key"])
                if k is None:
                    continue
                if ev["action"] == "press":
                    keyboard_ctrl.press(k)
                else:
                    keyboard_ctrl.release(k)
        return True

    def list_macros(self) -> list[dict]:
        macros = []
        for f in sorted(MACROS_DIR.glob("*.json")):
            if f.stem.startswith("_"):
                continue
            with open(f) as fh:
                data = json.load(fh)
                macros.append({"id": f.stem, "name": data.get("name", f.stem)})
        return macros

    def delete_macro(self, macro_id: str) -> bool:
        path = MACROS_DIR / f"{macro_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    # ── Helpers ──────────────────────────────────────────────────────────────

    _KEY_MAP = {
        "Key.space": Key.space, "Key.enter": Key.enter, "Key.tab": Key.tab,
        "Key.backspace": Key.backspace, "Key.esc": Key.esc, "Key.shift": Key.shift,
        "Key.ctrl_l": Key.ctrl_l, "Key.ctrl_r": Key.ctrl_r, "Key.alt_l": Key.alt_l,
        "Key.alt_r": Key.alt_r, "Key.cmd": Key.cmd, "Key.delete": Key.delete,
        "Key.up": Key.up, "Key.down": Key.down, "Key.left": Key.left, "Key.right": Key.right,
        "Key.home": Key.home, "Key.end": Key.end, "Key.page_up": Key.page_up,
        "Key.page_down": Key.page_down, "Key.caps_lock": Key.caps_lock,
    }

    def _parse_key(self, key_str: str):
        if key_str in self._KEY_MAP:
            return self._KEY_MAP[key_str]
        if key_str.startswith("Key."):
            return None
        try:
            s = key_str.strip("'")
            if s.startswith("\\x") and len(s) == 4:
                return chr(int(s[2:], 16))
            return s
        except Exception:
            return None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _show_countdown_overlay(seconds: int):
    script = Path(__file__).resolve().parent / "macro_overlay.py"
    if not script.exists():
        return
    proc = subprocess.Popen(
        [sys.executable, str(script), str(seconds)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"Overlay exited with code {proc.returncode}")


def _clean_signal_files():
    for f in [_STOP_POS_FILE, _STOP_SIGNAL_FILE]:
        try:
            if f.exists():
                f.unlink()
        except Exception:
            pass
