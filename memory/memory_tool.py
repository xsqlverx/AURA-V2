"""Tool handler for the LLM-callable memory tool — add/replace/remove/list curated memories."""

import logging

from memory.store import get_store

logger = logging.getLogger(__name__)


def handle_memory_tool(action: str, category: str = "user", text: str = "", identifier: str = "") -> str:
    store = get_store()
    from memory import chroma_store
    logger.info("memory_tool invoked — action=%s category=%s text=%r identifier=%r", action, category, text, identifier)

    if category not in ("user", "self"):
        logger.warning("memory_tool invalid category=%s", category)
        return f"Invalid category '{category}'. Must be 'user' or 'self'."

    match action:
        case "add":
            if not text.strip():
                logger.warning("memory_tool add with empty text")
                return "You must provide 'text' to add a memory."
            result = store.add_entry(category, text)
            logger.info("memory_tool add success — %s", result)
            return result

        case "replace":
            if not text.strip():
                return "You must provide 'text' to replace a memory."
            if not identifier.strip():
                return "You must provide an 'identifier' (unique substring) to find the memory to replace."
            result = store.replace_entry(category, identifier, text)
            logger.info("memory_tool replace — %s", result)
            return result

        case "remove":
            if not identifier.strip():
                return "You must provide an 'identifier' (unique substring) to find the memory to remove."
            result = store.remove_entry(category, identifier)
            logger.info("memory_tool remove — %s", result)
            return result

        case "search":
            if not text.strip():
                logger.warning("memory_tool search with empty text")
                return "You must provide a query in 'text' to search past conversations."
            results = chroma_store.get_relevant(text)
            if not results:
                return "No relevant snippets found in past conversations."
            
            # Format as a list of snippets for the LLM
            snippet_text = "\n\n".join([f"Snippet: {r['text']} (similarity: {r['similarity']})" for r in results])
            logger.info("memory_tool search success — %d results", len(results))
            return f"Found relevant past conversations:\n\n{snippet_text}"

        case "list":
            result = store.list_entries(category)
            logger.info("memory_tool list (%s) — %d entries", category, len(result) if isinstance(result, list) else 0)
            return result

        case "forget":
            logger.info("memory_tool forget — not yet implemented")
            return "The 'forget' action is not yet implemented. Use 'remove' with an identifier for now."

        case _:
            logger.warning("memory_tool unknown action=%s", action)
            return f"Unknown action '{action}'. Must be one of: add, replace, remove, search, list."
