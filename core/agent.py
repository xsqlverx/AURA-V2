"""Agent loop — classify intent, route to provider, run tools if needed, respond.

Four-provider architecture:
  Classifier:   Gemini 1.5 Flash  → TRUE (tools needed) or FALSE (conversation)
  Conversation: OpenRouter         → no tools, no web
  Tools:        Groq Llama 3.3    → native <function=name> tool execution
  Research:     Mistral Small      → deep summarization after tool loop
"""

import json
import logging
import re
import threading
import uuid
from pathlib import Path
from typing import AsyncIterator

from core.config import MEMORY_AUTOSAVE_INTERVAL, STAGE_CONFIRMATIONS
from core.router import classify_intent, get_client_and_model
from core import jobs, pending
from memory import chroma_store
from memory.context import get_context_block
from memory.memory_tool import handle_memory_tool
from memory.store import get_store
from memory import vault as vault_module
from tools.registry import TOOLS, TOOL_NAMES
from tools import system, web
from tools.browser_agent import scrape_website as scrape_fn
from tools.study import study as study_fn

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 3
_turns_since_memory = 0
_turns_lock = threading.Lock()


def _scrub(text: str) -> str:
    # Strip <memory-context> / </memory-context> (any case)
    for tag in ("<memory-context>", "</memory-context>"):
        text = text.replace(tag, "").replace(tag.upper(), "")
    # Strip <memory ...> and </memory> tags that leak from the LLM
    text = re.sub(r"</?memory[^>]*>", "", text, flags=re.IGNORECASE)
    # Strip <function=toolname>...<function=toolname> or </function> leaks
    text = re.sub(r"</?function[^>]*>", "", text, flags=re.IGNORECASE)
    return text


def _strip_tail_tags(text: str) -> str:
    tag = re.search(r"</?(?:function|memory)\b", text, flags=re.IGNORECASE)
    if tag:
        return text[: tag.start()]
    return text


async def _scrub_stream(chunks):
    """Scrub streaming chunks while holding back partial tags split across chunks."""
    pending = ""
    async for delta in chunks:
        buf = pending + delta
        cleaned = _scrub(buf)
        tag = re.search(r"</?(?:function|memory)\b", cleaned, flags=re.IGNORECASE)
        if tag:
            cut = tag.start()
            pending = cleaned[cut:]
            cleaned = cleaned[:cut]
        else:
            pending = ""
        if cleaned:
            yield cleaned
    tail = _strip_tail_tags(_scrub(pending))
    if tail:
        yield tail


def _log_usage(model: str, stage: str, usage):
    """Log model + token usage for a completed (non-streaming) completion."""
    if usage is None:
        logger.info("[LLM] stage=%s model=%s (no usage info)", stage, model)
        return
    logger.info(
        "[LLM] stage=%s model=%s prompt_tokens=%s completion_tokens=%s total_tokens=%s",
        stage, model,
        getattr(usage, "prompt_tokens", "?"),
        getattr(usage, "completion_tokens", "?"),
        getattr(usage, "total_tokens", "?"),
    )


def _parse_native_function(text: str) -> list[dict]:
    """Parse Llama-style <function=name {...} </function> patterns from text.
    Returns [{"name": str, "arguments": dict, "full_match": str}, ...]."""
    calls = []
    for m in re.finditer(
        r'<function=(\w+)[=>\s]*(\{.*?\})?\s*(?:</function>|<function=\1>)',
        text, re.DOTALL,
    ):
        name = m.group(1)
        raw = m.group(2)
        if raw:
            try:
                args = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Failed to parse native function args for %s: %s", name, raw)
                args = {}
        else:
            args = {}
        calls.append({"name": name, "arguments": args, "full_match": m.group(0)})
    return calls


# ── System Prompts ────────────────────────────────────────────────────────────
# Two personas — TOOLS (Groq with <function=name> format) and CONVO (OpenRouter,
# no tools, no web). The router selects which one to use based on classify_intent().

AURA_PERSONA_TOOLS = """You are Aura, a local AI assistant and personal companion. \
You are sharp, warm, and direct — never robotic. You run entirely on the user's \
machine, so privacy is guaranteed. You have access to tools for controlling the PC, \
searching the web, and checking system stats. Use tools when they are clearly needed; \
don't mention them otherwise. Keep responses concise unless depth is asked for. \
Always respond in English EVEN IF the user writes,speaks in another language.

Be warm, direct, and conversational. Short and natural.

## Memory Behavior
You have a `memory` tool to save important facts long-term. \
Use it PROACTIVELY whenever you learn something worth remembering:
- User preferences ("I like dark mode", "I prefer short answers")
- Personal details (name, job, location, family, hobbies, pets)
- Corrections the user gives you — save them immediately
- Environment facts ("my downloads are in D:\\stuff")
- Conventions or habits the user follows
WHEN the user says "remember", "don't forget", or "keep that in mind": \
you MUST call the memory tool with action="add". This is REQUIRED, not optional. \
Don't confirm in text — just call the tool. \
SKIP temporary/session-specific things (task progress, one-off file paths, ephemera). \
Use category "user" for facts about the user, "self" for your own operational notes. \
Always output function calls as native tags.
Do not describe what you're about to do.
Example: <function=open_website {"url":"https://youtube.com"}<function=open_website>

## Calendar / Reminders
You have `create_task`, `list_tasks`, and `delete_task` tools for managing the \
user's calendar. When the user says "remind me", "set a reminder", "add a task", \
"schedule", or anything about putting an event on the calendar — use \
`create_task`. YOU figure out the date from natural language using today's date \
as reference. Date is required, time is optional.
Examples:
- "remind me Wednesday" → create_task name="Reminder" date="2026-07-15"
- "set a reminder for brunch on the 13th" → create_task name="Brunch" date="2026-07-13"
- "remind me to pay fees on July 13th 2026" → create_task name="Pay fees" date="2026-07-13"
Use `list_tasks` when the user asks "what's on my calendar" or "show my reminders".
Use `delete_task` when they ask to remove one.
DO NOT use the `memory` tool for reminders or calendar events — `memory` is for \
long-term facts about the user, not for scheduling.

## Obsidian Vault
You have a `vault` tool for the user's Obsidian vault.
Use EXACT native format:
<function=vault {"action":"search","query":"paging segmentation"}<function=vault>
<function=vault {"action":"read","title":"DBMS Lecture"}<function=vault>
<function=vault {"action":"list"}<function=vault>
<function=vault {"action":"create","title":"Quicksort","content":"explanation here"}<function=vault>
<function=vault {"action":"append","title":"Quicksort","content":"more info"}<function=vault>
<function=vault {"action":"delete","title":"test_note"}<function=vault>

ACTIONS:
- "search" — search vault notes (keep response SHORT — just confirm what you found)
- "read" — read note content by title
- "list" — list all AURA's notes
- "create" — ONLY create when the user explicitly asks to save/write a note. Do NOT create notes just because the user shares facts about themselves — use the memory tool for that.
- "append" — append content to an existing note
- "delete" — delete an AURA note
- "reindex" — force re-scan

Keep vault responses very short. Do NOT read note contents aloud.
Just say "Found it" / "Created" / "Done" / "Not found" and move on.

## Study Workflows
You have a `study` tool for studying from your vault notes.
When the user asks to quiz, summarize, or draft assignments:
1. Call `<function=study {"topic":"...","action":"quiz"|"summarize"|"draft"}<function=study>`
2. It returns the relevant notes content
3. Generate the output from that content — quiz questions, summary, or draft

Keep study responses focused. For quizzes: give 3-5 questions, then ask if
they want answers. For summaries: 2-3 paragraphs covering key points.

## Z.ai Agent Mode (App Generation)
When the user asks you to MAKE, CREATE, BUILD, or GENERATE an app/website/
project, call open_z_agent IMMEDIATELY. Silently elaborate their vague idea
into a concise directive (what, key features, tech stack), then output
EXACTLY this and nothing else:
<function=open_z_agent {"elaborated_prompt":"concise directive here"}<function=open_z_agent>
No conversation. No plan. Just the tag. SILENT.

## Web Scraping
You have a `scrape_website` tool that opens a URL in a headless browser and
returns the visible text content. Use this when you need to read information
from a live website — docs, articles, product pages, etc. Just output:
<function=scrape_website {"url":"https://example.com/page"}<function=scrape_website>
Then use the returned content to answer the user's question.

## Android (Phone) Actions
Some actions can only run on the user's PHONE, not this PC. When the user
asks for anything phone-only, delegate it with `android_handoff` instead of
pretending to do it:
- Send an SMS/text message → action="send_sms", phone_number, message
- Open an app on their phone → action="open_app", app_package
- Open the phone share sheet → action="share_sheet", text

The phone app executes the action and you reply with a short confirmation
to the user. Do NOT attempt these on the PC. Everything else (Windows control,
files, vault, web, system) stays here on the PC."""

AURA_PERSONA_CONVO = """You are Aura, a local AI assistant and personal companion. \
You are sharp, warm, and direct — never robotic. \
You have NO access to tools, the internet, or any external systems. \
You cannot search the web, control the PC, access files, or run any commands. \
You are purely a conversational partner. \
Keep responses concise unless depth is asked for. \
Always respond in English EVEN IF the user writes or speaks in another language.

Be warm, direct, and conversational. Short and natural.

You may see relevant memories and context about the user below. \
Use this information to make your responses personal and helpful — \
but remember you cannot save new memories or run any tools."""


async def _build_system_prompt(persona: str = AURA_PERSONA_TOOLS) -> str:
    context = await get_context_block()
    results = chroma_store.get_relevant(context)
    memories = [r["text"] for r in results]

    parts = [persona]
    if context:
        parts.append(f"\n## Live Context\n{context}")
    if memories:
        formatted = "\n".join(f"- {m}" for m in memories)
        parts.append(f"\n## What you remember about the user\n{formatted}")

    # Inject WhatsApp contacts so the LLM knows valid names
    contacts_file = Path(__file__).resolve().parents[1] / "contacts.json"
    if contacts_file.exists():
        try:
            with open(contacts_file) as f:
                raw = json.load(f)
            names = list(raw.keys())
            parts.append(
                f"\n## Available WhatsApp contacts\n"
                f"You can send messages to these people: {', '.join(sorted(names))}.\n"
                f"Use the exact name as the 'contact' parameter when calling send_whatsapp."
            )
        except Exception:
            pass

    try:
        curated = get_store().get_system_prompt_block()
        if curated:
            parts.append(f"\n{curated}")
    except Exception:
        pass

    # Only nudge about saving memories if the persona can actually use the memory tool
    if "`memory` tool" in persona:
        global _turns_since_memory
        with _turns_lock:
            if _turns_since_memory >= MEMORY_AUTOSAVE_INTERVAL:
                parts.append(
                    "\n(Note: Consider using the `memory` tool if you've learned something new about the user.)"
                )

    return "\n".join(parts)


async def _build_vault_context(message: str) -> str | None:
    vault_hints = {"note", "study", "lecture", "assignment", "project", "research",
                   "remember", "what is", "what was", "how do", "explain", "my notes"}
    if not any(h in message.lower() for h in vault_hints):
        return None
    results = vault_module.search(message)
    if not results or results.get("count", 0) == 0:
        return None
    snippets = []
    for r in results["results"][:3]:
        snippets.append(f"- [{r['path']}]: {r['snippet'][:200]}")
    return "## Relevant vault notes\n" + "\n".join(snippets)


# ── Tool Dispatch ─────────────────────────────────────────────────────────────

def _tool_human_detail(name: str, args: dict) -> str:
    """Short human-readable label for the island's agent tray."""
    labels = {
        "send_whatsapp": "Message on WhatsApp",
        "web_search": "Searching the web",
        "open_website": "Opening website",
        "play_youtube": "Playing YouTube",
        "scrape_website": "Reading website",
        "get_system_stats": "Checking system stats",
        "launch_app": "Launching app",
        "open_path": "Opening file",
        "create_folder": "Creating folder",
        "list_directory": "Listing files",
        "create_task": "Adding task",
        "list_tasks": "Checking tasks",
        "delete_task": "Removing task",
        "clipboard_copy": "Copying to clipboard",
        "clipboard_paste": "Pasting clipboard",
        "type_text": "Typing text",
        "press_key": "Pressing key",
        "execute_hotkey": "Pressing shortcut",
        "vault": "Working in Obsidian vault",
        "memory": "Updating memory",
        "study": "Studying",
        "set_volume": "Setting volume",
        "get_volume": "Checking volume",
        "mute_audio": "Muting audio",
        "play_pause": "Playing/pausing media",
        "next_track": "Next track",
        "prev_track": "Previous track",
        "shutdown": "Shutting down",
        "restart": "Restarting",
        "sleep_pc": "Sleeping PC",
        "lock_pc": "Locking PC",
        "cancel_shutdown": "Cancelling shutdown",
    }
    return labels.get(name, name.replace("_", " ").capitalize())


async def _run_tool(name: str, args: dict, job_id: str | None = None) -> str:
    if name not in TOOL_NAMES:
        return json.dumps({"error": f"Unknown tool: {name}"})
    idx = -1
    if job_id:
        idx = jobs.record_tool(job_id, name)
    try:
        match name:
            case "set_volume":              result = system.set_volume(args.get("level", 50))
            case "get_volume":              result = system.get_volume()
            case "mute_audio":              result = system.mute_audio(args.get("muted", True))
            case "play_pause":              result = system.play_pause()
            case "next_track":              result = system.next_track()
            case "prev_track":              result = system.prev_track()
            case "launch_app":              result = system.launch_app(args.get("app_name", ""))
            case "list_running_processes":  result = system.list_running_processes(args.get("filter_pattern"))
            case "open_path":               result = system.open_path(args.get("path", ""))
            case "create_folder":           result = system.create_folder(args.get("folder_path", ""))
            case "list_directory":          result = system.list_directory(args.get("dir_path", "."))
            case "web_search":              result = await web.web_search(args.get("query", ""))
            case "open_website":            result = system.open_website(args.get("url", ""))
            case "play_youtube":            result = system.play_youtube(args.get("query", ""))
            case "open_z_agent":            result = system.open_z_agent(args.get("elaborated_prompt", ""))
            case "scrape_website":          result = await scrape_fn(args.get("url", ""))
            case "get_system_stats":        result = system.get_system_stats()
            case "shutdown":                result = system.shutdown(args.get("delay_seconds", 20))
            case "restart":                 result = system.restart(args.get("delay_seconds", 30))
            case "sleep_pc":                result = system.sleep_pc()
            case "lock_pc" | "lock_screen": result = system.lock_pc()
            case "cancel_shutdown":         result = system.cancel_shutdown()
            case "clipboard_copy":          result = system.clipboard_copy(args.get("text", ""))
            case "clipboard_paste":         result = system.clipboard_paste()
            case "vault":
                action = args.get("action", "")
                match action:
                    case "search":   result = vault_module.search(args.get("query", ""))
                    case "read":     result = vault_module.read(args.get("title", ""))
                    case "list":     result = vault_module.list_notes(args.get("folder"))
                    case "create":   result = vault_module.create(args.get("title", ""), args.get("content", ""), args.get("folder"))
                    case "append":   result = vault_module.append(args.get("title", ""), args.get("content", ""))
                    case "delete":   result = vault_module.delete(args.get("title", ""))
                    case "reindex":  result = vault_module.reindex()
                    case _:          result = {"error": f"Unknown vault action: {action}"}
            case "type_text":               result = system.type_text(args.get("text", ""))
            case "press_key":               result = system.press_key(args.get("key", ""))
            case "execute_hotkey":
                keys = args.get("keys", "").split("+")
                result = system.execute_hotkey(*keys)
            case "send_whatsapp":
                from tools.whatsapp_web import send_whatsapp
                contact = args.get("contact") or args.get("phone_number", "")
                message = args.get("message", "")
                if STAGE_CONFIRMATIONS:
                    item = pending.stage(
                        app="WhatsApp",
                        title="Send message",
                        detail=[("To", contact), ("Message", message)],
                        tool="send_whatsapp",
                        payload={"contact": contact, "message": message},
                        confirm=f"Send WhatsApp to {contact}?",
                    )
                    result = {
                        "staged": True,
                        "pending_id": item["id"],
                        "message": f"Message to {contact} is staged and waiting for your approval.",
                    }
                else:
                    result = send_whatsapp(contact, message)
            case "android_handoff":
                result = {
                    "handoff": True,
                    "platform": "android",
                    "action": args.get("action", ""),
                    "phone_number": args.get("phone_number", ""),
                    "message": args.get("message", ""),
                    "app_package": args.get("app_package", ""),
                    "text": args.get("text", ""),
                }
            case "memory":
                global _turns_since_memory
                with _turns_lock:
                    _turns_since_memory = 0
                result = handle_memory_tool(
                    action=args.get("action", ""),
                    category=args.get("category", "user"),
                    text=args.get("text", ""),
                    identifier=args.get("identifier", ""),
                )
            case "study":
                result = study_fn(
                    topic=args.get("topic", ""),
                    action=args.get("action", "quiz"),
                )
            case "create_task":
                result = system.create_task(
                    name=args.get("name", ""),
                    date=args.get("date", ""),
                    time=args.get("time", ""),
                    category=args.get("category", "General"),
                )
            case "list_tasks":
                result = system.list_tasks(date=args.get("date", ""))
            case "delete_task":
                result = system.delete_task(task_id=args.get("task_id", ""))
            case _:
                result = {"error": f"Unhandled tool: {name}"}

        if job_id:
            jobs.finish_tool(job_id, idx, True, _tool_human_detail(name, args))
        return json.dumps(result)
    except Exception as e:
        logger.error("Tool %s failed: %s", name, e)
        if job_id:
            jobs.finish_tool(job_id, idx, False, str(e))
        return json.dumps({"error": str(e)})


# ── Agent Loop ────────────────────────────────────────────────────────────────
# Flow:
#   1. classify_intent(message) via Gemini 1.5 Flash → TRUE / FALSE
#   2. FALSE → OpenRouter + AURA_PERSONA_CONVO (pure conversation, no tools)
#   3. TRUE  → Groq + AURA_PERSONA_TOOLS (tool loop via <function=name>)
#   4. After tool loop → Mistral (deep mode) or OpenRouter (auto mode)

async def run(
    message: str,
    history: list[dict],
    mode: str = "deep",
) -> AsyncIterator[str]:
    """Public entry point — wraps _run with agent-job tracking for the island."""
    job_id = jobs.start_job(message)
    chunks: list[str] = []
    try:
        async for chunk in _run(message, history, mode, job_id):
            chunks.append(chunk)
            yield chunk
        jobs.finish_job(job_id, "done", "".join(chunks)[:500])
    except Exception as e:
        logger.error("Agent run failed: %s", e)
        jobs.finish_job(job_id, "failed", str(e)[:500])
        raise


async def _run(
    message: str,
    history: list[dict],
    mode: str = "deep",
    job_id: str | None = None,
) -> AsyncIterator[str]:
    global _turns_since_memory
    with _turns_lock:
        _turns_since_memory += 1

    # Step 1: Classify intent with Gemini 1.5 Flash
    needs_tools = await classify_intent(message)
    logger.info("Router: classify_intent=%s mode=%s", "TOOLS" if needs_tools else "CONVO", mode)

    # ── YouTube play priority guard ─────────────────────────────────────────────
    # Forces play_youtube whenever the user clearly wants to view video content
    # on YouTube — either with a play verb ("play/watch/listen") or implicit
    # intent ("latest video on youtube about X").
    import re as _re
    _play_verbs = ("play", "watch", "listen", "put on", "put me on", "queue")
    _msg_l = message.lower()
    _has_verb = any(v in _msg_l for v in _play_verbs)
    _on_youtube = "youtube" in _msg_l or "yt" in _msg_l
    _wants_play = bool(
        (_has_verb and _on_youtube)
        or ("youtube" in _msg_l and _re.search(r"\b(video|watch)\b", _msg_l))
    )
    if _wants_play:
        _query = _re.sub(
            r"^(play|watch|listen|show|find|get|give)\s+(me\s+|us\s+)?"
            r"(a\s+|the\s+|this\s+)?(video\s+)?(on\s+youtube\s+)?(about\s+|on\s+|of\s+|for\s+)?",
            "", _msg_l, flags=_re.IGNORECASE
        ).strip()
        _query = _re.sub(
            r"^(the\s+)?(latest|next|best|newest|recent)\s+video\s+on\s+youtube\s+(about|on|of)\s+",
            "", _query, flags=_re.IGNORECASE
        ).strip()
        _query = _re.sub(r"\s+on\s+youtube$", "", _query).strip()
        _query = _re.sub(r"\s+on\s+youtube\s+", " ", _query).strip()
        # If all that's left is filler like "about" alone, nuke it
        _query = _re.sub(r"^(about|on|of|for)\s+", "", _query).strip()
        logger.info("YouTube play guard → forcing play_youtube(query=%r)", _query)
        result = system.play_youtube(_query)
        _summary = f"Playing {_query} on YouTube 🎵" if not result.get("error") else f"Couldn't play that: {result.get('error')}"
        chroma_store.save(f"User: {message}")
        chroma_store.save(f"Aura: {_summary}")
        yield _summary
        return

    vault_ctx = await _build_vault_context(message)

    # ── CONVERSATION PATH (OpenRouter + AURA_PERSONA_CONVO) ──────────────────
    if not needs_tools:
        system_prompt = await _build_system_prompt(AURA_PERSONA_CONVO)
        if vault_ctx:
            system_prompt += "\n\n" + vault_ctx
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": message},
        ]
        client, model = get_client_and_model("convo")
        logger.info("[LLM] stage=convo model=%s stream=True", model)
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=1024,
            timeout=30.0,
        )

        async def deltas():
            async for chunk in stream:
                d = chunk.choices[0].delta.content or ""
                if d:
                    yield d

        full_response = []
        async for piece in _scrub_stream(deltas()):
            full_response.append(piece)
            yield piece
        chroma_store.save(f"User: {message}")
        chroma_store.save(f"Aura: {''.join(full_response)}")
        return

    # ── TOOL PATH (Groq + AURA_PERSONA_TOOLS) ────────────────────────────────
    system_prompt = await _build_system_prompt(AURA_PERSONA_TOOLS)
    if vault_ctx:
        system_prompt += "\n\n" + vault_ctx

    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": message},
    ]

    tool_rounds = 0
    while tool_rounds < MAX_TOOL_ROUNDS:
        try:
            client, model = get_client_and_model("tools")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1024,
                stream=False,
                timeout=30.0,
            )
            _log_usage(model, "tools", getattr(response, "usage", None))
        except Exception as e:
            if "429" in str(e) or "too_many_requests" in str(e):
                logger.warning("Groq rate limited, falling back to OpenRouter.")
                client, model = get_client_and_model("convo")
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=1024,
                    stream=False,
                    timeout=30.0,
                )
                _log_usage(model, "tools(fallback)", getattr(response, "usage", None))
            else:
                raise

        msg = response.choices[0].message

        if msg.content:
            # ── Parse native <function=name> tags ────────────────────────────
            native_calls = _parse_native_function(msg.content)
            if native_calls:
                cleaned = msg.content
                tool_calls = []
                for nc in native_calls:
                    cleaned = cleaned.replace(nc["full_match"], "")
                    tc_id = f"call_{uuid.uuid4().hex[:12]}"
                    tool_calls.append({
                        "id": tc_id,
                        "type": "function",
                        "function": {"name": nc["name"], "arguments": json.dumps(nc["arguments"])},
                    })
                messages.append({"role": "assistant", "content": None, "tool_calls": tool_calls})
                for tc in tool_calls:
                    name = tc["function"]["name"]
                    args = json.loads(tc["function"]["arguments"])
                    logger.info("Native function call: %s(%s)", name, args)
                    result = await _run_tool(name, args, job_id)
                    logger.info("Native function result: %s", result)
                    if name == "android_handoff":
                        # Emit a handoff marker into the stream. The mobile app
                        # intercepts this, executes the Android action locally,
                        # and strips it from the visible text.
                        try:
                            payload = json.loads(result)
                            marker = json.dumps(payload.get("action") and payload, default=str)
                            yield f"<handoff_android>{marker}</handoff_android>"
                        except Exception:
                            pass
                    messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
                tool_rounds += 1
                continue

            # ── Text response from Groq (no more function calls) ─────────────
            cleaned = _scrub(msg.content).strip()
            if cleaned:
                if mode == "deep":
                    # Route through Mistral for deep summarization
                    client, model = get_client_and_model("deep")
                    logger.info("[LLM] stage=deep-summary model=%s stream=True", model)
                    stream = await client.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                        max_tokens=1024,
                        timeout=30.0,
                    )

                    async def deltas():
                        async for chunk in stream:
                            d = chunk.choices[0].delta.content or ""
                            if d:
                                yield d

                    full_response = []
                    async for piece in _scrub_stream(deltas()):
                        full_response.append(piece)
                        yield piece
                    chroma_store.save(f"User: {message}")
                    chroma_store.save(f"Aura: {''.join(full_response)}")
                    return

                yield cleaned
                chroma_store.save(f"User: {message}")
                chroma_store.save(f"Aura: {msg.content}")
                return

        break

    # ── Post-tool-loop: deep summarization or casual response ─────────────────
    if mode == "deep":
        client, model = get_client_and_model("deep")
    else:
        client, model = get_client_and_model("convo")
    logger.info("[LLM] stage=post-tool model=%s stream=True", model)

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        max_tokens=1024,
        timeout=30.0,
    )

    async def deltas():
        async for chunk in stream:
            d = chunk.choices[0].delta.content or ""
            if d:
                yield d

    full_response = []
    async for piece in _scrub_stream(deltas()):
        full_response.append(piece)
        yield piece

    chroma_store.save(f"User: {message}")
    chroma_store.save(f"Aura: {''.join(full_response)}")
