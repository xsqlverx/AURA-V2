"""
Discord bot — runs as a daemon thread.
Supports two modes:
  single — Kenaz manually says "reply to that" for each message
  auto   — bot handles the full convo autonomously, notifies Kenaz if important
"""

import asyncio
import json
import logging
import re
import socket
import threading
import time

import discord
import requests

from comms import state as comms_state
from core.config import DISCORD_BOT_TOKEN, UI_SOCKET_PORT, SERVER_URL

logger = logging.getLogger(__name__)

# ── Bot setup ─────────────────────────────────────────────────────────────────
intents = discord.Intents.default()
intents.message_content = True
intents.dm_messages = True

_client = discord.Client(intents=intents)
_loop: asyncio.AbstractEventLoop | None = None
_tts = None

AUTO_TIMEOUT_SECS = 300   # 5 minutes of silence ends auto-convo

OPENER = (
    "Hey! Kenaz is busy right now. "
    "I'm Aura, his AI assistant — can I help you with something?"
)


# ── Socket helper — notify UI ─────────────────────────────────────────────────

def _notify_ui(sender: str, message: str) -> None:
    payload = json.dumps({"author": sender, "text": message})
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect(("127.0.0.1", UI_SOCKET_PORT))
            s.sendall(f"DISCORD:{payload}".encode())
    except Exception:
        pass


def _broadcast_session_state() -> None:
    session = comms_state.get_session()
    if session:
        payload = json.dumps({
            "active": True,
            "userId": session["user_id"],
            "username": session["username"],
            "mode": session["mode"],
        })
    else:
        payload = json.dumps({"active": False})
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect(("127.0.0.1", UI_SOCKET_PORT))
            s.sendall(f"DISCORD_SESSION:{payload}".encode())
    except Exception:
        pass


# ── Agent call (sync, runs in bot thread) ─────────────────────────────────────

def _call_agent(prompt: str) -> str:
    """POST to /chat and return the full response text."""
    try:
        resp = requests.post(
            f"{SERVER_URL}/chat",
            json={"message": prompt, "history": [], "mode": "fast"},
            stream=True,
            timeout=60,
        )
        resp.raise_for_status()
        return "".join(
            chunk for chunk in resp.iter_content(chunk_size=None, decode_unicode=True)
            if chunk
        )
    except Exception as e:
        logger.error("Agent call failed: %s", e)
        return ""


# ── Importance classifier ─────────────────────────────────────────────────────

def _is_important(sender: str, message: str) -> bool:
    """Ask the LLM if this message needs Kenaz's personal attention."""
    prompt = (
        f"You are a message classifier. Someone named {sender} sent this message: \"{message}\". "
        f"Does this message require the recipient's personal attention? "
        f"Examples of important: urgent requests, emotional distress, time-sensitive info, personal questions only the recipient can answer. "
        f"Examples of not important: casual chat, jokes, memes, generic questions an AI can handle. "
        f"Reply with ONLY the word YES or NO."
    )
    result = _call_agent(prompt).strip().upper()
    return result.startswith("YES")


# ── Auto-reply ────────────────────────────────────────────────────────────────

def _generate_reply(sender: str, message: str, summary: list) -> str:
    history_text = "\n".join(
        f"{s}: {m}" for s, m in summary[-10:]  # last 10 exchanges for context
    ) if summary else "No prior conversation."

    prompt = (
        f"You are Aura, an AI assistant managing a Discord conversation on behalf of Kenaz who is busy. "
        f"You are talking to {sender}. "
        f"Conversation so far:\n{history_text}\n"
        f"Their latest message: \"{message}\"\n"
        f"Reply naturally and concisely. Never pretend to be Kenaz. "
        f"If asked where Kenaz is, say he is busy but will be available soon."
    )
    return _call_agent(prompt).strip()


# ── Public sync API ───────────────────────────────────────────────────────────

def activate(user_id: str) -> None:
    if _loop is None:
        logger.warning("Discord: bot not ready.")
        return

    async def _do():
        try:
            user = await _client.fetch_user(int(user_id))
            dm = await user.create_dm()
            await dm.send(OPENER)
            comms_state.set_session(user_id, user.display_name, mode="single")
            comms_state.append_summary("Aura", OPENER)
            logger.info("Discord: activated for %s (%s)", user.display_name, user_id)
            _notify_ui("Aura", OPENER)
            _broadcast_session_state()
        except Exception as e:
            logger.error("Discord: activate failed: %s", e)

    asyncio.run_coroutine_threadsafe(_do(), _loop)


def send_reply(text: str) -> None:
    """Send a reply to the active session user. Called from voice pipeline."""
    session = comms_state.get_session()
    if not session or _loop is None:
        return

    async def _do():
        try:
            user = await _client.fetch_user(int(session["user_id"]))
            dm = await user.create_dm()
            await dm.send(f"*(Aura — Kenaz's AI assistant)*\n{text}")
            comms_state.append_summary("Aura", text)
            logger.info("Discord: reply sent to %s", session["username"])
            _notify_ui("Aura", text)
        except Exception as e:
            logger.error("Discord: send_reply failed: %s", e)

    asyncio.run_coroutine_threadsafe(_do(), _loop)


def set_mode(mode: str) -> None:
    """Switch current session to single or auto mode."""
    if mode not in ("single", "auto"):
        return
    comms_state.set_mode(mode)
    logger.info("Discord: switched to %s mode.", mode.upper())
    _broadcast_session_state()
    if _tts:
        session = comms_state.get_session()
        if session:
            msg = (
                f"Switched to single-reply mode for {session['username']}."
                if mode == "single"
                else f"Auto-convo mode active. I'll handle {session['username']} and notify you if needed."
            )
            _tts.speak(msg)


def _end_session(skip_tts: bool = False) -> None:
    """End the session. Optionally skip TTS (for API calls)."""
    summary = comms_state.get_summary()
    comms_state.clear_session()
    _broadcast_session_state()
    logger.info("Discord: session ended.")

    if skip_tts or not summary:
        if not skip_tts and _tts:
            _tts.speak("Discord session ended. No messages to summarise.")
        return

    # Build summary via agent
    history_text = "\n".join(f"{s}: {m}" for s, m in summary)
    prompt = (
        f"Summarise this Discord conversation in 2-3 sentences for Kenaz. "
        f"Highlight anything important or actionable:\n{history_text}"
    )
    summary_text = _call_agent(prompt)
    if _tts and summary_text:
        _tts.speak(f"Session summary: {summary_text}")
    logger.info("Discord summary: %s", summary_text)


def end_session_with_summary() -> None:
    _end_session(skip_tts=False)


def end_session_silent() -> None:
    _end_session(skip_tts=True)


# ── Timeout watcher ───────────────────────────────────────────────────────────

def _start_timeout_watcher():
    def _watch():
        while True:
            time.sleep(30)
            session = comms_state.get_session()
            if not session:
                continue
            if session.get("mode") != "auto":
                continue
            elapsed = time.time() - comms_state.get_last_activity()
            if elapsed >= AUTO_TIMEOUT_SECS:
                logger.info("Discord: auto-convo timed out after %.0fs of silence.", elapsed)
                if _tts:
                    _tts.speak(f"Auto-convo with {session['username']} ended due to inactivity.")
                end_session_with_summary()

    t = threading.Thread(target=_watch, daemon=True)
    t.start()


# ── Events ────────────────────────────────────────────────────────────────────

@_client.event
async def on_ready():
    logger.info("Discord bot online as %s", _client.user)
    _start_timeout_watcher()


@_client.event
async def on_message(message: discord.Message):
    logger.info("RAW MESSAGE — author: %s | type: %s | content: %s",
                message.author, type(message.channel).__name__, message.content)

    if message.author == _client.user:
        return
    if not isinstance(message.channel, discord.DMChannel):
        return

    session = comms_state.get_session()
    if not session or message.author.id != int(session["user_id"]):
        return

    content = message.content.strip()
    if not content:
        return

    sender = message.author.display_name
    logger.info("Discord: %s said: %s", sender, content)

    comms_state.set_last_message(content)
    comms_state.append_summary(sender, content)
    _notify_ui(sender, content)

    mode = comms_state.get_mode()

    if mode == "single":
        # Just notify via TTS — Kenaz replies manually
        if _tts:
            preview = content[:70] + ("..." if len(content) > 70 else "")
            _tts.speak(f"{sender} says: {preview}")

    elif mode == "auto":
        # Classify importance first
        important = await asyncio.get_event_loop().run_in_executor(
            None, _is_important, sender, content
        )
        if important:
            logger.info("Discord: important message flagged.")
            if _tts:
                _tts.speak(
                    f"Kenaz, {sender} sent something that might need your attention: {content[:60]}"
                )

        # Generate and send reply automatically
        summary = comms_state.get_summary()
        reply = await asyncio.get_event_loop().run_in_executor(
            None, _generate_reply, sender, content, summary
        )

        if reply:
            try:
                await message.channel.send(f"*(Aura — Kenaz's AI assistant)*\n{reply}")
                comms_state.append_summary("Aura", reply)
                _notify_ui("Aura", reply)
                logger.info("Discord: auto-reply sent to %s", sender)
            except Exception as e:
                logger.error("Discord: auto-reply failed: %s", e)


# ── Entry point ───────────────────────────────────────────────────────────────

def run(tts) -> None:
    global _loop, _tts
    _tts = tts

    if not DISCORD_BOT_TOKEN:
        logger.warning("Discord bot disabled — DISCORD_BOT_TOKEN not set in .env.local")
        return

    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)

    try:
        _loop.run_until_complete(_client.start(DISCORD_BOT_TOKEN))
    except Exception as e:
        logger.error("Discord bot crashed: %s", e)