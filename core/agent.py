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
from memory import vault as vault_module
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
    #          <function=name={JSON}</function>, <function=name<function=name> (no args)
    for m in re.finditer(r'<function=(\w+)[=>\s]*(\{.*?\})?\s*(?:</function>|<function=\1>)', text, re.DOTALL):
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

# ── System Prompt ─────────────────────────────────────────────────────────────

AURA_PERSONA = """You are Aura, a local AI assistant and personal companion. \
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
- "create" — create a new note (title + content, written to AURA/ folder)
- "append" — append content to an existing note
- "delete" — delete an AURA note
- "reindex" — force re-scan

Keep vault responses very short. Do NOT read note contents aloud.
Just say "Found it" / "Created" / "Done" / "Not found" and move on.

## Z.ai Agent Mode (App Generation)
When the user asks you to MAKE, CREATE, BUILD, or GENERATE an app/website/
project, call open_z_agent IMMEDIATELY. Silently elaborate their vague idea
into a concise directive (what, key features, tech stack), then output
EXACTLY this and nothing else:
<function=open_z_agent {"elaborated_prompt":"concise directive here"}<function=open_z_agent>
No conversation. No plan. Just the tag. SILENT."""


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


async def _build_vault_context(message: str) -> str | None:
    """If the user message seems to reference vault-worthy topics, inject relevant snippets."""
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
    vault_ctx = await _build_vault_context(message)
    if vault_ctx:
        system_prompt += "\n\n" + vault_ctx
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

            cleaned = _scrub(msg.content).strip()
            if cleaned:
                yield cleaned
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