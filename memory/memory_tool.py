"""Tool handler for the LLM-callable memory tool — add/replace/remove/list curated memories."""

import logging

from memory.store import get_store

logger = logging.getLogger(__name__)


def handle_memory_tool(action: str, category: str = "user", text: str = "", identifier: str = "") -> str:
    store = get_store()
    if category not in ("user", "self"):
        return f"Invalid category '{category}'. Must be 'user' or 'self'."

    match action:
        case "add":
            if not text.strip():
                return "You must provide 'text' to add a memory."
            return store.add_entry(category, text)

        case "replace":
            if not text.strip():
                return "You must provide 'text' to replace a memory."
            if not identifier.strip():
                return "You must provide an 'identifier' (unique substring) to find the memory to replace."
            return store.replace_entry(category, identifier, text)

        case "remove":
            if not identifier.strip():
                return "You must provide an 'identifier' (unique substring) to find the memory to remove."
            return store.remove_entry(category, identifier)

        case "list":
            return store.list_entries(category)

        case _:
            return f"Unknown action '{action}'. Must be one of: add, replace, remove, list."
