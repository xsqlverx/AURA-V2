import json, time, threading, subprocess, tempfile
from pathlib import Path
from datetime import datetime

import pyautogui

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "activity"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def _ocr_image(image_path: Path) -> str:
    try:
        result = subprocess.run(
            ["tesseract", str(image_path), "stdout"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip()
    except Exception:
        return ""

class ActivityTracker:
    def __init__(self, interval: float = 5.0):
        self._interval = interval
        self._running = False
        self._entries: list[dict] = []
        self._last_window = ""
        self._thread: threading.Thread | None = None

    def start(self):
        self._running = True
        self._entries = []
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> Path:
        self._running = False
        if self._thread:
            self._thread.join(timeout=10)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = DATA_DIR / f"session_{ts}.json"
        with open(path, "w") as f:
            json.dump({"session": ts, "entries": self._entries}, f, indent=2)
        return path

    def summarize(self) -> str:
        summary_path = DATA_DIR / f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_summary.md"
        return str(summary_path)

    def _loop(self):
        while self._running:
            try:
                now = datetime.now().isoformat(timespec="seconds")
                window = self._get_foreground_window()
                if window == self._last_window:
                    time.sleep(self._interval)
                    continue
                self._last_window = window
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    tmp_path = Path(tmp.name)
                pyautogui.screenshot(str(tmp_path))
                text = _ocr_image(tmp_path)
                tmp_path.unlink(missing_ok=True)
                self._entries.append({
                    "t": now,
                    "window": window,
                    "text": text[:500],
                    "text_len": len(text),
                })
            except Exception:
                pass
            time.sleep(self._interval)

    def _get_foreground_window(self) -> str:
        try:
            import win32gui
            hwnd = win32gui.GetForegroundWindow()
            return win32gui.GetWindowText(hwnd)
        except Exception:
            return "unknown"
