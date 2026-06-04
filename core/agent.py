"""Agent loop — receive message, call LLM, run tools if needed, respond."""

import json
import logging
from pathlib import Path
from typing import AsyncIterator

from core.config import MEMORY_NUDGE_INTERVAL
from core.router import get_client_and_model, needs_tools
from memory import chroma_store
from memory.context import get_context_block
from memory.memory_tool import handle_memory_tool
from memory.store import get_store
from tools.registry import TOOLS, TOOL_NAMES
from tools import system, web

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 3
_turns_since_memory = 0


def _scrub(text: str) -> str:
    for tag in ("<memory-context>", "</memory-context>"):
        text = text.replace(tag, "").replace(tag.upper(), "")
    return text

# ── System Prompt ─────────────────────────────────────────────────────────────

AURA_PERSONA = """You are Aura, a local AI assistant and personal companion. \
You are sharp, warm, and direct — never robotic. You run entirely on the user's \
machine, so privacy is guaranteed. You have access to tools for controlling the PC, \
searching the web, and checking system stats. Use tools when they are clearly needed; \
don't mention them otherwise. Keep responses concise unless depth is asked for. \
Always respond in English EVEN IF the user writes,speaks in another language."""


async def _build_system_prompt() -> str:
    context = await get_context_block()
    results = chroma_store.get_relevant(context)
    memories = [r["text"] for r in results]

    parts = [AURA_PERSONA]
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

    global _turns_since_memory
    if _turns_since_memory >= MEMORY_NUDGE_INTERVAL:
        parts.append(
            "\n(Note: Consider using the `memory` tool if you've learned something new about the user.)"
        )

    return "\n".join(parts)


# ── Tool Dispatch ─────────────────────────────────────────────────────────────

async def _run_tool(name: str, args: dict) -> str:
    if name not in TOOL_NAMES:
        return json.dumps({"error": f"Unknown tool: {name}"})
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
            case "get_system_stats":        result = system.get_system_stats()
            case "shutdown":                result = system.shutdown(args.get("delay_seconds", 20))
            case "restart":                 result = system.restart(args.get("delay_seconds", 30))
            case "sleep_pc":                result = system.sleep_pc()
            case "lock_pc":                 result = system.lock_pc()
            case "cancel_shutdown":         result = system.cancel_shutdown()
            case "clipboard_copy":          result = system.clipboard_copy(args.get("text", ""))
            case "clipboard_paste":         result = system.clipboard_paste()
            case "write_note":              result = system.write_note(args.get("name", ""), args.get("content", ""))
            case "append_note":             result = system.append_note(args.get("name", ""), args.get("content", ""))
            case "read_note":               result = system.read_note(args.get("name", ""))
            case "list_notes":              result = system.list_notes()
            case "search_notes":            result = system.search_notes(args.get("query", ""))
            case "type_text":               result = system.type_text(args.get("text", ""))
            case "press_key":               result = system.press_key(args.get("key", ""))
            case "execute_hotkey":
                keys = args.get("keys", "").split("+")
                result = system.execute_hotkey(*keys)
            case "send_whatsapp":
                from tools.comms import send_whatsapp
                contact = args.get("contact") or args.get("phone_number", "")
                result = send_whatsapp(contact, args.get("message", ""))
            case "memory":
                global _turns_since_memory
                _turns_since_memory = 0
                result = handle_memory_tool(
                    action=args.get("action", ""),
                    category=args.get("category", "user"),
                    text=args.get("text", ""),
                    identifier=args.get("identifier", ""),
                )
            case _:
                result = {"error": f"Unhandled tool: {name}"}

        return json.dumps(result)
    except Exception as e:
        logger.error("Tool %s failed: %s", name, e)
        return json.dumps({"error": str(e)})


# ── Agent Loop ────────────────────────────────────────────────────────────────

async def run(
    message: str,
    history: list[dict],
    mode: str = "deep",
) -> AsyncIterator[str]:
    global _turns_since_memory
    _turns_since_memory += 1
    system_prompt = await _build_system_prompt()
    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": message},
    ]

    _likely_needs_tools = needs_tools(message)
    if _likely_needs_tools:
        logger.info("Routing: tool path (Cerebras first)")
    else:
        logger.info("Routing: conversation path (Groq direct)")

    # ── Pure conversation — skip tool loop entirely ───────────────────────────
    if not _likely_needs_tools:
        client, model = get_client_and_model(mode)
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=1024,
        )
        full_response = []
        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                delta = _scrub(delta)
                full_response.append(delta)
                yield delta
        chroma_store.save(f"User: {message}")
        chroma_store.save(f"Aura: {''.join(full_response)}")
        return

    # ── Tool path ─────────────────────────────────────────────────────────────
    tool_rounds = 0

    while tool_rounds < MAX_TOOL_ROUNDS:
        # Use Groq for tool calls, OpenRouter fallback on 429
        try:
            client, model = get_client_and_model("tools")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=1024,
                stream=False,
            )
        except Exception as e:
            if "429" in str(e) or "too_many_requests" in str(e):
                logger.warning("Groq rate limited, falling back to OpenRouter.")
                from core.router import openrouter_client
                from core.config import MODEL_FAST
                client, model = openrouter_client, MODEL_FAST
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    max_tokens=1024,
                    stream=False,
                )
            else:
                raise

        msg = response.choices[0].message

        # ── Tool calls returned — execute them ────────────────────────────────
        if msg.tool_calls:
            messages.append(msg)
            for tc in msg.tool_calls:
                name = tc.function.name
                args = json.loads(tc.function.arguments)
                logger.info("Tool call: %s(%s)", name, args)
                result = await _run_tool(name, args)
                logger.info("Tool result: %s", result)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
            tool_rounds += 1
            continue

        # ── No tool calls — model gave a direct answer ────────────────────────
        # This shouldn't happen often but handle it gracefully
        if msg.content:
            yield _scrub(msg.content)
            chroma_store.save(f"User: {message}")
            chroma_store.save(f"Aura: {msg.content}")
            return

        break

    # ── Stream final response from Groq after tools ran ───────────────────────
    client, model = get_client_and_model(mode)
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        max_tokens=1024,
    )

    full_response = []
    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            delta = _scrub(delta)
            full_response.append(delta)
            yield delta

    chroma_store.save(f"User: {message}")
    chroma_store.save(f"Aura: {''.join(full_response)}")