"""
AURA Strict Test Runner — Comprehensive, high-precision verification suite.

Execution Modes:
  1. Direct In-Process (Default / fallback when server is not running):
     Executes agent directly via `core.agent.run` and verifies `core.jobs`.
     Zero setup or background daemon required.
  2. Live HTTP API (When AURA backend is running on http://localhost:8000):
     Tests real streaming endpoints and verifies `/agent/jobs`.

Features:
  - Strict Side-Effect Verification (real system volume, pyperclip clipboard, filesystem, tasks.json).
  - Job & Tool Execution Tracking (verifies exact tool names and success status).
  - Anti-Teenager & Anti-Leakage Guard (flags raw unparsed tags like `<function=...>` or leaked JSON).
  - Negative Tool Testing (guarantees pure conversation queries invoke 0 tools).
"""

import os
import sys
import time
import json
import uuid
import shutil
from pathlib import Path
from datetime import datetime

# Windows UTF-8 stdout configuration
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", write_through=True)

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

import requests
import pyperclip

BASE = "http://localhost:8000"
RESULTS = []
SKIP_SHUTDOWN = True  # Set False to test shutdown/restart/sleep/lock (DANGEROUS)

# Detect if live server is requested explicitly via --live
SERVER_RUNNING = False
if "--live" in sys.argv:
    try:
        _res = requests.get(f"{BASE}/health", timeout=1.5)
        if _res.status_code == 200:
            SERVER_RUNNING = True
    except Exception:
        SERVER_RUNNING = False

# Import in-process modules
from core import agent, jobs
from tools import system
from tools.registry import TOOL_ALIASES

print(f"\n{'#'*68}")
print(f"  AURA STRICT TEST SUITE — HIGH-PRECISION VERIFICATION")
print(f"  Timestamp:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"  Runner Mode:   {'LIVE HTTP API (http://localhost:8000)' if SERVER_RUNNING else 'DIRECT IN-PROCESS (Zero Server Dependency)'}")
print(f"  Skip Shutdown: {SKIP_SHUTDOWN}")
print(f"{'#'*68}\n")


# ── Execution Engine ──────────────────────────────────────────────────────────

def chat(prompt: str, mode: str = "auto") -> tuple[str, dict]:
    """Send prompt to AURA and return (full_response_text, job_record)."""
    if SERVER_RUNNING:
        try:
            r = requests.post(
                f"{BASE}/chat",
                json={"message": prompt, "history": [], "mode": mode},
                stream=True,
                timeout=35,
            )
            r.raise_for_status()
            chunks = []
            for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
                if chunk:
                    chunks.append(chunk)
            resp_text = "".join(chunks)

            # Query latest job from server
            job = {}
            try:
                jr = requests.get(f"{BASE}/agent/jobs?limit=1", timeout=5)
                if jr.status_code == 200:
                    j_list = jr.json().get("jobs", [])
                    if j_list:
                        job = j_list[0]
            except Exception:
                pass
            return resp_text, job
        except Exception as e:
            return f"[ERROR] {e}", {}
    else:
        # In-process direct execution
        import asyncio
        chunks = []

        async def _exec():
            async for chunk in agent.run(prompt, history=[], mode=mode):
                chunks.append(chunk)

        try:
            asyncio.run(_exec())
            resp_text = "".join(chunks)
            recent = jobs.list_jobs(limit=1)
            job = recent[0] if recent else {}
            return resp_text, job
        except Exception as e:
            return f"[ERROR] {e}", {}


# ── Universal Strict Assertion ────────────────────────────────────────────────

def check(
    name: str,
    prompt: str,
    expected_tool: str | None = None,
    side_effect_fn=None,
    text_contains: list[str] | None = None,
    no_tools: bool = False,
    mode: str = "auto",
) -> bool:
    """Execute query and verify tool execution, response integrity, and side-effects."""
    t0 = time.time()
    resp_text, job = chat(prompt, mode=mode)
    elapsed = round(time.time() - t0, 2)

    failures = []

    # 1. Check for crashes / HTTP errors
    if resp_text.startswith("[ERROR]"):
        failures.append(f"Request failed: {resp_text}")

    # 2. Anti-Teenager / Anti-Leakage Guard
    # Check for leaked unparsed XML or raw JSON blocks
    if "<function=" in resp_text or "</function>" in resp_text or "<tool_call>" in resp_text:
        failures.append("Leaked raw tool XML tags in response")
    if '```json\n{"name":' in resp_text:
        failures.append("Leaked raw markdown JSON tool call in response")

    # 3. Tool Job Tracking
    job_tools = job.get("tools", [])
    executed_tools = [t.get("name") for t in job_tools]

    if no_tools:
        if len(job_tools) > 0:
            failures.append(f"Expected 0 tools but invoked: {executed_tools}")
    elif expected_tool:
        # Canonicalize alias if needed
        canon_expected = TOOL_ALIASES.get(expected_tool.lower(), expected_tool)
        matched = False
        for t in job_tools:
            t_canon = TOOL_ALIASES.get(t.get("name", "").lower(), t.get("name", ""))
            if t_canon == canon_expected:
                if t.get("status") == "done":
                    matched = True
                    break
                else:
                    failures.append(f"Tool {t.get('name')} failed: {t.get('detail')}")
        if not matched and not failures:
            failures.append(f"Expected tool '{expected_tool}' not executed. Ran: {executed_tools}")

    # 4. Text Content Checks
    if text_contains:
        resp_lower = resp_text.lower()
        if not any(w.lower() in resp_lower for w in text_contains):
            failures.append(f"Response missing expected keywords {text_contains}")

    # 5. Strict Side-Effect Verification
    side_detail = ""
    if side_effect_fn and not failures:
        try:
            ok, side_detail = side_effect_fn(resp_text, job)
            if not ok:
                failures.append(f"Side-effect check failed: {side_detail}")
        except Exception as e:
            failures.append(f"Side-effect exception: {e}")

    # Result logging
    passed = len(failures) == 0
    status = "PASS" if passed else "FAIL"
    icon = "✓" if passed else "✗"
    detail_msg = side_detail if side_detail else (resp_text[:70].replace("\n", " ") if passed else "; ".join(failures))

    tools_label = f" [tools: {', '.join(executed_tools)}]" if executed_tools else (" [no tools]" if no_tools else "")
    print(f"  [{icon}] {status}: {name} ({elapsed}s){tools_label} -- {detail_msg}")

    RESULTS.append({
        "test": name,
        "status": status,
        "elapsed": elapsed,
        "tools": executed_tools,
        "detail": detail_msg,
        "failures": failures,
    })
    return passed


def section(title: str) -> None:
    print(f"\n{'='*68}")
    print(f"  {title}")
    print(f"{'='*68}")


# ── Test Suites ───────────────────────────────────────────────────────────────

def test_audio():
    section("AUDIO — Tool Accuracy & Real Side-Effects")

    # 1. Get Volume
    check(
        name="get_volume",
        prompt="What's my volume at?",
        expected_tool="get_volume",
        text_contains=["volume", "%", "at", "sitting", "currently"],
    )

    # 2. Set Volume with Real Audio Level Verification
    prev_vol = system.get_volume().get("volume", 50)
    target_vol = 28 if prev_vol != 28 else 32

    def verify_volume(resp, job):
        curr = system.get_volume().get("volume")
        # Allow ±3 margin for Windows master volume steps
        if curr is not None and abs(curr - target_vol) <= 3:
            return True, f"Hardware volume confirmed at {curr}% (target: {target_vol}%)"
        return False, f"Hardware volume is {curr}%, expected {target_vol}%"

    check(
        name="set_volume",
        prompt=f"Set volume to {target_vol}",
        expected_tool="set_volume",
        side_effect_fn=verify_volume,
    )
    # Restore user's previous volume
    system.set_volume(prev_vol)

    # 3. Mute Audio
    check(
        name="mute_audio",
        prompt="Mute my audio",
        expected_tool="mute_audio",
        text_contains=["muted", "silenced", "quiet", "audio", "hushed"],
    )

    # 4. Unmute Audio
    check(
        name="unmute_audio",
        prompt="Unmute my audio",
        expected_tool="mute_audio",
        text_contains=["unmuted", "back", "restored", "on"],
    )

    # 5. Invalid Volume Input Handling (Must not crash)
    check(
        name="set_volume_invalid",
        prompt="Set volume to banana",
        text_contains=["banana", "number", "volume", "0", "100"],
    )


def test_media():
    section("MEDIA — System Playback Controls")

    check(
        name="play_pause",
        prompt="Pause my music",
        expected_tool="play_pause",
    )

    check(
        name="next_track",
        prompt="Next song",
        expected_tool="next_track",
    )

    check(
        name="prev_track",
        prompt="Go back to the last song",
        expected_tool="prev_track",
    )


def test_apps():
    section("APPS — Launcher & Process Tracking")

    check(
        name="launch_app_calc",
        prompt="Launch calculator",
        expected_tool="launch_app",
    )

    check(
        name="list_processes",
        prompt="What processes are running on my PC?",
        expected_tool="list_running_processes",
        text_contains=["process", "running", "exe"],
    )

    check(
        name="list_processes_filtered",
        prompt="Show me all chrome processes",
        expected_tool="list_running_processes",
        text_contains=["chrome", "process", "pid", "running", "none", "not running"],
    )


def test_files():
    section("FILES — Directory Operations & Physical Folder Creation")

    # 1. Directory Listing
    check(
        name="list_directory",
        prompt="List files in C:\\AURA_V2",
        expected_tool="list_directory",
        text_contains=["file", "folder", "main.py", "core", "test"],
    )

    # 2. Physical Folder Creation Verification
    test_dir = ROOT_DIR / "data" / "aura_strict_test_folder"
    if test_dir.exists():
        shutil.rmtree(test_dir, ignore_errors=True)

    def verify_folder_created(resp, job):
        if test_dir.exists() and test_dir.is_dir():
            shutil.rmtree(test_dir, ignore_errors=True)
            return True, f"Directory verified on disk: {test_dir.name}"
        return False, f"Directory was NOT created on disk: {test_dir}"

    check(
        name="create_folder",
        prompt=f"Create a folder called aura_strict_test_folder at {ROOT_DIR / 'data'}",
        expected_tool="create_folder",
        side_effect_fn=verify_folder_created,
    )


def test_web():
    section("WEB — Browsing & Search")

    check(
        name="open_website_google",
        prompt="Go to google.com",
        expected_tool="open_website",
    )

    check(
        name="web_search",
        prompt="Search the web for latest AI breakthrough news",
        expected_tool="web_search",
        mode="deep",
        text_contains=["search", "ai", "news", "breakthrough", "result", "found"],
    )


def test_system():
    section("SYSTEM — Stats & Control")

    check(
        name="system_stats",
        prompt="What are my system stats?",
        expected_tool="get_system_stats",
        text_contains=["cpu", "ram", "%"],
    )

    check(
        name="cancel_shutdown",
        prompt="Cancel any scheduled shutdown",
        expected_tool="cancel_shutdown",
    )

    if SKIP_SHUTDOWN:
        print("  [~] SKIPPED: shutdown/restart/sleep/lock (SKIP_SHUTDOWN=True)")
    else:
        check(
            name="lock_pc",
            prompt="Lock my PC",
            expected_tool="lock_pc",
        )


def test_clipboard():
    section("CLIPBOARD — Bit-Exact Hardware Copy & Paste")

    unique_token = f"AURA_STRICT_VERIFY_{uuid.uuid4().hex[:8]}"

    def verify_clipboard_match(resp, job):
        actual = pyperclip.paste().strip()
        if actual == unique_token:
            return True, f"Hardware clipboard content exactly matches token: {unique_token}"
        return False, f"pyperclip.paste() got {actual!r}, expected {unique_token!r}"

    # 1. Copy unique token
    check(
        name="clipboard_copy",
        prompt=f"Copy '{unique_token}' to my clipboard",
        expected_tool="clipboard_copy",
        side_effect_fn=verify_clipboard_match,
    )

    # 2. Paste token back
    check(
        name="clipboard_paste",
        prompt="What is currently on my clipboard?",
        expected_tool="clipboard_paste",
        text_contains=[unique_token],
    )


def test_tasks():
    section("TASKS / REMINDERS — Calendar & tasks.json Persistence")

    unique_task_name = f"Verify Aura Strict {uuid.uuid4().hex[:6]}"
    tasks_file = ROOT_DIR / "data" / "tasks.json"

    def verify_task_persisted(resp, job):
        if not tasks_file.exists():
            return False, "data/tasks.json does not exist"
        try:
            tasks = json.loads(tasks_file.read_text(encoding="utf-8"))
            found = any(t.get("name") == unique_task_name for t in tasks)
            # Cleanup test task
            cleaned = [t for t in tasks if t.get("name") != unique_task_name]
            tasks_file.write_text(json.dumps(cleaned, indent=2), encoding="utf-8")
            if found:
                return True, f"Task successfully persisted and verified in tasks.json: '{unique_task_name}'"
            return False, f"Task '{unique_task_name}' not found in tasks.json"
        except Exception as e:
            return False, f"Failed reading tasks.json: {e}"

    check(
        name="create_task",
        prompt=f"Add a task called '{unique_task_name}' to my calendar",
        expected_tool="create_task",
        side_effect_fn=verify_task_persisted,
    )

    check(
        name="list_tasks",
        prompt="What tasks are on my calendar?",
        expected_tool="list_tasks",
    )


def test_vault():
    section("VAULT — Obsidian Notes Integration")

    test_note = f"test_note_{uuid.uuid4().hex[:4]}"
    content = "Strict verification note from AURA test suite"

    check(
        name="vault_create",
        prompt=f"Create a vault note called '{test_note}' with content '{content}'",
        expected_tool="vault",
        text_contains=["note", "created", "done", test_note, "vault"],
    )

    check(
        name="vault_read",
        prompt=f"Read my vault note called '{test_note}'",
        expected_tool="vault",
    )

    check(
        name="vault_list",
        prompt="List all my vault notes",
        expected_tool="vault",
    )


def test_memory():
    section("MEMORY — Long-Term Context Store")

    check(
        name="save_memory",
        prompt="Remember that my primary development OS is Windows 11",
        expected_tool="memory",
    )

    check(
        name="search_memory",
        prompt="Search your memory for what operating system I use",
        expected_tool="memory",
    )


def test_conversation():
    section("CONVERSATION — Negative Testing (Guaranteed 0 Tools)")

    check(
        name="conversation_meaning_of_life",
        prompt="What is the meaning of life?",
        no_tools=True,
    )

    check(
        name="conversation_joke",
        prompt="Tell me a joke",
        no_tools=True,
    )

    check(
        name="conversation_ambiguous_keyword",
        prompt="I'm open to suggestions on what movie to watch",
        no_tools=True,
    )

    check(
        name="conversation_short_greeting",
        prompt="yo",
        no_tools=True,
    )


# ── Main Runner ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    t_start = time.time()

    filters = [a for a in sys.argv[1:] if not a.startswith("--")]

    sections = [
        ("audio", test_audio),
        ("media", test_media),
        ("apps", test_apps),
        ("files", test_files),
        ("web", test_web),
        ("system", test_system),
        ("clipboard", test_clipboard),
        ("tasks", test_tasks),
        ("vault", test_vault),
        ("memory", test_memory),
        ("conversation", test_conversation),
    ]

    for s_name, s_fn in sections:
        if not filters or any(f.lower() in s_name for f in filters):
            s_fn()

    # Summary Report
    section("RESULTS SUMMARY")
    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    rate = round(passed / total * 100, 1) if total > 0 else 0.0
    total_time = round(time.time() - t_start, 1)

    print(f"\n  Total Tests:    {total}")
    print(f"  Passed:         {passed}")
    print(f"  Failed:         {failed}")
    print(f"  Success Rate:   {rate}%")
    print(f"  Total Duration: {total_time}s")

    if failed > 0:
        print(f"\n  FAILED TESTS ({failed}):")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"    - {r['test']}: {r['detail']}")
                for f in r.get("failures", []):
                    print(f"        -> {f}")
    else:
        print("\n  [✓] ALL TESTS PASSED STRICT VERIFICATION WITH 100% ACCURACY!")

    print(f"\n{'#'*68}")
    print(f"  DONE")
    print(f"{'#'*68}\n")

    sys.exit(0 if failed == 0 else 1)
