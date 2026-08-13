"""Browser automation — persistent headed session (browser_control) + legacy headless scrape (scrape_website)."""

import asyncio
import logging
import shutil
import threading
from pathlib import Path
from typing import Optional

from playwright.async_api import (
    async_playwright,
    BrowserContext,
    Page,
    Playwright,
    TimeoutError as PlaywrightTimeout,
)

logger = logging.getLogger(__name__)


async def scrape_website(url: str, timeout: int = 15) -> dict:
    url = (url or "").strip()
    if not url:
        return {"error": "No URL provided"}
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                page = await browser.new_page()
                await page.goto(url, wait_until="domcontentloaded", timeout=timeout * 1000)
                title = await page.title()
                text = await page.inner_text("body") or ""
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                cleaned = "\n".join(lines[:250])
                return {
                    "success": True,
                    "url": url,
                    "title": title,
                    "content": cleaned,
                    "char_count": len(cleaned),
                }
            finally:
                await browser.close()
    except Exception as e:
        logger.error("scrape_website failed: %s", e)
        return {"error": str(e)}


# ── Interactive headed browser (async, persistent session) ────────────────────

_loop: Optional[asyncio.AbstractEventLoop] = None
_loop_ready = threading.Event()
_pw: Optional[Playwright] = None
_context: Optional[BrowserContext] = None
_page: Optional[Page] = None
_browser_dead: bool = False


def _normalize_url(url: str) -> str:
    url = url.strip()
    if not url:
        return "about:blank"
    if "://" in url:
        return url
    if "." not in url:
        url = url + ".com"
    return "https://" + url


def _get_aura_profile() -> str:
    """Dedicated AURA automation profile — avoids Chrome profile lock conflicts entirely."""
    d = Path.home() / ".aura_browser" / "profile"
    d.mkdir(parents=True, exist_ok=True)
    return str(d)


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
            t = threading.Thread(target=_run_loop, daemon=True, name="BrowserLoop")
            t.start()
            _loop_ready.wait(timeout=5)


async def _teardown():
    """Clean up page, context, and playwright instance. Resets globals to None."""
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


async def _is_browser_alive() -> bool:
    """Check if the browser context and underlying process are still connected."""
    if _context is None:
        return False
    try:
        _ = _context.pages
        b = _context.browser
        return b is not None and b.is_connected()
    except Exception:
        return False


async def _ensure_browser():
    global _pw, _context, _page, _browser_dead

    if _browser_dead:
        return  # all attempts exhausted — caller will get an error

    # ── Re-launch if browser died between chained actions ────────────────────
    if _context is not None:
        if await _is_browser_alive():
            if _page is None or _page.is_closed():
                _page = await _context.new_page()
            return
        logger.warning("Browser died between actions, re-launching")
        await _teardown()
        # Fall through to fresh launch below

    _pw = await async_playwright().start()
    aura_root = Path.home() / ".aura_browser"

    # Attempt 1: dedicated AURA profile (no Chrome lock conflict)
    profile_path = _get_aura_profile()
    try:
        _context = await _pw.chromium.launch_persistent_context(
            profile_path,
            headless=False,
            args=["--start-maximized", "--disable-blink-features=AutomationControlled"],
        )
        # Smoke test: if new_page() throws, the context is broken
        _page = await _context.new_page()
        logger.info("Browser: Session ready (AURA profile)")
        return
    except Exception as e:
        logger.warning("Browser: AURA profile failed (%s), trying clean fallback", e)
        await _teardown()

    # Attempt 2: fresh fallback directory (clean slate, no stale locks)
    _pw = await async_playwright().start()
    fallback_path = str(aura_root / "fallback")
    shutil.rmtree(fallback_path, ignore_errors=True)
    Path(fallback_path).mkdir(parents=True, exist_ok=True)
    try:
        _context = await _pw.chromium.launch_persistent_context(
            fallback_path,
            headless=False,
            args=["--start-maximized", "--disable-blink-features=AutomationControlled"],
        )
        _page = await _context.new_page()
        logger.info("Browser: Session ready (clean fallback)")
        return
    except Exception as e:
        logger.error("Browser: All launch attempts exhausted: %s", e)
        await _teardown()
        _browser_dead = True


def _run(coro, timeout: int = 30):
    _ensure_loop()
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=timeout)


# ── Actions ────────────────────────────────────────────────────────────────────

async def _goto(url: str) -> dict:
    await _ensure_browser()
    url = _normalize_url(url)
    try:
        await _page.goto(url, wait_until="domcontentloaded", timeout=30000)
        return {"success": True, "url": _page.url}
    except PlaywrightTimeout:
        return {"success": True, "url": _page.url, "warning": "Page load timed out"}
    except Exception as e:
        return {"error": f"Navigation failed: {e}"}


async def _click(selector: str = None, text: str = None) -> dict:
    await _ensure_browser()
    try:
        if text:
            loc = _page.get_by_text(text, exact=False).first
            await loc.wait_for(timeout=8000)
            await loc.click()
            return {"success": True, "action": f"clicked text: '{text}'"}
        if selector:
            await _page.wait_for_selector(selector, timeout=8000)
            await _page.click(selector)
            return {"success": True, "action": f"clicked selector: {selector}"}
        return {"error": "Provide 'selector' or 'text'"}
    except PlaywrightTimeout:
        return {"error": "Element not found (timeout)"}
    except Exception as e:
        return {"error": f"Click failed: {e}"}


async def _smart_click(description: str) -> dict:
    await _ensure_browser()
    for role in ("button", "link", "searchbox", "textbox", "menuitem", "tab"):
        try:
            loc = _page.get_by_role(role, name=description)
            if await loc.count() > 0:
                await loc.first.click(timeout=5000)
                return {"success": True, "action": f"clicked ({role}): '{description}'"}
        except Exception:
            continue
    for attempt in (
        lambda: _page.get_by_text(description, exact=False).first.click(timeout=5000),
        lambda: _page.get_by_placeholder(description).first.click(timeout=5000),
        lambda: _page.locator(
            f'[alt*="{description}" i],[title*="{description}" i],'
            f'[aria-label*="{description}" i]'
        ).first.click(timeout=5000),
    ):
        try:
            await attempt()
            return {"success": True, "action": f"clicked: '{description}'"}
        except Exception:
            continue
    return {"error": f"Could not find element: '{description}'"}


async def _type_text(selector: str, text: str, clear_first: bool = True) -> dict:
    await _ensure_browser()
    try:
        el = _page.locator(selector).first
        await el.wait_for(timeout=8000)
        await el.fill(text)
        return {"success": True, "action": f"typed into {selector}"}
    except PlaywrightTimeout:
        return {"error": f"Input not found: {selector}"}
    except Exception as e:
        return {"error": f"Type failed: {e}"}


async def _smart_type(description: str, text: str) -> dict:
    await _ensure_browser()
    for method, loc in (
        ("placeholder", _page.get_by_placeholder(description, exact=False)),
        ("label", _page.get_by_label(description, exact=False)),
        ("role", _page.get_by_role("textbox", name=description)),
        ("searchbox", _page.get_by_role("searchbox")),
    ):
        try:
            el = loc.first
            if await el.count() == 0:
                continue
            await el.fill(text)
            return {"success": True, "action": f"typed into ({method}): '{description}'"}
        except Exception:
            continue
    return {"error": f"Could not find input: '{description}'"}


async def _scroll(direction: str = "down", amount: int = 500) -> dict:
    await _ensure_browser()
    try:
        y = amount if direction == "down" else -amount
        await _page.mouse.wheel(0, y)
        return {"success": True, "action": f"scrolled {direction} {amount}px"}
    except Exception as e:
        return {"error": f"Scroll failed: {e}"}


async def _get_text() -> dict:
    await _ensure_browser()
    try:
        text = await _page.inner_text("body")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        content = "\n".join(lines[:250])
        return {
            "success": True,
            "url": _page.url,
            "title": await _page.title(),
            "content": content,
            "char_count": len(content),
        }
    except Exception as e:
        return {"error": f"Get text failed: {e}"}


async def _get_url() -> dict:
    await _ensure_browser()
    return {"success": True, "url": _page.url}


async def _back() -> dict:
    await _ensure_browser()
    try:
        await _page.go_back(timeout=15000)
        return {"success": True, "url": _page.url}
    except Exception as e:
        return {"error": f"Back failed: {e}"}


async def _forward() -> dict:
    await _ensure_browser()
    try:
        await _page.go_forward(timeout=15000)
        return {"success": True, "url": _page.url}
    except Exception as e:
        return {"error": f"Forward failed: {e}"}


async def _reload() -> dict:
    await _ensure_browser()
    try:
        await _page.reload(timeout=15000)
        return {"success": True, "url": _page.url}
    except Exception as e:
        return {"error": f"Reload failed: {e}"}


async def _search(query: str, engine: str = "google") -> dict:
    engines = {
        "google": "https://www.google.com/search?q=",
        "bing": "https://www.bing.com/search?q=",
        "duckduckgo": "https://duckduckgo.com/?q=",
        "yandex": "https://yandex.com/search/?text=",
    }
    base = engines.get(engine.lower(), engines["google"])
    search_url = base + query.replace(" ", "+")
    return await _goto(search_url)


async def _new_tab(url: str = "") -> dict:
    await _ensure_browser()
    global _page
    try:
        new_page = await _context.new_page()
        _page = new_page
        if url:
            return await _goto(url)
        return {"success": True, "action": "new tab opened"}
    except Exception as e:
        return {"error": f"New tab failed: {e}"}


async def _close_tab() -> dict:
    global _page
    if _page is None or _page.is_closed():
        return {"error": "No active tab"}
    try:
        await _page.close()
        pages = _context.pages
        _page = pages[-1] if pages else None
        return {"success": True, "action": "tab closed"}
    except Exception as e:
        return {"error": f"Close tab failed: {e}"}


async def _press(key: str) -> dict:
    await _ensure_browser()
    try:
        await _page.keyboard.press(key)
        return {"success": True, "action": f"pressed: {key}"}
    except Exception as e:
        return {"error": f"Key press failed: {e}"}


async def _close_browser() -> dict:
    global _browser_dead
    await _teardown()
    _browser_dead = False
    logger.info("Browser: Closed")
    return {"success": True, "action": "browser closed"}


# ── Public entry point ─────────────────────────────────────────────────────────

_ACTION_MAP = {
    "goto": _goto,
    "click": _click,
    "smart_click": _smart_click,
    "type": _type_text,
    "smart_type": _smart_type,
    "scroll": _scroll,
    "get_text": _get_text,
    "get_url": _get_url,
    "back": _back,
    "forward": _forward,
    "reload": _reload,
    "search": _search,
    "new_tab": _new_tab,
    "close_tab": _close_tab,
    "press": _press,
    "close": _close_browser,
}


def browser_control(action: str = "goto", **kwargs) -> dict:
    if _browser_dead:
        return {"error": "Browser unavailable after persistent launch failure. Use web_search or scrape_website instead."}
    coro = _ACTION_MAP.get(action)
    if coro is None:
        return {"error": f"Unknown browser action: '{action}'. Available: {', '.join(_ACTION_MAP)}"}
    try:
        return _run(coro(**kwargs))
    except Exception as e:
        logger.error("browser_control(%s) failed: %s", action, e)
        return {"error": str(e)}


# ── Z.ai Agent mode (GLM) ──────────────────────────────────────────────────────

async def _z_agent_submit(prompt: str) -> dict:
    """Open chat.z.ai in Agent mode and submit a directive for GLM to build."""
    await _ensure_browser()
    try:
        await _page.goto("https://chat.z.ai/", wait_until="domcontentloaded", timeout=30000)
        await _page.wait_for_timeout(1500)

        input_found = False
        for loc in (
            _page.get_by_placeholder("Message"),
            _page.get_by_placeholder("Ask anything"),
            _page.get_by_role("textbox"),
            _page.locator("textarea"),
        ):
            try:
                el = loc.first
                if await el.count() == 0:
                    continue
                await el.click(timeout=5000)
                await el.fill(prompt)
                input_found = True
                break
            except Exception:
                continue
        if not input_found:
            return {"error": "Could not find the chat.z.ai input box."}

        await _page.keyboard.press("Enter")
        await _page.wait_for_timeout(2500)
        return {
            "success": True,
            "action": f"submitted directive to GLM Agent: '{prompt[:80]}...'",
            "url": _page.url,
        }
    except Exception as e:
        return {"error": f"Z.ai agent submit failed: {e}"}


def z_agent_submit(prompt: str) -> dict:
    if _browser_dead:
        return {"error": "Browser unavailable after persistent launch failure. Use web_search or scrape_website instead."}
    try:
        return _run(_z_agent_submit(prompt))
    except Exception as e:
        logger.error("z_agent_submit failed: %s", e)
        return {"error": str(e)}
