"""WhatsApp messaging via contacts.json."""

import os
import re
import json
import time
import logging
import urllib.parse
from pathlib import Path
import difflib

logger = logging.getLogger(__name__)

# Default to the workspace-level contacts.json unless overridden by CONTACTS_PATH
_default_contacts = Path(__file__).resolve().parents[1] / "contacts.json"
CONTACTS_FILE = Path(os.getenv("CONTACTS_PATH") or _default_contacts)
logger.info("Using contacts file: %s", CONTACTS_FILE)


def load_contacts() -> dict:
    try:
        if CONTACTS_FILE.exists():
            with open(CONTACTS_FILE) as f:
                return {k.lower(): v for k, v in json.load(f).items()}
    except Exception as e:
        logger.error("Failed to load contacts: %s", e)
    return {}


def _normalize_contact(raw: str) -> str:
    """Strip noise from LLM-generated contact names so 'your_mum_s_number' → 'mom'."""
    s = raw.lower().replace("_", " ").replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    # Strip possessive 's
    s = re.sub(r"'s\b", "", s)
    # Strip filler words
    for word in ["number", "phone", "contact", "my", "your", "the", "a", "an", "of", "for"]:
        s = re.sub(rf"\b{word}\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def send_whatsapp(phone_number: str, message: str) -> dict:
    """
    Send a WhatsApp message. phone_number can be a contact name or real number.
    Uses whatsapp:// URI + pyautogui Enter press to send.
    """
    try:
        import pyautogui
    except ImportError:
        return {"error": "pyautogui not installed"}

    try:
        contacts = load_contacts()
        lookup_raw = phone_number
        lookup = _normalize_contact(phone_number)

        # Exact match first
        if lookup in contacts:
            logger.info("Resolved '%s' → %s", lookup, contacts[lookup])
            phone_number = contacts[lookup]
        else:
            # Substring match: either direction
            found = None
            for k in contacts.keys():
                if lookup in k or k in lookup:
                    found = k
                    break

            # Also try normalizing contact keys and matching
            if not found:
                normalized_keys = {k: _normalize_contact(k) for k in contacts}
                for orig, norm in normalized_keys.items():
                    if lookup == norm or lookup in norm or norm in lookup:
                        found = orig
                        break

            # Fuzzy match fallback (on normalized)
            if not found:
                norm_keys = list(set(_normalize_contact(k) for k in contacts))
                matches = difflib.get_close_matches(lookup, norm_keys, n=1, cutoff=0.5)
                if matches:
                    matched_norm = matches[0]
                    for orig, norm in normalized_keys.items():
                        if norm == matched_norm:
                            found = orig
                            break

            if found:
                logger.info("Resolved '%s' → %s (matched key: %s)", lookup_raw, contacts[found], found)
                phone_number = contacts[found]
            else:
                logger.warning("Contact '%s' not in contacts.json", lookup_raw)

        clean = re.sub(r"\D", "", phone_number)
        if len(clean) < 7:
            return {"error": f"Invalid number for '{phone_number}'. Add to contacts.json or use a real number."}

        url = f"whatsapp://send?phone={clean}&text={urllib.parse.quote(message)}"
        os.startfile(url)
        time.sleep(3.5)
        pyautogui.press("enter")
        logger.info("WhatsApp message sent to %s", clean)
        return {"success": True, "sent_to": clean}
    except Exception as e:
        logger.error("send_whatsapp failed: %s", e)
        return {"error": str(e)}