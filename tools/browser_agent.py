"""Browser automation using Playwright (synchronous singleton)."""

import logging
import threading
import time
from typing import Optional

from playwright.sync_api import sync_playwright, Browser as PW_Browser, Playwright

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_pw: Optional[Playwright] = None
_browser: Optional[PW_Browser] = None

def _ensure_browser(headless: bool = False) -> PW_Browser:
    global _pw, _browser
    if _browser is None:
        with _lock:
            if _browser is None:
                ctx = sync_playwright()
                _pw = ctx.start()
                launch_args = {
                    "headless": headless,
                }
                if not headless:
                    launch_args["args"] = ["--start-maximized"]
                    launch_args["no_viewport"] = True
                _browser = _pw.chromium.launch(**launch_args)
    return _browser

def close_browser():
    global _pw, _browser
    with _lock:
        if _browser:
            try:
                _browser.close()
            except Exception:
                pass
            _browser = None
        if _pw:
            try:
                _pw.stop()
            except Exception:
                pass
            _pw = None


def z_agent_submit(prompt: str, timeout: int = 30) -> dict:
    """Navigate to chat.z.ai, toggle Agent mode, submit prompt. Leaves page open for the user."""
    page = None
    try:
        browser = _ensure_browser(headless=False)
        page = browser.new_page()
        page.goto("https://chat.z.ai", wait_until="load", timeout=timeout * 1000)
        page.wait_for_timeout(3000)

        # Try finding the Agent toggle by text / common selectors
        agent_clicked = False
        for sel in (
            "text=Agent",
            "button:has-text('Agent')",
            "[class*='agent-toggle']",
            "[class*='AgentToggle']",
            "[data-mode='agent']",
            "text=智能体",
            "[class*='agent'] >> visible=true",
        ):
            try:
                el = page.query_selector(sel)
                if el:
                    el.click()
                    agent_clicked = True
                    page.wait_for_timeout(800)
                    break
            except Exception:
                continue

        if not agent_clicked:
            page.mouse.click(110, 250)
            page.wait_for_timeout(800)

        # Find chat input
        input_filled = False
        for sel in (
            "textarea",
            "[contenteditable='true']",
            "[role='textbox']",
            "input[type='text']",
            ".chat-input",
            "#chat-input",
        ):
            try:
                el = page.query_selector(sel)
                if el:
                    el.fill(prompt)
                    input_filled = True
                    break
            except Exception:
                continue

        if not input_filled:
            page.keyboard.type(prompt, delay=15)

        page.keyboard.press("Enter")
        return {"success": True, "submitted": prompt[:80] + "..."}
    except Exception as e:
        logger.error("z_agent_submit failed: %s", e)
        return {"error": str(e)}


def scrape_website(url: str, timeout: int = 15) -> dict:
    """Navigate to a URL and return its visible text content."""
    url = (url or "").strip()
    if not url:
        return {"error": "No URL provided"}
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    page = None
    try:
        browser = _ensure_browser(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=timeout * 1000)
        page.wait_for_timeout(2000)

        title = page.title()
        text = page.inner_text("body") or ""

        lines = [l.strip() for l in text.split("\n") if l.strip()]
        cleaned = "\n".join(lines[:250])

        return {
            "success": True,
            "url": url,
            "title": title,
            "content": cleaned,
            "char_count": len(cleaned),
        }
    except Exception as e:
        logger.error("scrape_website failed: %s", e)
        return {"error": str(e)}
    finally:
        if page:
            try:
                page.close()
            except Exception:
                pass
