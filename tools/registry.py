"""Tool definitions exposed to the LLM."""

TOOLS = [
    # ── Audio ──────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "set_volume", "description": "Set system volume (0–100).", "parameters": {"type": "object", "properties": {"level": {"type": "integer", "minimum": 0, "maximum": 100}}, "required": ["level"]}}},
    {"type": "function", "function": {"name": "get_volume", "description": "Get current system volume.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "mute_audio", "description": "Mute or unmute system audio.", "parameters": {"type": "object", "properties": {"muted": {"type": "boolean", "description": "True to mute, False to unmute."}}, "required": []}}},
    # ── Media ──────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "play_pause", "description": "Toggle play/pause on current media.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "next_track", "description": "Skip to next track.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "prev_track", "description": "Go to previous track.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    # ── Apps ───────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "launch_app", "description": "Launch an application by name.", "parameters": {"type": "object", "properties": {"app_name": {"type": "string"}}, "required": ["app_name"]}}},
    {"type": "function", "function": {"name": "list_running_processes", "description": "List currently running processes.", "parameters": {"type": "object", "properties": {"filter_pattern": {"type": "string", "description": "Optional name filter."}}, "required": []}}},
    # ── Files ──────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "open_path", "description": "Open a file, folder, or shortcut (downloads, desktop, documents, etc).", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "create_folder", "description": "Create a new folder at the given path.", "parameters": {"type": "object", "properties": {"folder_path": {"type": "string"}}, "required": ["folder_path"]}}},
    {"type": "function", "function": {"name": "list_directory", "description": "List files and folders in a directory.", "parameters": {"type": "object", "properties": {"dir_path": {"type": "string"}}, "required": []}}},
    # ── Web ────────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "web_search", "description": "Search the web for current info, news, facts.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "open_website", "description": "Open a URL or website in the default browser. If the user says 'open X' or 'go to Y', construct the full URL. E.g. 'open youtube' → 'https://youtube.com', 'open youtube recipes' → 'https://www.youtube.com/results?search_query=recipes', 'open google' → 'https://google.com'. Always include the protocol prefix.", "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
    # ── System ─────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "get_system_stats", "description": "Get CPU, RAM, and disk usage.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "shutdown", "description": "Shut down the PC after a delay.", "parameters": {"type": "object", "properties": {"delay_seconds": {"type": "integer", "default": 20}}, "required": []}}},
    {"type": "function", "function": {"name": "restart", "description": "Restart the PC.", "parameters": {"type": "object", "properties": {"delay_seconds": {"type": "integer", "default": 30}}, "required": []}}},
    {"type": "function", "function": {"name": "sleep_pc", "description": "Put the PC to sleep.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "lock_pc", "description": "Lock the Windows session.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "cancel_shutdown", "description": "Cancel a pending shutdown or restart.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    # ── Clipboard ──────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "clipboard_copy", "description": "Copy text to the clipboard.", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "clipboard_paste", "description": "Read current clipboard contents.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    # ── Notes ──────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "write_note", "description": "Write or overwrite a note.", "parameters": {"type": "object", "properties": {"name": {"type": "string"}, "content": {"type": "string"}}, "required": ["name", "content"]}}},
    {"type": "function", "function": {"name": "append_note", "description": "Append text to an existing note.", "parameters": {"type": "object", "properties": {"name": {"type": "string"}, "content": {"type": "string"}}, "required": ["name", "content"]}}},
    {"type": "function", "function": {"name": "read_note", "description": "Read a note by name.", "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}}},
    {"type": "function", "function": {"name": "list_notes", "description": "List all saved notes.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "search_notes", "description": "Search notes by keyword.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    # ── Input ──────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "type_text", "description": "Type text using the keyboard.", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "press_key", "description": "Press a keyboard key (e.g. enter, tab, escape).", "parameters": {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}}},
    {"type": "function", "function": {"name": "execute_hotkey", "description": "Execute a keyboard shortcut like ctrl+c.", "parameters": {"type": "object", "properties": {"keys": {"type": "string", "description": "Keys joined by +, e.g. 'ctrl+c'"}}, "required": ["keys"]}}},
    # ── Communication ──────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "send_whatsapp", "description": "Send a WhatsApp message to a saved contact.", "parameters": {"type": "object", "properties": {"contact": {"type": "string", "description": "Contact name (e.g. mom, dad, etc.) — check your contacts list in the system prompt for valid names."}, "message": {"type": "string"}}, "required": ["contact", "message"]}}},
    # ── Memory ─────────────────────────────────────────────────────────────────
    {"type": "function", "function": {"name": "memory", "description": "Manage what Aura knows about the user or about herself. Use 'list' to see current memories, 'add' to save something new, 'replace' to update an existing memory by providing a unique substring as identifier, and 'remove' to delete a memory by providing a unique substring. Category 'user' stores facts about the user; category 'self' stores Aura's own notes.", "parameters": {"type": "object", "properties": {"action": {"type": "string", "enum": ["add", "replace", "remove", "list"]}, "category": {"type": "string", "enum": ["user", "self"], "description": "'user' for facts about the user, 'self' for Aura's own notes."}, "text": {"type": "string", "description": "The memory text (required for add/replace)."}, "identifier": {"type": "string", "description": "A unique substring to find the entry (required for replace/remove)."}}, "required": ["action"]}}},
]

TOOL_NAMES = {t["function"]["name"] for t in TOOLS}