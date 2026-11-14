"""Deterministic Command Parser for Aura.

Extracts compound commands and direct typing payloads with zero LLM inference.
Preserves exact punctuation, casing, and conjunctions ("and") within payload text.
Distinguishes between literal typing (deterministic) and drafting/composition (LLM).
"""

from __future__ import annotations

import re
from typing import Optional

# Keywords that indicate creative drafting or composition (MUST route to LLM)
_DRAFT_PATTERNS = [
    r"\b(?:draft|compose)\b",
    r"\b(?:write|send)\s+(?:an?\s+)?(?:email|mail|reply|response|letter|essay|story|code|script|message\s+to)\b",
    r"\b(?:write|draft)\s+(?:me\s+)?(?:a\s+)?(?:poem|summary|post|article|review|note)\b",
    r"\b(?:help\s+me\s+write|help\s+me\s+draft|help\s+me\s+compose)\b",
    r"\b(?:reply\s+to\s+that|reply\s+saying|respond\s+saying)\b",
]

# Flexible prefix matching misheard wake words and conversational filler words
_PREFIX_PATTERN = (
    r"^(?:(?:hey\s+|ok\s+|yo\s+)?(?:aura|ora|or\s+a|or\s+i|aurora|orang|or)\s*[,:\-]?\s*)?"
    r"(?:(?:can\s+you(?:\s+please)?|could\s+you(?:\s+please)?|would\s+you(?:\s+please)?|will\s+you|please|pls|just|now|kindly|go\s+ahead\s+and)\s+)*"
)

# Compound launch-and-type patterns: "open <app> and type <payload>"
_LAUNCH_AND_TYPE_PATTERNS = [
    re.compile(
        _PREFIX_PATTERN
        + r"(?:open|launch|start|run)\s+([a-zA-Z0-9_\-\.]+?)(?:\s*,\s*(?:and\s+)?|\s+and\s+|\s+then\s+|\s+)(?:type(?:\s+out)?|write|insert)\s+(?:sentence\s*:?\s*|text\s*:?\s*)?(.+)$",
        re.IGNORECASE,
    ),
]

# Direct typing patterns: "type <payload>"
_DIRECT_TYPE_PATTERNS = [
    re.compile(
        _PREFIX_PATTERN
        + r"(?:type(?:\s+out)?|write)\s+(?:a\s+sentence\s*:?\s*|the\s+sentence\s*:?\s*|this\s+sentence\s*:?\s*|sentence\s*:?\s*|the\s+following\s*:?\s*|text\s*:?\s*|this\s*:?\s*)?(.+)$",
        re.IGNORECASE,
    ),
]


def is_drafting_intent(text: str) -> bool:
    """Check if the user is asking the LLM to draft, compose, or generate text."""
    lowered = text.strip().lower()
    for pattern in _DRAFT_PATTERNS:
        if re.search(pattern, lowered):
            return True
    return False


def parse_command(raw_text: str) -> Optional[tuple[str, dict]]:
    """Parse text for deterministic desktop commands.

    Returns:
        (tool_name, args_dict) or None if the request requires LLM reasoning/drafting.
    """
    if not raw_text or not raw_text.strip():
        return None

    cleaned = raw_text.strip()

    # If the user is asking to draft or compose, delegate to LLM
    if is_drafting_intent(cleaned):
        return None

    # Check compound: open <app> and type <payload>
    for pat in _LAUNCH_AND_TYPE_PATTERNS:
        m = pat.match(cleaned)
        if m:
            app_raw = m.group(1).strip()
            payload = m.group(2).strip()
            # If payload looks like a drafting instruction ("an email to...") don't direct type
            if is_drafting_intent(payload):
                return None
            if app_raw and payload:
                return ("launch_and_type", {"app_name": app_raw, "text": payload})

    # Check direct typing: type <payload>
    for pat in _DIRECT_TYPE_PATTERNS:
        m = pat.match(cleaned)
        if m:
            payload = m.group(1).strip()
            if is_drafting_intent(payload):
                return None
            if payload:
                return ("type_text", {"text": payload})

    return None
