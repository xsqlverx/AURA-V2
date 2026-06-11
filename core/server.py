"""FastAPI app, lifespan, routes, WebSocket manager, and socket bridge."""

import asyncio
import json
import logging
import os
import socket
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.config import SERVER_HOST, SERVER_PORT, UI_SOCKET_PORT
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

    _start_socket_bridge()

    # Start window tracker daemon for briefing activity data
    from tools import tracker
    tracker.start()

    yield
    logger.info("Aura backend shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Aura Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    mode: str = "deep"

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


class NoteCreate(BaseModel):
    title: str
    content: str = ""

class NoteUpdate(BaseModel):
    title: str = ""
    content: str = ""


class VoiceSelectRequest(BaseModel):
    voice: str


_FRIENDS_PATH = Path(__file__).parent.parent / "data" / "friends.json"
_NOTES_PATH = Path(__file__).parent.parent / "data" / "notes.json"


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


@app.get("/weather")
async def weather():
    """Return current weather data (cached from wttr.in)."""
    from memory.context import get_weather_data
    return await get_weather_data()


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
                notes = data.get("notes", [])
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

                notes_block = "\n".join(
                    f"- {n['title']}: {n['content'][:200]}" for n in notes[:3]
                ) if notes else "No saved notes."

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
                    f"## Notes\n{notes_block}"
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


# ── System Stats ───────────────────────────────────────────────────────────────

@app.get("/system-stats")
async def system_stats():
    from tools.system import get_system_stats
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, get_system_stats)
    return result


# ── Notes CRUD (JSON backend) ─────────────────────────────────────────────────

def _load_notes() -> list[dict]:
    if _NOTES_PATH.exists():
        try:
            with open(_NOTES_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return []

def _save_notes(notes: list[dict]) -> None:
    _NOTES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_NOTES_PATH, "w") as f:
        json.dump(notes, f, indent=2)

@app.get("/notes")
async def get_notes():
    return _load_notes()

@app.post("/notes")
async def create_note(req: NoteCreate):
    notes = _load_notes()
    from datetime import datetime
    now = datetime.now().isoformat()
    note = {
        "id": str(len(notes) + 1),
        "title": req.title,
        "content": req.content,
        "created_at": now,
        "updated_at": now,
    }
    notes.append(note)
    _save_notes(notes)
    return note

@app.put("/notes/{note_id}")
async def update_note(note_id: str, req: NoteUpdate):
    notes = _load_notes()
    for note in notes:
        if note["id"] == note_id:
            if req.title:
                note["title"] = req.title
            if req.content:
                note["content"] = req.content
            from datetime import datetime
            note["updated_at"] = datetime.now().isoformat()
            _save_notes(notes)
            return note
    return {"error": "note not found"}

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    notes = _load_notes()
    notes = [n for n in notes if n["id"] != note_id]
    _save_notes(notes)
    return {"success": True}


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

    async def _get_notes():
        return _load_notes()

    async def _get_curated():
        store = get_store()
        return {
            "user": list(store.user_entries),
            "self": list(store.memory_entries),
        }

    news_task = asyncio.create_task(get_news_headlines(5))
    stats_task = asyncio.create_task(_get_stats())
    activity_task = asyncio.create_task(_get_activity())
    weather_task = asyncio.create_task(get_context_block())
    memories_task = asyncio.create_task(_get_memories())
    notes_task = asyncio.create_task(_get_notes())
    curated_task = asyncio.create_task(_get_curated())

    news, stats, activity, weather, memories, notes, curated = await asyncio.gather(
        news_task, stats_task, activity_task, weather_task, memories_task, notes_task, curated_task,
    )

    return {
        "news": news,
        "stats": stats,
        "weather": weather,
        "activity": activity,
        "memories": memories,
        "notes": notes,
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
    notes = data.get("notes", [])
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

    notes_block = "\n".join(
        f"- {n['title']}: {n['content'][:200]}" for n in notes[:3]
    ) if notes else "No saved notes."

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
        f"## Notes\n{notes_block}"
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


# ── Entry ─────────────────────────────────────────────────────────────────────

def start():
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT, log_level="warning")