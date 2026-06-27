"""
AURA Full Test Runner — all tools, features, edge cases.
Run: python test_aura.py
Requirements: AURA server running on localhost:8000
"""

import requests
import time
import json
import sys
from datetime import datetime

BASE = "http://localhost:8000"
RESULTS = []
SKIP_SHUTDOWN = True  # Set False to test shutdown/restart/sleep/lock (DANGEROUS)


def chat(prompt, mode="deep"):
    """Send prompt to AURA and return full response text."""
    try:
        r = requests.post(
            f"{BASE}/chat",
            json={"message": prompt, "history": [], "mode": mode},
            stream=True,
            timeout=30,
        )
        r.raise_for_status()
        chunks = []
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                chunks.append(chunk)
        return "".join(chunks)
    except Exception as e:
        return f"[ERROR] {e}"


def check(name, condition, detail=""):
    """Log test result."""
    status = "PASS" if condition else "FAIL"
    RESULTS.append({"test": name, "status": status, "detail": detail})
    icon = "+" if status == "PASS" else "!"
    print(f"  [{icon}] {status}: {name}" + (f" -- {detail}" if detail else ""))


def section(title):
    """Print section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def health_check():
    """Verify AURA server is running."""
    print("Checking AURA server...")
    try:
        r = requests.get(f"{BASE}/health", timeout=5)
        if r.status_code == 200:
            print("  Server is UP.\n")
            return True
    except Exception:
        pass
    print("  Server is DOWN. Start AURA first.\n")
    return False


# ── Tests ────────────────────────────────────────────────────────────────────

def test_audio():
    section("AUDIO")

    r = chat("What's my volume at?")
    check("get_volume", "volume" in r.lower() or "muted" in r.lower(), r[:80])

    r = chat("Set volume to 25")
    check("set_volume", any(w in r.lower() for w in ["volume", "set", "done", "25"]), r[:80])

    r = chat("Mute my audio")
    check("mute_audio", len(r) > 5, r[:80])

    r = chat("Unmute my audio")
    check("unmute_audio", any(w in r.lower() for w in ["unmute", "off", "done", "restored"]), r[:80])

    r = chat("Set volume to banana")
    check("set_volume_invalid", any(w in r.lower() for w in ["error", "invalid", "can't", "don't", "issue", "banana", "slight", "problem"]), r[:80])


def test_media():
    section("MEDIA")

    r = chat("Pause my music")
    check("play_pause", any(w in r.lower() for w in ["pause", "play", "done", "toggled"]), r[:80])

    r = chat("Next song")
    check("next_track", any(w in r.lower() for w in ["next", "skip", "done", "track"]), r[:80])

    r = chat("Go back to the last song")
    check("prev_track", any(w in r.lower() for w in ["previous", "back", "done", "track"]), r[:80])


def test_apps():
    section("APPS")

    r = chat("Open notepad")
    check("launch_app_notepad", len(r) > 5, r[:80])

    r = chat("Launch calculator")
    check("launch_app_calc", len(r) > 5, r[:80])

    r = chat("What processes are running?")
    check("list_processes", any(w in r.lower() for w in ["process", "running", "pid"]), r[:80])

    r = chat("Show me all chrome processes")
    check("list_processes_filtered", any(w in r.lower() for w in ["chrome", "process", "running"]), r[:80])


def test_files():
    section("FILES")

    r = chat("Open my downloads")
    check("open_downloads", len(r) > 5, r[:80])

    r = chat("Show me my desktop")
    check("open_desktop", any(w in r.lower() for w in ["open", "desktop", "done"]), r[:80])

    r = chat("Create a folder called AURA_TEST at C:\\Users\\kenaz\\Desktop")
    check("create_folder", len(r) > 5, r[:80])

    r = chat("List files in C:\\Users\\kenaz\\Downloads")
    check("list_directory", any(w in r.lower() for w in ["file", "folder", "directory", "download"]), r[:80])


def test_web():
    section("WEB")

    r = chat("Open youtube")
    check("open_website_youtube", any(w in r.lower() for w in ["open", "youtube", "done", "browser"]), r[:80])

    r = chat("Go to google.com")
    check("open_website_google", len(r) > 5, r[:80])

    r = chat("Search for latest AI news", mode="deep")
    check("web_search", any(w in r.lower() for w in ["search", "result", "news", "found", "here"]), r[:80])


def test_system():
    section("SYSTEM")

    r = chat("What are my system stats?")
    check("system_stats", len(r) > 10, r[:80])

    if SKIP_SHUTDOWN:
        print("  [~] SKIPPED: shutdown/restart/sleep/lock (SKIP_SHUTDOWN=True)")
        return

    r = chat("Shut down my PC in 10 seconds")
    check("shutdown", any(w in r.lower() for w in ["shutdown", "shut", "seconds", "cancel"]), r[:80])

    time.sleep(1)

    r = chat("Cancel the shutdown")
    check("cancel_shutdown", any(w in r.lower() for w in ["cancel", "done", "stopped"]), r[:80])

    r = chat("Lock my PC")
    check("lock_pc", any(w in r.lower() for w in ["lock", "done", "session"]), r[:80])


def test_clipboard():
    section("CLIPBOARD")

    r = chat("Copy the text 'hello world' to my clipboard")
    check("clipboard_copy", len(r) > 5, r[:80])

    r = chat("What's on my clipboard?")
    check("clipboard_paste", "hello" in r.lower() or "clipboard" in r.lower() or "hello" in r or "nothing" in r.lower() or "empty" in r.lower() or "there" in r.lower(), r[:80])

    r = chat("Copy 'AURA TEST 123' to clipboard, then tell me what's on my clipboard")
    check("clipboard_roundtrip", "aura" in r.lower() or "test" in r.lower() or "123" in r, r[:80])


def test_vault():
    section("VAULT")

    r = chat("Create a vault note called 'test_note' with content 'hello from AURA'")
    check("vault_create", any(w in r.lower() for w in ["note", "created", "aura", "test_note"]), r[:80])

    r = chat("Read my vault note called 'test_note'")
    check("vault_read", "hello" in r.lower() or "aura" in r.lower(), r[:80])

    r = chat("Search my vault for 'AURA'")
    check("vault_search", any(w in r.lower() for w in ["search", "note", "result", "aura"]), r[:80])

    r = chat("List all my vault notes")
    check("vault_list", any(w in r.lower() for w in ["note", "aura", "test_note"]), r[:80])


def test_input():
    section("INPUT CONTROL")

    r = chat("Type 'hello from AURA' on my screen")
    check("type_text", len(r) > 5, r[:80])

    r = chat("Press the enter key")
    check("press_key", any(w in r.lower() for w in ["press", "key", "done", "enter"]), r[:80])

    r = chat("Press ctrl+shift+s")
    check("execute_hotkey", len(r) > 5, r[:80])


def test_memory():
    section("MEMORY")

    r = chat("Remember that my favorite color is blue")
    check("save_memory", len(r) > 5, r[:80])

    r = chat("What do you remember about me?")
    check("list_memory", len(r) > 10, r[:80])

    r = chat("Search your memory for my preferences")
    check("search_memory", len(r) > 10, r[:80])


def test_z_agent():
    section("Z.AI AGENT MODE")

    r = chat("Make me a to-do list app")
    check("z_agent_basic", any(w in r.lower() for w in ["z.ai", "agent", "browser", "open", "done", "app", "created"]), r[:80])

    r = chat("Build me a personal portfolio website")
    check("z_agent_website", any(w in r.lower() for w in ["z.ai", "agent", "browser", "open", "done", "website", "created", "built", "building", "submitted"]), r[:80])


def test_briefing():
    section("BRIEFING")

    r = chat("Brief me")
    check("briefing", any(w in r.lower() for w in ["brief", "weather", "cpu", "ram", "news", "update"]), r[:80])


def test_conversation():
    section("CONVERSATION (no tools)")

    r = chat("What's the meaning of life?")
    check("conversation_no_tools", len(r) > 10, r[:80])

    r = chat("Tell me a joke")
    check("conversation_joke", len(r) > 10, r[:80])


def test_edge_cases():
    section("EDGE CASES")

    r = chat("yo")
    check("short_message", len(r) > 2, r[:80])

    r = chat("I'm open to suggestions")
    check("ambiguous_keyword", len(r) > 5, r[:80])


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{'#'*60}")
    print(f"  AURA FULL TEST SUITE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  SKIP_SHUTDOWN = {SKIP_SHUTDOWN}")
    print(f"{'#'*60}")

    if not health_check():
        sys.exit(1)

    test_audio()
    test_media()
    test_apps()
    test_files()
    test_web()
    test_system()
    test_clipboard()
    test_vault()
    test_input()
    test_memory()
    test_z_agent()
    test_briefing()
    test_conversation()
    test_edge_cases()

    # Summary
    section("RESULTS SUMMARY")
    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")

    print(f"\n  Total:  {total}")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Rate:   {round(passed/total*100, 1)}%")

    if failed:
        print(f"\n  FAILED TESTS:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"    - {r['test']}: {r['detail']}")

    print(f"\n{'#'*60}")
    print(f"  DONE")
    print(f"{'#'*60}\n")
