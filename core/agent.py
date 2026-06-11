"""Agent loop — receive message, call LLM, run tools if needed, respond."""

import json
import logging
import re
from pathlib import Path
from typing import AsyncIterator

from core.config import MEMORY_AUTOSAVE_INTERVAL
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
    # Strip <memory-context> / </memory-context> (any case)
    for tag in ("<memory-context>", "</memory-context>"):
        text = text.replace(tag, "").replace(tag.upper(), "")
    # Strip <memory ...> and </memory> tags that leak from the LLM
    text = re.sub(r"</?memory[^>]*>", "", text, flags=re.IGNORECASE)
    # Strip <function=toolname>...<function=toolname> or </function> leaks
    text = re.sub(r"</?function[^>]*>", "", text, flags=re.IGNORECASE)
    return text


def _parse_native_function(text: str) -> list[dict]:
    """Parse Llama-style <function=name {...} </function> patterns from text.
    Returns [{"name": str, "arguments": dict, "full_match": str}, ...]."""
    calls = []
    # Handles: <function=name>JSON<function=name>, <function=name JSON </function>,
    #          <function=name={JSON}</function> (any separator: >, space, or =)
    for m in re.finditer(r'<function=(\w+)[=>\s]+(\{.*?\})\s*(?:</function>|<function=\1>)', text, re.DOTALL):
        name = m.group(1)
        raw = m.group(2)
        try:
            args = json.loads(raw)
            calls.append({"name": name, "arguments": args, "full_match": m.group(0)})
        except json.JSONDecodeError:
            logger.warning("Failed to parse native function args for %s: %s", name, raw)
    return calls

# ── System Prompt ─────────────────────────────────────────────────────────────

AURA_PERSONA = """You are Aura, a local AI assistant and personal companion. \
You are sharp, warm, and direct — never robotic. You run entirely on the user's \
machine, so privacy is guaranteed. You have access to tools for controlling the PC, \
searching the web, and checking system stats. Use tools when they are clearly needed; \
don't mention them otherwise. Keep responses concise unless depth is asked for. \
Always respond in English EVEN IF the user writes,speaks in another language.

## Voice Tone
You have a natural, expressive voice with inline expression tags for
vocal emotion. Use them naturally mid-speech when appropriate:
- `<laugh>` — chuckle or laugh at something funny
- `<sigh>` — sigh in relief, frustration, or thoughtfulness
- `<breath>` — take a breath (pause, anticipation)
- `<cry>` — emotional or moved
- `<whisper>` — quiet, secretive, or intimate
- `<shout>` — excited or urgent
- `<sing>` — sing-song or playful
- `<hum>` — thoughtful or amused
- `<cough>` — awkward or hesitant

Examples:
  "I totally forgot about that <laugh> what was I thinking?"
  "Oh <sigh> I guess we'll have to start over."
  "<whisper> Don't tell anyone I told you this.</whisper>"

Don't overuse them — one or two per response max. Vary your tone through
word choice too. Be warm, direct, and conversational. Short and natural.

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
CRITICAL RULE: Never write tool calls as text or XML. \
Use the function calling API ONLY. No `<memory>` tags, no `<search>` tags, \
no describing tool calls in your response text. Just call the function."""


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
    if _turns_since_memory >= MEMORY_AUTOSAVE_INTERVAL:
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
            case "open_z_agent":            result = system.open_z_agent(args.get("elaborated_prompt", ""))
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
        # Use Groq for tool calls, OpenRouter fallback on 429.
        # NOTE: tools=TOOLS deliberately omitted — Llama 3.3 on Groq uses native
        # <function=name> format in text; sending tools= causes tool_use_failed errors.
        # Native function calls are parsed server-side by _parse_native_function().
        try:
            client, model = get_client_and_model("tools")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
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
        # Check for Llama-native <function=name> format first
        if msg.content:
            native_calls = _parse_native_function(msg.content)
            if native_calls:
                cleaned = msg.content
                tool_calls = []
                import uuid
                for nc in native_calls:
                    cleaned = cleaned.replace(nc["full_match"], "")
                    tc_id = f"call_{uuid.uuid4().hex[:12]}"
                    tool_calls.append({
                        "id": tc_id,
                        "type": "function",
                        "function": {"name": nc["name"], "arguments": json.dumps(nc["arguments"])},
                    })
                cleaned = cleaned.strip()
                fake_msg = {"role": "assistant", "content": None, "tool_calls": tool_calls}
                messages.append(fake_msg)
                for tc in tool_calls:
                    name = tc["function"]["name"]
                    args = json.loads(tc["function"]["arguments"])
                    logger.info("Native function call: %s(%s)", name, args)
                    result = await _run_tool(name, args)
                    logger.info("Native function result: %s", result)
                    messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
                tool_rounds += 1
                continue

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