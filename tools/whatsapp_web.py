"""WhatsApp Web messaging via Playwright — dedicated persistent headed browser."""

import asyncio
import json
import logging
import os
import re
import threading
from pathlib import Path

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

# ── Contacts ───────────────────────────────────────────────────────────────────

_default_contacts = Path(__file__).resolve().parents[1] / "contacts.json"
CONTACTS_FILE = Path(os.getenv("CONTACTS_PATH") or _default_contacts)


def load_contacts() -> dict:
    try:
        if CONTACTS_FILE.exists():
            with open(CONTACTS_FILE) as f:
                return {k.lower(): v for k, v in json.load(f).items()}
    except Exception as e:
        logger.error("Failed to load contacts: %s", e)
    return {}


def _normalize_contact(raw: str) -> str:
    s = raw.lower().replace("_", " ").replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"'s\b", "", s)
    for word in ["number", "phone", "contact", "my", "your", "the", "a", "an", "of", "for"]:
        s = re.sub(rf"\b{word}\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _resolve_contact(name_or_number: str) -> str:
    """Resolve a contact name to a phone number. Returns raw value if not found."""
    contacts = load_contacts()
    lookup = _normalize_contact(name_or_number)

    if lookup in contacts:
        return contacts[lookup]

    for k in contacts:
        if lookup in k or k in lookup:
            return contacts[k]

    normalized_keys = {k: _normalize_contact(k) for k in contacts}
    for orig, norm in normalized_keys.items():
        if lookup == norm or lookup in norm or norm in lookup:
            return contacts[orig]

    if normalized_keys:
        import difflib
        norm_list = list(set(normalized_keys.values()))
        matches = difflib.get_close_matches(lookup, norm_list, n=1, cutoff=0.5)
        if matches:
            for orig, norm in normalized_keys.items():
                if norm == matches[0]:
                    return contacts[orig]

    return name_or_number


# ── Dedicated persistent browser for WhatsApp Web ──────────────────────────────

WHATSAPP_DIR = Path.home() / ".aura_browser" / "whatsapp"
_pw = None
_context = None
_page = None
_loop = None
_loop_ready = threading.Event()
_loop_lock = threading.Lock()


def _run_loop():
    global _loop
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)
    _loop_ready.set()
    _loop.run_forever()


def _ensure_loop():
    global _loop
    if _loop is not None and _loop.is_running():
        return
    with _loop_lock:
        if _loop is None or not _loop.is_running():
            t = threading.Thread(target=_run_loop, daemon=True, name="WhatsAppLoop")
            t.start()
            _loop_ready.wait(timeout=5)


def _run(coro, timeout: int = 90):
    _ensure_loop()
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=timeout)


async def _teardown():
    global _pw, _context, _page
    for obj in (_page, _context):
        if obj is not None:
            try:
                await obj.close()
            except Exception:
                pass
    if _pw:
        try:
            await _pw.stop()
        except Exception:
            pass
    _page = None
    _context = None
    _pw = None


async def _ensure_browser():
    global _pw, _context, _page

    if _context is not None:
        try:
            _ = _context.pages
            return
        except Exception:
            await _teardown()

    WHATSAPP_DIR.mkdir(parents=True, exist_ok=True)
    _pw = await async_playwright().start()
    _context = await _pw.chromium.launch_persistent_context(
        str(WHATSAPP_DIR),
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
    )
    _page = await _context.new_page()


async def _send_message(contact_name: str, message_text: str) -> dict:
    await _ensure_browser()

    await _page.goto("https://web.whatsapp.com", wait_until="domcontentloaded", timeout=30000)

    try:
        await _page.wait_for_selector("#app", timeout=20000)
    except Exception:
        return {"error": "WhatsApp Web failed to load."}

    try:
        await _page.wait_for_selector('[data-testid="chat-list"]', timeout=15000)
    except Exception:
        qr_count = await _page.locator("canvas").count()
        if qr_count > 0:
            return {"error": "WhatsApp Web is not logged in. A browser window is open — scan the QR code with your phone, then try again."}
        return {"error": "WhatsApp Web failed to initialize. A browser window is open — please check it."}

    search = _page.locator('[data-testid="chat-list-search"]')
    if await search.count() == 0:
        search = _page.locator('div[contenteditable="true"]').first
    await search.click()
    await _page.wait_for_timeout(300)
    await search.fill(contact_name)
    await _page.wait_for_timeout(500)

    clicked = False

    title_candidate = _page.locator(f'div[title="{contact_name}"]').first
    if await title_candidate.count() > 0:
        await title_candidate.click()
        clicked = True

    if not clicked:
        cells = _page.locator('[data-testid="cell-frame-container"]')
        for i in range(await cells.count()):
            cell = cells.nth(i)
            text = await cell.inner_text()
            if contact_name.lower() in text.lower():
                await cell.click()
                clicked = True
                break

    if not clicked:
        first = _page.locator('[data-testid="cell-frame-container"]').first
        if await first.count() > 0:
            await first.click()
            clicked = True

    if not clicked:
        return {"error": f"Could not find contact '{contact_name}' on WhatsApp."}

    await _page.wait_for_timeout(1500)

    msg_box = _page.locator('[data-testid="conversation-compose-box-input"]')
    if await msg_box.count() == 0:
        msg_box = _page.locator('[role="textbox"]').last
    if await msg_box.count() == 0:
        msg_box = _page.locator('div[contenteditable="true"]').last

    await msg_box.click()
    await _page.wait_for_timeout(200)
    await msg_box.fill(message_text)
    await _page.wait_for_timeout(300)

    send_btn = _page.locator('[data-testid="send"]')
    if await send_btn.count() > 0:
        await send_btn.click()
    else:
        send_btn = _page.locator('button[aria-label="Send"]')
        if await send_btn.count() > 0:
            await send_btn.click()
        else:
            await _page.keyboard.press("Enter")

    await _page.wait_for_timeout(500)
    logger.info("WhatsApp message sent to %s", contact_name)
    return {"success": True, "sent_to": contact_name}


# ── Public entry point (sync, called from agent.py) ────────────────────────────

def send_whatsapp(contact: str, message: str) -> dict:
    try:
        resolved = _resolve_contact(contact)
        logger.info("Resolved '%s' -> '%s'", contact, resolved)
        return _run(_send_message(resolved, message))
    except Exception as e:
        logger.error("send_whatsapp failed: %s", e)
        return {"error": str(e)}
