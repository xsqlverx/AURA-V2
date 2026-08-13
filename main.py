"""Entry point — starts the backend server, voice pipeline, and Discord bot."""

import logging
import os
import signal
import sys
import threading
import time
from pathlib import Path

from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logging.getLogger("chromadb").setLevel(logging.WARNING)
logging.getLogger("faster_whisper").setLevel(logging.WARNING)
logging.getLogger("discord").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


def print_banner():
    banner = r"""
  +------------------------------------+
  |           A U R A  v2              |
  |     local AI assistant - online    |
  +------------------------------------+"""
    print(banner)


def start_backend():
    from core.server import start
    start()


def wait_for_backend():
    import requests

    logger.info("Waiting for backend...")
    for _ in range(60):
        try:
            r = requests.get("http://127.0.0.1:8000/health", timeout=1)
            if r.status_code == 200:
                logger.info("Backend ready.")
                return True
        except Exception:
            pass
        time.sleep(0.5)

    logger.error("Backend failed to start in time.")
    return False


if __name__ == "__main__":
    load_dotenv(Path(__file__).parent / ".env.local")

    print_banner()

    _lock_path = Path(__file__).parent / "data" / "aura.pid"
    _lock_path.parent.mkdir(exist_ok=True)
    import psutil
    _own_pid = str(os.getpid())
    try:
        _fh = open(_lock_path, "x")
        _fh.write(_own_pid)
        _fh.close()
        logger.info("LOCK: pid %s acquired fresh lock", _own_pid)
    except FileExistsError:
        _conflict = False
        _old_pid = 0
        for _ in range(5):
            try:
                _old_pid = int(_lock_path.read_text().strip())
                _conflict = psutil.pid_exists(_old_pid)
                break
            except Exception:
                time.sleep(0.1)
        logger.info("LOCK: pid %s saw existing lock, holder=%d alive=%s", _own_pid, _old_pid, _conflict)
        if _conflict:
            logger.error("Another main.py is already running (pid %d). Exiting.", _old_pid)
            sys.exit(0)
        try:
            _lock_path.write_text(_own_pid)
        except Exception:
            pass

    # Ctrl+C kills cleanly
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    # ── Backend ───────────────────────────────────────────────────────────────
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()

    if not wait_for_backend():
        sys.exit(1)

    try:
        if _lock_path.exists() and _lock_path.read_text().strip() != _own_pid:
            logger.error("Startup race lost — another main.py holds the lock. Exiting.")
            sys.exit(0)
    except Exception:
        pass

    logger.info("UI → http://localhost:3000  |  API → http://localhost:8000")

    # ── Voice pipeline ────────────────────────────────────────────────────────
    tts = None
    try:
        from voice.tts import create_engine
        from voice import pipeline as voice_pipeline
        from tools import hotkeys
        from core.config import TTS_PROVIDER, TTS_VOICE

        try:
            tts = create_engine(provider=TTS_PROVIDER, voice=TTS_VOICE)
        except Exception as e:
            logger.warning("Voice pipeline disabled — failed to init TTS: %s", e)
            tts = None

        if tts is not None:
            try:
                from comms.state import set_tts
                set_tts(tts)
            except Exception as e:
                logger.warning("Could not register TTS in comms.state: %s", e)
            try:
                hotkeys.set_tts(tts)
                hotkeys.start_hotkeys()
            except Exception:
                pass
            whisper_model = os.getenv("WHISPER_MODEL", "base")
            voice_thread = threading.Thread(
                target=voice_pipeline.run,
                args=(tts, whisper_model),
                daemon=True,
            )
            voice_thread.start()
            logger.info("Voice pipeline active.")
    except ImportError as e:
        logger.warning("Voice pipeline disabled — missing package: %s", e)

    # ── Discord bot ───────────────────────────────────────────────────────────
    try:
        from core.config import DISCORD_BOT_TOKEN
        if DISCORD_BOT_TOKEN:
            from comms.discord_bot import run as run_discord
            discord_thread = threading.Thread(
                target=run_discord,
                args=(tts,),
                daemon=True,
            )
            discord_thread.start()
            logger.info("Discord bot active.")
        else:
            logger.warning("Discord bot disabled — DISCORD_BOT_TOKEN not set in .env.local")
    except ImportError as e:
        logger.warning("Discord bot disabled — missing package: %s", e)

    # ── Keep process alive — all workers are daemon threads ───────────────────
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        try:
            _lock_path.unlink(missing_ok=True)
        except Exception:
            pass
        if tts is not None:
            try:
                tts.stop()
            except Exception:
                pass
        sys.exit(0)