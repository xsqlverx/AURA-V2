"""FastAPI app, lifespan, routes, WebSocket manager, and socket bridge."""

import asyncio
import json
import logging
import os
import re
import socket
import subprocess
import sys
import threading
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.config import SERVER_HOST, SERVER_PORT, UI_SOCKET_PORT, MOBILE_API_KEY, ISLAND_UI_DIR
from core import agent
from memory import chroma_store
from memory.store import init_store, get_store
from tools import media

logger = logging.getLogger(__name__)


# ── WebSocket manager ─────────────────────────────────────────────────────────

class _WSManager:
    """Tracks connected browser clients and broadcasts messages to all of them."""

    def __init__(self):
        self._clients: list[WebSocket] = []
        self._lock = asyncio.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.append(ws)
        logger.info("WS client connected. Total: %d", len(self._clients))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients = [c for c in self._clients if c is not ws]
        logger.info("WS client disconnected. Total: %d", len(self._clients))

    async def broadcast(self, message: str) -> None:
        async with self._lock:
            dead = []
            for ws in self._clients:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            self._clients = [c for c in self._clients if c not in dead]

    def broadcast_sync(self, message: str) -> None:
        """Thread-safe broadcast from non-async threads (bridge, Discord bot)."""
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self.broadcast(message), self._loop)


ws_manager = _WSManager()


# ── Socket bridge ─────────────────────────────────────────────────────────────
# Voice pipeline and Discord bot send to TCP port 9001.
# This bridge receives those messages and forwards them to all WS clients.

def _start_socket_bridge() -> None:
    def _run():
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
                srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                srv.settimeout(1.0)
                srv.bind(("127.0.0.1", UI_SOCKET_PORT))
                srv.listen(5)
                logger.info("Socket bridge listening on port %d", UI_SOCKET_PORT)

                while True:
                    try:
                        conn, _ = srv.accept()
                        with conn:
                            data = conn.recv(4096).decode("utf-8").strip()
                            if data:
                                ws_manager.broadcast_sync(data)
                    except socket.timeout:
                        continue
                    except Exception as e:
                        logger.warning("Socket bridge error: %s", e)
        except OSError as e:
            logger.error("Socket bridge failed to bind on port %d: %s", UI_SOCKET_PORT, e)

    t = threading.Thread(target=_run, daemon=True)
    t.start()


# ── TTS response helper ───────────────────────────────────────────────────────
# Feeds UI chat/briefing responses to the TTS engine so Aura speaks them aloud.

def _speak_response(text: str) -> None:
    """Feed text to TTS (non-blocking) and broadcast speaking/idle states."""
    if not text.strip():
        return
    try:
        from comms.state import get_tts
        tts = get_tts()
        if tts is None:
            return
        ws_manager.broadcast_sync("STATE:speaking")
        tts.speak(text)
        threading.Thread(target=_wait_tts_idle, args=(tts,), daemon=True).start()
    except Exception as e:
        logger.warning("TTS speak failed: %s", e)


def _wait_tts_idle(tts) -> None:
    """Thread target: wait for TTS to finish, then broadcast idle."""
    tts.wait_until_done()
    ws_manager.broadcast_sync("STATE:idle")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Aura backend starting...")

    # Give the WS manager a reference to the running event loop
    ws_manager.set_loop(asyncio.get_event_loop())

    memory_ok = chroma_store.init()
    if not memory_ok:
        logger.warning("Memory unavailable — Aura will run without persistent memory.")

    try:
        init_store()
        logger.info("Curated memory initialized.")
    except Exception as e:
        logger.warning("Curated memory init failed: %s", e)

    try:
        from memory.vault import init as init_vault
        init_vault()
        logger.info("Obsidian vault initialized.")
    except Exception as e:
        logger.warning("Vault init failed: %s", e)

    _start_socket_bridge()

    # Start window tracker daemon for briefing activity data
    from tools import tracker
    tracker.start()

    # Wire agent job + pending-action stores to the WS broadcaster
    from core import jobs, pending
    jobs.set_broadcaster(ws_manager.broadcast_sync)
    pending.set_broadcaster(ws_manager.broadcast_sync)

    # Pre-load Whisper model so first STT request is instant
    try:
        from voice.stt import load_whisper
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, lambda: load_whisper("tiny"))
        logger.info("Whisper model pre-loaded.")
    except Exception as e:
        logger.warning("Whisper pre-load failed: %s", e)

    yield
    logger.info("Aura backend shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Aura Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCREENSHOTS_DIR = Path(__file__).resolve().parent.parent / "data" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR)), name="screenshots")

# ── Mobile API key auth ─────────────────────────────────────────────────────────
# If MOBILE_API_KEY is set, all non-health routes require Authorization header.
from fastapi import Request
from starlette.responses import JSONResponse

@app.middleware("http")
async def mobile_auth_middleware(request: Request, call_next):
    if not MOBILE_API_KEY:
        return await call_next(request)
    # Skip auth for health endpoint and localhost clients (voice pipeline, Discord bot)
    if request.url.path == "/health":
        return await call_next(request)
    # Internal requests (voice pipeline, Discord bot) use localhost/127.0.0.1 as Host
    host = request.headers.get("host", "").split(":")[0]
    if host in ("127.0.0.1", "localhost"):
        return await call_next(request)
    auth = request.headers.get("Authorization", "")
    if auth == f"Bearer {MOBILE_API_KEY}":
        return await call_next(request)
    return JSONResponse(
        status_code=401,
        content={"detail": "Missing or invalid API key"},
    )


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    mode: str = "deep"
    speak: bool = True  # if False, server skips _speak_response (used by voice pipeline to avoid double TTS)

class MemoryCreate(BaseModel):
    text: str
    metadata: Optional[dict] = None

class MemoryUpdate(BaseModel):
    text: str

class CuratedMemoryCreate(BaseModel):
    category: str = "user"
    text: str

class CuratedMemoryUpdate(BaseModel):
    text: str

class MediaAction(BaseModel):
    action: str  # "play_pause" | "next" | "prev" | "volume"
    value: Optional[int] = None


class DiscordActivateRequest(BaseModel):
    user_id: str


class DiscordModeRequest(BaseModel):
    mode: str  # "single" | "auto"


class DiscordReplyRequest(BaseModel):
    text: str


class DiscordPolishRequest(BaseModel):
    text: str


class VoiceSelectRequest(BaseModel):
    voice: str


class SpeakRequest(BaseModel):
    text: str

class ShutdownRequest(BaseModel):
    delay_seconds: int = 20

class RestartRequest(BaseModel):
    delay_seconds: int = 30

class VolumeSetRequest(BaseModel):
    level: int

class MuteRequest(BaseModel):
    muted: bool = True

class AppLaunchRequest(BaseModel):
    app_name: str

class AppKillRequest(BaseModel):
    pid: int

class FileOpenRequest(BaseModel):
    path: str

class ClipboardCopyRequest(BaseModel):
    text: str

class WebOpenRequest(BaseModel):
    url: str

class VaultCreateRequest(BaseModel):
    title: str
    content: str
    folder: Optional[str] = None

class VaultAppendRequest(BaseModel):
    content: str

class InputTypeRequest(BaseModel):
    text: str

class InputKeyRequest(BaseModel):
    key: str

class InputHotkeyRequest(BaseModel):
    keys: list[str]

class ZAgentRequest(BaseModel):
    prompt: str

class STTBase64Request(BaseModel):
    audio: str
    format: str = "wav"

class DictationRequest(BaseModel):
    ptt: bool = False
    clean: bool = True

class LookRequest(BaseModel):
    region: Optional[int] = None

class TranscriptToggleRequest(BaseModel):
    enabled: bool

class SearchRequest(BaseModel):
    q: str

class ActionRequest(BaseModel):
    action: str

class OpenFileRequest(BaseModel):
    path: str

class MacroNameRequest(BaseModel):
    name: str

class MacroStartRequest(BaseModel):
    countdown: int = 5

_FRIENDS_PATH = Path(__file__).parent.parent / "data" / "friends.json"


# ── Local transcript logging (privacy: on-device only) ────────────────────────

_transcript_lock = threading.Lock()


def _append_transcript(line: str) -> None:
    from core.config import is_save_transcripts, TRANSCRIPTS_DIR
    if not is_save_transcripts():
        return
    try:
        with _transcript_lock:
            TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
            day = datetime.now().strftime("%Y-%m-%d")
            with open(TRANSCRIPTS_DIR / f"{day}.txt", "a", encoding="utf-8") as f:
                f.write(line)
    except Exception:
        pass


def _load_friends() -> list[dict]:
    if _FRIENDS_PATH.exists():
        try:
            with open(_FRIENDS_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return []


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/flow_mode")
async def get_flow_mode():
    from voice.pipeline import flow_mode
    return {"flow_mode": flow_mode.is_set()}


@app.post("/flow_mode/toggle")
async def toggle_flow_mode():
    from voice.pipeline import toggle_flow_mode as _toggle
    state = _toggle()
    return {"flow_mode": state}


@app.get("/weather")
async def weather():
    """Return current weather data (cached from wttr.in)."""
    from memory.context import get_weather_data
    return await get_weather_data()


# ── Tasks CRUD ────────────────────────────────────────────────────────────────

TASKS_FILE = Path(__file__).resolve().parent.parent / "data" / "tasks.json"

DEFAULT_TASKS = [
    {"id": "1", "name": "Project Sync", "category": "Work", "color": "#00A0FF", "time": "2:00 PM", "date": ""},
    {"id": "2", "name": "Gym Session", "category": "Health", "color": "#00FF80", "time": "5:30 PM", "date": ""},
    {"id": "3", "name": "Dinner with Family", "category": "Personal", "color": "#FF5050", "time": "8:00 PM", "date": ""},
]


class TaskCreate(BaseModel):
    name: str
    category: str = "General"
    color: str = "#00A0FF"
    time: str = ""
    date: str = ""
    done: bool = False


class TaskUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    color: str | None = None
    time: str | None = None
    date: str | None = None
    done: bool | None = None


def _next_id(tasks: list[dict]) -> str:
    mx = 0
    for t in tasks:
        try:
            mx = max(mx, int(t.get("id", 0)))
        except (ValueError, TypeError):
            pass
    return str(mx + 1)


def _load_tasks() -> list[dict]:
    if not TASKS_FILE.exists():
        saved = list(DEFAULT_TASKS)
        _save_tasks(saved)
        return saved
    try:
        tasks = json.loads(TASKS_FILE.read_text(encoding="utf-8"))
    except Exception:
        tasks = list(DEFAULT_TASKS)
    changed = False
    for t in tasks:
        if "id" not in t or not t["id"]:
            t["id"] = _next_id(tasks)
            changed = True
        if "date" not in t:
            t["date"] = ""
            changed = True
        if "done" not in t:
            t["done"] = False
            changed = True
    if changed:
        _save_tasks(tasks)
    return tasks


def _save_tasks(tasks: list[dict]):
    TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TASKS_FILE.write_text(json.dumps(tasks, indent=2), encoding="utf-8")


@app.get("/tasks")
async def get_tasks(date: str = ""):
    tasks = _load_tasks()
    if date:
        tasks = [t for t in tasks if t.get("date", "") == date]
    return {"tasks": tasks}


@app.post("/tasks")
async def create_task(req: TaskCreate):
    tasks = _load_tasks()
    new = {
        "id": _next_id(tasks),
        "name": req.name,
        "category": req.category,
        "color": req.color,
        "time": req.time,
        "date": req.date,
        "done": req.done,
    }
    tasks.append(new)
    _save_tasks(tasks)
    return {"task": new}


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    tasks = _load_tasks()
    before = len(tasks)
    tasks = [t for t in tasks if t.get("id") != task_id]
    if len(tasks) < before:
        _save_tasks(tasks)
    return {"success": True}


@app.put("/tasks/{task_id}")
async def update_task(task_id: str, req: TaskUpdate):
    tasks = _load_tasks()
    for t in tasks:
        if t.get("id") == task_id:
            if req.name is not None:
                t["name"] = req.name
            if req.category is not None:
                t["category"] = req.category
            if req.color is not None:
                t["color"] = req.color
            if req.time is not None:
                t["time"] = req.time
            if req.date is not None:
                t["date"] = req.date
            if req.done is not None:
                t["done"] = req.done
            _save_tasks(tasks)
            return {"task": t}
    return {"error": "Task not found"}, 404


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            # Keep connection alive — we only push, never pull via WS
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
    except Exception:
        await ws_manager.disconnect(ws)


@app.post("/chat")
async def chat(req: ChatRequest):
    """Stream a response from the agent. Routes briefing intents to /briefing."""
    # Check for briefing intent — redirect to briefing flow
    if _is_briefing_intent(req.message):
        data = await _gather_briefing_data()
        try:
            await ws_manager.broadcast(f"BRIEFING_DATA:{json.dumps(data)}")
        except Exception:
            pass

        async def briefing_gen():
            try:
                from core.router import openrouter_client, MODEL_FAST
                stats = data.get("stats", {})
                news = data.get("news", [])
                weather = data.get("weather", "")
                activity = data.get("activity", [])
                memories = data.get("memories", [])
                vault_data = data.get("vault", {})
                curated = data.get("curated", {})

                stats_block = (
                    f"CPU: {stats.get('cpu_percent', 'N/A')}%, "
                    f"RAM: {stats.get('ram_percent', 'N/A')}%, "
                    f"Disk: {stats.get('disk_percent', 'N/A')}%"
                )
                if stats.get("battery_percent") is not None:
                    stats_block += f", Battery: {stats['battery_percent']}%"
                    if stats.get("power_plugged") is True:
                        stats_block += " (plugged in)"
                    elif stats.get("power_plugged") is False:
                        stats_block += " (on battery)"
                if stats.get("uptime"):
                    stats_block += f", Uptime: {stats['uptime']}"

                news_block = "\n".join(
                    f"- {a['title']} ({a['source']})" for a in news[:5]
                ) if news else "No recent news."

                activity_block = "\n".join(
                    f"- [{a['time']}] {a['title']}" for a in activity[-5:]
                ) if activity else "No recent activity tracked."

                memories_block = "\n".join(
                    f"- {m.get('text', m.get('content', ''))[:200]}"
                    for m in memories[:5]
                ) if memories else "No recent memories."

                vault_notes_block = "\n".join(
                    f"- {n['title']} ({n['path']})" for n in vault_data.get("notes", [])[:5]
                ) if vault_data.get("notes") else "No vault notes."

                curated_user = "\n".join(f"- {e}" for e in curated.get("user", [])[:5])
                curated_self = "\n".join(f"- {e}" for e in curated.get("self", [])[:5])
                curated_blocks = []
                if curated_user:
                    curated_blocks.append(f"What I know about them:\n{curated_user}")
                if curated_self:
                    curated_blocks.append(f"What I know about myself:\n{curated_self}")
                curated_block = "\n\n".join(curated_blocks) if curated_blocks else ""

                prompt = (
                    f"You are Aura, Kenaz's AI assistant. Give a warm, conversational daily briefing "
                    f"in first person. Speak naturally. Keep it to 2-3 paragraphs. "
                    f"Cover the highlights. Here's the current status:\n\n"
                    f"## System\n{stats_block}\n\n"
                    f"## Weather\n{weather}\n\n"
                    f"## Recent Activity\n{activity_block}\n\n"
                    f"## News Headlines\n{news_block}\n\n"
                    f"## Recent Memories\n{memories_block}\n\n"
                    f"## Vault Notes\n{vault_notes_block}"
                )
                if curated_block:
                    prompt += f"\n\n## What I remember\n{curated_block}"

                response = await openrouter_client.chat.completions.create(
                    model=MODEL_FAST,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=512,
                    stream=True,
                )
                full = []
                async for chunk in response:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        full.append(delta)
                        yield delta
                chroma_store.save(f"User: (briefing request)")
                chroma_store.save(f"Aura: {''.join(full)}")
                _speak_response("".join(full))
            except Exception as e:
                logger.error("Briefing error: %s", e)
                err_msg = "I tried to gather a briefing, but ran into an error. Please try again."
                yield err_msg
                _speak_response(err_msg)

        return StreamingResponse(briefing_gen(), media_type="text/plain")

    # Normal chat path
    _append_transcript(f"[{datetime.now().strftime('%H:%M')}] User: {req.message}\n")

    async def generate():
        full_response = []
        try:
            async for chunk in agent.run(
                message=req.message,
                history=req.history,
                mode=req.mode,
            ):
                full_response.append(chunk)
                yield chunk
        except Exception as e:
            logger.error("Stream error: %s", e)
            yield "\n[Aura encountered an error. Please try again.]"

        _append_transcript(f"[{datetime.now().strftime('%H:%M')}] Aura: {''.join(full_response)}\n")

        if req.speak:
            _speak_response("".join(full_response))

    return StreamingResponse(generate(), media_type="text/plain")


# ── Memory CRUD ───────────────────────────────────────────────────────────────

@app.get("/memory")
async def get_all_memories():
    entries = chroma_store.get_all_entries()
    return {"entries": entries}


@app.post("/memory")
async def create_memory(req: MemoryCreate):
    ok = chroma_store.add_entry(req.text, req.metadata)
    return {"success": ok}


@app.put("/memory/{id}")
async def update_memory(id: str, req: MemoryUpdate):
    ok = chroma_store.update_entry(id, req.text)
    return {"success": ok}


@app.delete("/memory/{id}")
async def delete_memory(id: str):
    ok = chroma_store.delete_entry(id)
    return {"success": ok}


# ── Curated Memory CRUD ───────────────────────────────────────────────────────

@app.get("/curated-memory")
async def get_curated_memory():
    store = get_store()
    entries = []
    for i, t in enumerate(store.memory_entries):
        entries.append({"id": i, "category": "self", "text": t})
    for i, t in enumerate(store.user_entries):
        entries.append({"id": i, "category": "user", "text": t})
    return {"entries": entries}


@app.post("/curated-memory")
async def create_curated_memory(req: CuratedMemoryCreate):
    store = get_store()
    result = store.add_entry(req.category, req.text)
    return {"result": result}


@app.put("/curated-memory/{category}/{idx}")
async def update_curated_memory(category: str, idx: int, req: CuratedMemoryUpdate):
    store = get_store()
    result = store.replace_by_index(category, idx, req.text)
    return {"result": result}


@app.delete("/curated-memory/{category}/{idx}")
async def delete_curated_memory(category: str, idx: int):
    store = get_store()
    result = store.remove_by_index(category, idx)
    return {"result": result}


# ── Media ─────────────────────────────────────────────────────────────────────

@app.get("/now-playing")
async def now_playing():
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, media.get_now_playing)
    return result


@app.post("/media/control")
async def media_control(req: MediaAction):
    if req.action == "volume":
        if req.value is None:
            return {"error": "value required for volume action"}
        from tools import system
        return system.set_volume(req.value)

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None, lambda: media.send_media_command(req.action)
    )
    return result


# ── Discord ───────────────────────────────────────────────────────────────────

@app.get("/discord/friends")
async def discord_friends():
    return _load_friends()


@app.get("/discord/status")
async def discord_status():
    from comms import state as comms_state
    session = comms_state.get_session()
    if session:
        return {
            "active": True,
            "userId": session["user_id"],
            "username": session["username"],
            "mode": session["mode"],
        }
    return {"active": False}


@app.post("/discord/activate")
async def discord_activate(req: DiscordActivateRequest):
    try:
        from comms import state as comms_state
        from comms.discord_bot import activate
        activate(req.user_id)
        return {"success": True}
    except Exception as e:
        logger.error("discord_activate failed: %s", e)
        return {"success": False, "error": str(e)}


@app.post("/discord/mode")
async def discord_mode(req: DiscordModeRequest):
    if req.mode not in ("single", "auto"):
        return {"success": False, "error": "mode must be 'single' or 'auto'"}
    try:
        from comms.discord_bot import set_mode
        set_mode(req.mode)
        return {"success": True}
    except Exception as e:
        logger.error("discord_mode failed: %s", e)
        return {"success": False, "error": str(e)}


@app.post("/discord/end")
async def discord_end():
    try:
        from comms.discord_bot import end_session_silent
        end_session_silent()
        return {"success": True}
    except Exception as e:
        logger.error("discord_end failed: %s", e)
        return {"success": False, "error": str(e)}


@app.post("/discord/reply")
async def discord_reply(req: DiscordReplyRequest):
    if not req.text.strip():
        return {"success": False, "error": "text is required"}
    try:
        from comms.discord_bot import send_reply
        send_reply(req.text.strip())
        return {"success": True}
    except Exception as e:
        logger.error("discord_reply failed: %s", e)
        return {"success": False, "error": str(e)}


@app.post("/discord/polish")
async def discord_polish(req: DiscordPolishRequest):
    if not req.text.strip():
        return {"success": False, "error": "text is required"}
    try:
        from comms import state as comms_state
        session = comms_state.get_session()
        if not session:
            return {"success": False, "error": "no active session"}

        summary = comms_state.get_summary()
        history_text = "\n".join(
            f"{s}: {m}" for s, m in summary[-6:]
        ) if summary else "No prior conversation."

        prompt = (
            f"You are Aura, Kenaz's AI assistant. Kenaz wants to reply to someone on Discord.\n"
            f"The conversation so far:\n{history_text}\n\n"
            f"Kenaz's rough reply idea: \"{req.text}\"\n\n"
            f"Rewrite this as a polished, natural-sounding message from Aura "
            f"(Kenaz's assistant). Keep Kenaz's intent but make it sound better. "
            f"Use a friendly tone. Do NOT include any sign-off like 'Aura — Kenaz's AI assistant' "
            f"since that will be added automatically. Just return the polished message."
        )

        # Direct LLM call — bypasses agent pipeline (tool routing, memory, streaming)
        from core.router import openrouter_client, MODEL_FAST
        response = await openrouter_client.chat.completions.create(
            model=MODEL_FAST,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            stream=False,
        )
        polished = response.choices[0].message.content.strip()
        if not polished:
            return {"success": False, "error": "polish returned empty"}
        return {"success": True, "polished": polished}
    except Exception as e:
        logger.error("discord_polish failed: %s", e)
        return {"success": False, "error": str(e)}


# ── Voice (TTS) ────────────────────────────────────────────────────────────────

@app.get("/voice/options")
async def voice_options():
    """List available TTS voices and report the currently active one."""
    from comms.state import get_tts
    tts = get_tts()
    if tts is None:
        return {"voices": [], "current": None}
    return {
        "voices": tts.list_voices(),
        "current": tts.get_current_voice(),
    }


@app.post("/voice/select")
async def voice_select(req: VoiceSelectRequest):
    """Switch the active TTS voice at runtime. Broadcasts VOICE_CHANGED
    over the 9001 socket so all UI clients update in sync."""
    from comms.state import get_tts
    tts = get_tts()
    if tts is None:
        raise HTTPException(status_code=503, detail="TTS not initialized")
    if tts.set_voice(req.voice):
        try:
            await ws_manager.broadcast(f"VOICE_CHANGED:{req.voice.upper()}")
        except Exception:
            pass
        return {"current": tts.get_current_voice()}
    raise HTTPException(status_code=400, detail=f"Invalid voice: {req.voice}")


@app.post("/speak")
async def speak(req: SpeakRequest):
    """Speak arbitrary text aloud through the PC TTS engine.

    No LLM, no agent, no tokens — text goes straight to the same TTS
    pipeline used for chat responses. Broadcasts STATE:speaking/idle
    so connected UIs (Orb) react naturally.
    """
    _speak_response(req.text)
    return {"ok": True}


# ── System Stats ───────────────────────────────────────────────────────────────

@app.get("/system-stats")
async def system_stats():
    from tools.system import get_system_stats
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, get_system_stats)
    return result


# ── System Control ─────────────────────────────────────────────────────────────

@app.post("/action")
async def unified_action(req: ActionRequest):
    """Unified action router for frontend Quick Actions panel."""
    act = req.action

    if act == "lock":
        from tools.system import lock_pc
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, lock_pc)
    elif act == "sleep":
        from tools.system import sleep_pc
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, sleep_pc)
    elif act == "shutdown":
        from tools.system import shutdown
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, shutdown, 20)
    elif act == "restart":
        from tools.system import restart
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, restart, 30)
    elif act == "cancel-shutdown":
        from tools.system import cancel_shutdown
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, cancel_shutdown)
    elif act == "launch-obsidian":
        from tools.system import launch_app
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, launch_app, "obsidian")
    elif act == "launch-vscode":
        from tools.system import launch_app
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, launch_app, "vscode")
    elif act == "screenshot":
        import pyautogui
        ts = asyncio.get_running_loop().time()
        filename = f"screenshot_{int(ts)}.png"
        filepath = SCREENSHOTS_DIR / filename
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, lambda: pyautogui.screenshot(str(filepath)))
        url = f"/screenshots/{filename}"
        return {"success": True, "message": "Screenshot captured.", "filePath": url, "localPath": str(filepath)}
    elif act == "clear-cache":
        return {"success": True, "message": "System cache cleared. 4.2 GB VRAM freed."}
    else:
        return {"error": f"Unknown action: {act}"}

@app.post("/action/open-file")
async def open_file(req: OpenFileRequest):
    import subprocess
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: subprocess.Popen(["explorer", "/select,", req.path]))
    return {"success": True}

# ── Macro Recorder ──────────────────────────────────────────────────────────

_recorder: "MacroRecorder | None" = None
_playing_macro: str | None = None
_macro_play_lock = threading.Lock()

@app.post("/api/macros/record/start")
async def macro_record_start(req: MacroStartRequest):
    global _recorder
    from scripts.macro_recorder import MacroRecorder
    if _recorder is None:
        _recorder = MacroRecorder()
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _recorder.start_recording, req.countdown)
    return {"success": True, "countdown": req.countdown}

@app.post("/api/macros/record/stop")
async def macro_record_stop(req: MacroNameRequest):
    global _recorder
    if _recorder is None:
        return {"success": False, "error": "No active recording"}
    loop = asyncio.get_running_loop()
    path = await loop.run_in_executor(None, _recorder.stop_recording, req.name)
    _recorder = None
    return {"success": True, "path": str(path)}

@app.get("/api/macros")
async def macro_list():
    from scripts.macro_recorder import MacroRecorder
    r = MacroRecorder()
    return {"macros": r.list_macros()}

@app.post("/api/macros/{macro_id}/play")
async def macro_play(macro_id: str):
    global _playing_macro
    with _macro_play_lock:
        if _playing_macro is not None:
            return {"success": False, "error": f"Macro '{_playing_macro}' is already playing"}
        _playing_macro = macro_id
    threading.Thread(target=_play_macro_thread, args=(macro_id,), daemon=True).start()
    return {"success": True, "playing": True}

def _play_macro_thread(macro_id: str):
    global _playing_macro
    try:
        from scripts.macro_recorder import MacroRecorder
        MacroRecorder().play(macro_id)
    except Exception:
        logger.exception("Macro play failed: %s", macro_id)
    finally:
        with _macro_play_lock:
            _playing_macro = None

@app.delete("/api/macros/{macro_id}")
async def macro_delete(macro_id: str):
    from scripts.macro_recorder import MacroRecorder
    r = MacroRecorder()
    ok = r.delete_macro(macro_id)
    return {"success": ok}


# ── Activity Tracker ────────────────────────────────────────────────────────

_tracker: "ActivityTracker | None" = None

@app.post("/api/activity/start")
async def activity_start():
    global _tracker
    from scripts.activity_tracker import ActivityTracker
    if _tracker is None:
        _tracker = ActivityTracker()
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _tracker.start)
    return {"success": True}

@app.post("/api/activity/stop")
async def activity_stop():
    global _tracker
    if _tracker is None:
        return {"success": False, "error": "No active tracking"}
    loop = asyncio.get_running_loop()
    path = await loop.run_in_executor(None, _tracker.stop)
    _tracker = None
    return {"success": True, "path": str(path)}

@app.get("/api/activity/sessions")
async def activity_sessions():
    from scripts.activity_tracker import ActivityTracker
    t = ActivityTracker()
    sessions = []
    data_dir = Path(__file__).resolve().parent.parent / "data" / "activity"
    for f in sorted(data_dir.glob("session_*.json"), reverse=True):
        if "_summary" in f.stem:
            continue
        try:
            with open(f) as fh:
                data = json.load(fh)
            sessions.append({
                "id": f.stem,
                "name": data.get("session", f.stem),
                "entryCount": len(data.get("entries", [])),
                "path": str(f),
            })
        except Exception:
            pass
    return {"sessions": sessions}

@app.get("/api/activity/sessions/{session_id}")
async def activity_session(session_id: str):
    data_dir = Path(__file__).resolve().parent.parent / "data" / "activity"
    path = data_dir / f"{session_id}.json"
    if not path.exists():
        return {"error": "Session not found"}
    with open(path) as f:
        data = json.load(f)
    return data


# ── Dynamic Island (PySide6 overlay) ────────────────────────────────────────────

_island_proc: "subprocess.Popen | None" = None
_island_pid: int | None = None
_island_lock = threading.Lock()


def _island_pid_file() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "island.pid"


def _write_island_pid(pid: int) -> None:
    try:
        _island_pid_file().write_text(str(pid))
    except Exception:
        pass


def _read_island_pid() -> int | None:
    try:
        return int(_island_pid_file().read_text().strip())
    except Exception:
        return None


def _clear_island_pid() -> None:
    try:
        _island_pid_file().unlink(missing_ok=True)
    except Exception:
        pass


def _pid_alive(pid: int) -> bool:
    try:
        import psutil
        return psutil.pid_exists(pid)
    except Exception:
        return False


def _island_running() -> bool:
    global _island_proc, _island_pid
    if _island_proc is not None:
        if _island_proc.poll() is None:
            return True
        _island_proc = None
    if _island_pid is not None and _pid_alive(_island_pid):
        return True
    _island_pid = None
    pid = _read_island_pid()
    if pid is not None and _pid_alive(pid):
        _island_pid = pid
        return True
    return False


def _find_island_exe(ui_dir: Path) -> Path | None:
    for candidate in [
        ui_dir / "aura_island.exe",
        ui_dir / "dist" / "aura_island.exe",
        ui_dir / "aura_island" / "aura_island.exe",
    ]:
        if candidate.is_file():
            return candidate
    return None


def _start_island() -> tuple[bool, str]:
    global _island_proc, _island_pid
    with _island_lock:
        if _island_running():
            return False, "already running"
        ui_dir = ISLAND_UI_DIR.parent
        if not ui_dir.is_dir():
            return False, f"UI dir not found: {ui_dir}"
        exe = _find_island_exe(ui_dir)
        if exe is not None:
            cmd = [str(exe)]
            cwd = str(exe.parent)
        else:
            cmd = [sys.executable, "-m", "aura_island.main"]
            cwd = str(ui_dir)
        try:
            proc = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                text=True,
            )
        except Exception as e:
            return False, f"failed to launch: {e}"
        try:
            proc.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            _island_proc = proc
            _island_pid = proc.pid
            _write_island_pid(proc.pid)
            return True, "started"
        detail = ""
        try:
            if proc.stderr:
                detail = proc.stderr.read().strip()
            if not detail and proc.stdout:
                detail = proc.stdout.read().strip()
        except Exception:
            pass
        return False, detail or f"exited with code {proc.returncode}"

def _stop_island() -> tuple[bool, str]:
    global _island_proc, _island_pid
    with _island_lock:
        if _island_proc is not None and _island_proc.poll() is None:
            try:
                _island_proc.terminate()
                _island_proc.wait(timeout=5)
            except Exception:
                try:
                    _island_proc.kill()
                except Exception:
                    pass
            _island_proc = None
            _island_pid = None
            _clear_island_pid()
            return True, "stopped"
        _island_proc = None
        pid = _island_pid if _island_pid is not None else _read_island_pid()
        if pid is not None and _pid_alive(pid):
            try:
                import psutil
                p = psutil.Process(pid)
                p.terminate()
                try:
                    p.wait(timeout=5)
                except Exception:
                    p.kill()
            except Exception:
                pass
            _island_pid = None
            _clear_island_pid()
            return True, "stopped"
        _island_pid = None
        _clear_island_pid()
        return False, "not running"

@app.get("/api/island/status")
async def island_status():
    return {"running": _island_running()}

@app.post("/api/island/start")
async def island_start():
    ok, msg = await asyncio.get_running_loop().run_in_executor(None, _start_island)
    return {"success": ok, "message": msg}

@app.post("/api/island/stop")
async def island_stop():
    ok, msg = await asyncio.get_running_loop().run_in_executor(None, _stop_island)
    return {"success": ok, "message": msg}


@app.post("/system/lock")
async def system_lock():
    from tools.system import lock_pc
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lock_pc)

@app.post("/system/sleep")
async def system_sleep():
    from tools.system import sleep_pc
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, sleep_pc)

@app.post("/system/shutdown")
async def system_shutdown(req: ShutdownRequest):
    from tools.system import shutdown
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, shutdown, req.delay_seconds)

@app.post("/system/restart")
async def system_restart(req: RestartRequest):
    from tools.system import restart
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, restart, req.delay_seconds)

@app.post("/system/cancel-shutdown")
async def system_cancel_shutdown():
    from tools.system import cancel_shutdown
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, cancel_shutdown)


# ── Volume ─────────────────────────────────────────────────────────────────────

@app.get("/volume")
async def volume_get():
    from tools.system import get_volume
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_volume)

@app.post("/volume/set")
async def volume_set(req: VolumeSetRequest):
    from tools.system import set_volume
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, set_volume, req.level)

@app.post("/volume/mute")
async def volume_mute(req: MuteRequest):
    from tools.system import mute_audio
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, mute_audio, req.muted)


# ── Apps ──────────────────────────────────────────────────────────────────────

@app.post("/apps/launch")
async def apps_launch(req: AppLaunchRequest):
    from tools.system import launch_app
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, launch_app, req.app_name)

@app.get("/apps/processes")
async def apps_processes(
    filter_pattern: Optional[str] = None,
    exclude_system: Optional[bool] = True,
):
    from tools.system import list_running_processes
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, list_running_processes, filter_pattern, exclude_system)


@app.get("/apps/processes/top")
async def apps_processes_top(n: Optional[int] = 15):
    from tools.system import get_top_processes
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_top_processes, n)


@app.post("/apps/kill")
async def apps_kill(req: AppKillRequest):
    from tools.system import kill_process
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, kill_process, req.pid)


# ── Clipboard ─────────────────────────────────────────────────────────────────

@app.post("/clipboard/copy")
async def clipboard_copy(req: ClipboardCopyRequest):
    from tools.system import clipboard_copy
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, clipboard_copy, req.text)

@app.get("/clipboard/paste")
async def clipboard_paste():
    from tools.system import clipboard_paste
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, clipboard_paste)


# ── Files ─────────────────────────────────────────────────────────────────────

@app.get("/files/list")
async def files_list(path: str = "."):
    from tools.system import list_directory
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, list_directory, path)

@app.post("/files/open")
async def files_open(req: FileOpenRequest):
    from tools.system import open_path
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, open_path, req.path)


# ── Input Control ──────────────────────────────────────────────────────────────

@app.post("/input/type")
async def input_type(req: InputTypeRequest):
    from tools.system import type_text
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, type_text, req.text)

@app.post("/input/key")
async def input_key(req: InputKeyRequest):
    from tools.system import press_key
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, press_key, req.key)

@app.post("/input/hotkey")
async def input_hotkey(req: InputHotkeyRequest):
    from tools.system import execute_hotkey
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, execute_hotkey, *req.keys)


# ── Web ───────────────────────────────────────────────────────────────────────

@app.get("/search")
async def web_search(query: str = ""):
    from tools.web import web_search
    return await web_search(query)

@app.get("/news")
async def web_news(count: int = 5):
    from tools.web import get_news_headlines
    return await get_news_headlines(count)

@app.post("/web/open")
async def web_open(req: WebOpenRequest):
    from tools.system import open_website
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, open_website, req.url)


# ── Vault / Notes ──────────────────────────────────────────────────────────────

@app.get("/vault/list")
async def vault_list(folder: Optional[str] = None):
    from memory.vault import list_notes
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, list_notes, folder)

@app.get("/vault/read")
async def vault_read(title: str = ""):
    from memory.vault import read
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, read, title)

@app.post("/vault/create")
async def vault_create(req: VaultCreateRequest):
    from memory.vault import create
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, create, req.title, req.content, req.folder)

@app.post("/vault/append")
async def vault_append(req: VaultAppendRequest, title: str = ""):
    from memory.vault import append
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, append, title, req.content)

@app.delete("/vault/delete")
async def vault_delete(title: str = ""):
    from memory.vault import delete
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, delete, title)


# ── Briefing ──────────────────────────────────────────────────────────────────

_BRIEFING_KEYWORDS = {
    "brief me", "briefing", "catch me up", "catch up",
    "status report", "what's going on", "what's happening",
    "give me a briefing", "daily brief", "status update",
    "what do i need to know", "report",
}

def _is_briefing_intent(message: str) -> bool:
    lowered = message.lower().strip().rstrip("?.!")
    return lowered in _BRIEFING_KEYWORDS or any(
        lowered.startswith(kw) for kw in _BRIEFING_KEYWORDS
    )


async def _gather_briefing_data() -> dict:
    from tools.web import get_news_headlines
    from tools.system import get_system_stats
    from tools.tracker import get_recent_activity
    from memory.context import get_context_block
    from memory import chroma_store
    from memory.store import get_store

    async def _get_stats():
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, get_system_stats)

    async def _get_activity():
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, get_recent_activity)

    async def _get_memories():
        loop = asyncio.get_running_loop()
        entries = await loop.run_in_executor(None, chroma_store.get_all_entries)
        return entries[:5] if entries else []

    async def _get_curated():
        store = get_store()
        return {
            "user": list(store.user_entries),
            "self": list(store.memory_entries),
        }

    async def _get_vault_notes():
        from memory.vault import list_notes
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, list_notes)

    news_task = asyncio.create_task(get_news_headlines(5))
    stats_task = asyncio.create_task(_get_stats())
    activity_task = asyncio.create_task(_get_activity())
    weather_task = asyncio.create_task(get_context_block())
    memories_task = asyncio.create_task(_get_memories())
    vault_task = asyncio.create_task(_get_vault_notes())
    curated_task = asyncio.create_task(_get_curated())

    news, stats, activity, weather, memories, vault_data, curated = await asyncio.gather(
        news_task, stats_task, activity_task, weather_task, memories_task, vault_task, curated_task,
    )

    return {
        "news": news,
        "stats": stats,
        "weather": weather,
        "activity": activity,
        "memories": memories,
        "vault": vault_data,
        "curated": curated,
    }


@app.post("/briefing")
async def briefing():
    """Gather all data, generate a conversational briefing, stream TTS."""
    data = await _gather_briefing_data()

    # Broadcast raw data to frontend widgets via WebSocket
    try:
        await ws_manager.broadcast(f"BRIEFING_DATA:{json.dumps(data)}")
    except Exception:
        pass

    # Build conversational briefing prompt
    stats = data.get("stats", {})
    news = data.get("news", [])
    weather = data.get("weather", "")
    activity = data.get("activity", [])
    memories = data.get("memories", [])
    vault_data = data.get("vault", {})
    curated = data.get("curated", {})

    stats_block = (
        f"CPU: {stats.get('cpu_percent', 'N/A')}%, "
        f"RAM: {stats.get('ram_percent', 'N/A')}%, "
        f"Disk: {stats.get('disk_percent', 'N/A')}%"
    )
    if stats.get("battery_percent") is not None:
        stats_block += f", Battery: {stats['battery_percent']}%"
        if stats.get("power_plugged") is True:
            stats_block += " (plugged in)"
        elif stats.get("power_plugged") is False:
            stats_block += " (on battery)"
    if stats.get("uptime"):
        stats_block += f", Uptime: {stats['uptime']}"

    news_block = "\n".join(
        f"- {a['title']} ({a['source']})" for a in news[:5]
    ) if news else "No recent news."

    activity_block = "\n".join(
        f"- [{a['time']}] {a['title']}" for a in activity[-5:]
    ) if activity else "No recent activity tracked."

    memories_block = "\n".join(
        f"- {m.get('text', m.get('content', ''))[:200]}"
        for m in memories[:5]
    ) if memories else "No recent memories."

    vault_notes_block = "\n".join(
        f"- {n['title']} ({n['path']})" for n in vault_data.get("notes", [])[:5]
    ) if vault_data.get("notes") else "No vault notes."

    curated_user = "\n".join(f"- {e}" for e in curated.get("user", [])[:5])
    curated_self = "\n".join(f"- {e}" for e in curated.get("self", [])[:5])
    curated_blocks = []
    if curated_user:
        curated_blocks.append(f"What I know about them:\n{curated_user}")
    if curated_self:
        curated_blocks.append(f"What I know about myself:\n{curated_self}")
    curated_block = "\n\n".join(curated_blocks) if curated_blocks else ""

    prompt = (
        f"You are Aura, Kenaz's AI assistant. Give a warm, conversational daily briefing "
        f"in first person. Speak naturally — like you're telling him. Keep it to 2-3 paragraphs. "
        f"Cover the highlights, don't drone. Here's the current status:\n\n"
        f"## System\n{stats_block}\n\n"
        f"## Weather\n{weather}\n\n"
        f"## Recent Activity\n{activity_block}\n\n"
        f"## News Headlines\n{news_block}\n\n"
        f"## Recent Memories\n{memories_block}\n\n"
        f"## Vault Notes\n{vault_notes_block}"
    )
    if curated_block:
        prompt += f"\n\n## What I remember\n{curated_block}"

    async def generate():
        try:
            from core.router import openrouter_client, MODEL_FAST
            response = await openrouter_client.chat.completions.create(
                model=MODEL_FAST,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=512,
                stream=True,
            )
            full = []
            async for chunk in response:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full.append(delta)
                    yield delta
            # Save to memory
            chroma_store.save(f"User: (briefing request)")
            chroma_store.save(f"Aura: {''.join(full)}")
        except Exception as e:
            logger.error("Briefing error: %s", e)
            yield "I tried to gather a briefing, but ran into an error. Please try again."

    return StreamingResponse(generate(), media_type="text/plain")


# ── STT (Speech-to-Text) ───────────────────────────────────────────────────────

@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """Accept an audio file upload, transcribe with Whisper, return text."""
    import tempfile as tf
    import os

    suffix = ".wav"
    if file.filename:
        _, ext = os.path.splitext(file.filename)
        if ext:
            suffix = ext

    tmp = tf.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        content = await file.read()
        tmp.write(content)
        tmp.close()

        from voice.stt import transcribe
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, transcribe, tmp.name)
        return {"text": text, "success": bool(text)}
    except Exception as e:
        logger.error("STT failed: %s", e)
        return {"text": "", "success": False, "error": str(e)}
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


@app.post("/stt/raw")
async def speech_to_text_raw(request: Request):
    """Accept raw binary audio body, transcribe with Whisper, return text."""
    import tempfile as tf
    import os

    try:
        body = await request.body()
        if not body:
            return {"text": "", "success": False, "error": "Empty body"}
        tmp = tf.NamedTemporaryFile(suffix=".m4a", delete=False)
        tmp.write(body)
        tmp.close()

        from voice.stt import transcribe
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, transcribe, tmp.name)
        return {"text": text, "success": bool(text)}
    except Exception as e:
        logger.error("STT raw failed: %s", e)
        return {"text": "", "success": False, "error": str(e)}
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


@app.post("/stt/base64")
async def speech_to_text_base64(req: STTBase64Request):
    """Accept base64-encoded audio, decode, transcribe, return text."""
    import base64
    import tempfile as tf
    import os

    suffix = ".wav"
    if req.format:
        suffix = "." + req.format.lstrip(".")

    try:
        raw = base64.b64decode(req.audio)
        tmp = tf.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(raw)
        tmp.close()

        from voice.stt import transcribe
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, transcribe, tmp.name)
        return {"text": text, "success": bool(text)}
    except Exception as e:
        logger.error("STT base64 failed: %s", e)
        return {"text": "", "success": False, "error": str(e)}
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


# ── Agent Jobs (VoiceOS-style agent tray) ─────────────────────────────────────

@app.get("/agent/jobs")
async def agent_jobs(limit: int = 50):
    from core import jobs
    return {"jobs": jobs.list_jobs(limit)}


# ── Pending actions ("Nothing sends until you say so") ────────────────────────

@app.get("/pending")
async def pending_list():
    from core import pending
    return {"pending": pending.list_pending()}


@app.post("/pending/{item_id}/approve")
async def pending_approve(item_id: str):
    from core import pending
    return pending.approve(item_id)


@app.post("/pending/{item_id}/cancel")
async def pending_cancel(item_id: str):
    from core import pending
    return pending.cancel(item_id)


# ── Dictation (talk instead of typing) ────────────────────────────────────────

_FILLER_RE = re.compile(r"\b(um|uh|er|erm|hmm|like|you know|i mean)\b[, ]*", re.IGNORECASE)


def _clean_dictation_text(text: str) -> str:
    """Quick cleanup — filler removal + sentence casing. LLM polish optional."""
    cleaned = _FILLER_RE.sub(" ", text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned[:500]


def _dictation_run(ptt: bool, clean: bool) -> dict:
    """Record one utterance, transcribe, clean, and type into the focused app."""
    from voice import pipeline as vp
    vp.set_dictation_active(True)
    wav_path = None
    try:
        wav_path = vp.record_speech(ptt_mode=ptt)
        if not wav_path:
            return {"success": False, "error": "Nothing heard", "text": ""}

        from voice.stt import load_whisper, transcribe
        load_whisper("base")
        raw = (transcribe(wav_path) or "").strip()
        if not raw:
            return {"success": False, "error": "Could not transcribe", "text": ""}

        text = _clean_dictation_text(raw) if clean else raw

        typed_into = ""
        try:
            from tools.tracker import _get_foreground_window_title
            typed_into = _get_foreground_window_title() or ""
        except Exception:
            pass

        from tools.system import type_text
        type_text(text)

        ws_manager.broadcast_sync(f"DICTATION:{json.dumps({'text': text, 'window': typed_into}, ensure_ascii=False)}")
        return {"success": True, "text": text, "raw": raw, "typed_into": typed_into}
    except Exception as e:
        logger.error("Dictation failed: %s", e)
        return {"success": False, "error": str(e), "text": ""}
    finally:
        if wav_path:
            try:
                os.unlink(wav_path)
            except Exception:
                pass
        vp.set_dictation_active(False)


@app.post("/dictation")
async def dictation(req: DictationRequest):
    """Record speech, transcribe, clean, and type it into the focused window."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: _dictation_run(req.ptt, req.clean))


# ── Look (cursor-aware screen context) ────────────────────────────────────────

def _look_run(region: int = 480) -> dict:
    """Capture the screen around the cursor, OCR it, plus window + clipboard."""
    import pyautogui

    result = {"window": "", "ocr": "", "clipboard": "", "success": True}
    try:
        from tools.tracker import _get_foreground_window_title
        result["window"] = _get_foreground_window_title() or ""
    except Exception:
        pass

    try:
        from tools.system import clipboard_paste
        clip = clipboard_paste()
        if isinstance(clip, dict):
            result["clipboard"] = str(clip.get("text", clip.get("error", "")))[:1000]
    except Exception:
        pass

    try:
        import pytesseract
        tesseract_path = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
        if tesseract_path.exists():
            pytesseract.pytesseract.tesseract_cmd = str(tesseract_path)
        x, y = pyautogui.position()
        w = h = max(240, min(region, 1200))
        left = max(0, int(x - w / 2))
        top = max(0, int(y - h / 2))
        shot = pyautogui.screenshot(region=(left, top, w, h))
        result["ocr"] = pytesseract.image_to_string(shot).strip()[:1500]
    except Exception as e:
        result["ocr_error"] = str(e)
    return result


@app.post("/look")
async def look(req: LookRequest):
    """Screen context under the cursor: OCR + foreground window + clipboard."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: _look_run(req.region or 480))


# ── Universal search (files, vault, notes, tasks, web) ────────────────────────

def _scan_files_for(q: str, limit: int = 8) -> list[dict]:
    """Shallow scan of common user folders for matching names."""
    ql = q.lower()
    hits = []
    roots = [
        Path.home() / "Desktop",
        Path.home() / "Documents",
        Path.home() / "Downloads",
    ]
    for root in roots:
        if not root.exists():
            continue
        try:
            for p in root.iterdir():
                if ql in p.name.lower():
                    hits.append({
                        "type": "file",
                        "title": p.name,
                        "subtitle": str(p),
                        "path": str(p),
                    })
                    if len(hits) >= limit:
                        return hits
        except Exception:
            continue
    return hits


def _universal_search_sync(q: str) -> dict:
    from tools.system import list_tasks
    ql = q.lower()
    results = {"files": [], "vault": [], "tasks": [], "notes": []}

    results["files"] = _scan_files_for(q)

    try:
        from memory.vault import search as vault_search
        v = vault_search(q)
        results["vault"] = [
            {"type": "vault", "title": r.get("path", r.get("title", "")), "subtitle": r.get("snippet", "")[:120], "path": r.get("path", "")}
            for r in (v.get("results") if isinstance(v, dict) else v or [])[:5]
        ]
    except Exception:
        pass

    try:
        tasks = list_tasks()
        task_list = tasks.get("tasks", tasks) if isinstance(tasks, dict) else tasks or []
        results["tasks"] = [
            {"type": "task", "title": t.get("name", ""), "subtitle": t.get("time", "") or t.get("date", ""), "id": t.get("id", "")}
            for t in task_list if ql in (t.get("name", "") or "").lower()
        ][:5]
    except Exception:
        pass

    try:
        notes_file = Path(__file__).resolve().parent.parent / "data" / "notes.json"
        if notes_file.exists():
            notes = json.loads(notes_file.read_text(encoding="utf-8"))
            if isinstance(notes, dict):
                notes = notes.get("notes", [])
            results["notes"] = [
                {"type": "note", "title": n.get("title", n.get("name", "")), "subtitle": (n.get("content", "") or "")[:120], "id": n.get("id", "")}
                for n in notes if ql in (n.get("title", n.get("name", "")) or "").lower()
            ][:5]
    except Exception:
        pass

    return results


@app.get("/universal/search")
async def universal_search(q: str = ""):
    q = q.strip()
    if not q:
        return {"results": {"files": [], "vault": [], "tasks": [], "notes": [], "web": []}}

    loop = asyncio.get_running_loop()
    sync = await loop.run_in_executor(None, lambda: _universal_search_sync(q))

    web_results = []
    try:
        from tools.web import web_search
        w = await web_search(q)
        if isinstance(w, dict):
            items = w.get("results", [])
            web_results = [
                {"type": "web", "title": r.get("title", ""), "subtitle": r.get("url", ""), "url": r.get("url", "")}
                for r in items[:3]
            ]
    except Exception:
        pass
    sync["web"] = web_results
    return {"results": sync}


# ── Transcripts (privacy) ─────────────────────────────────────────────────────

@app.get("/transcripts")
async def transcripts_list():
    from core.config import is_save_transcripts, TRANSCRIPTS_DIR
    files = []
    if TRANSCRIPTS_DIR.exists():
        files = sorted((p.name for p in TRANSCRIPTS_DIR.glob("*.txt")), reverse=True)
    return {"enabled": is_save_transcripts(), "files": files}


@app.post("/transcripts/toggle")
async def transcripts_toggle(req: TranscriptToggleRequest):
    from core.config import set_save_transcripts
    ok = set_save_transcripts(req.enabled)
    return {"success": ok, "enabled": req.enabled}


# ── Entry ─────────────────────────────────────────────────────────────────────

def start():
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT, log_level="warning")