#!/usr/bin/env python3
"""Test fast-path pattern matching without running the full agent."""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from core.fastpath import try_fastpath


async def test_fastpath():
    """Test various messages against fast-path patterns."""
    
    test_cases = [
        # Apps
        ("open chrome", "launch_app", "Should match: open app"),
        ("launch vscode", "launch_app", "Should match: launch app"),
        
        # URLs & Web
        ("open youtube", "open_website", "Should match: open website"),
        ("go to github.com", "open_website", "Should match: go to URL"),
        ("open youtube recipes", "open_website", "Should match: open with search"),
        ("visit amazon", "open_website", "Should match: visit site"),
        
        # YouTube
        ("play the weeknd", "play_youtube", "Should match: play on YouTube"),
        ("watch tutorial videos", "play_youtube", "Should match: watch video"),
        
        # Search
        ("search for python", "web_search", "Should match: search query"),
        ("google python decorators", "web_search", "Should match: google query"),
        
        # Files
        ("create folder my-project", "create_folder", "Should match: create folder"),
        ("create file notes.txt", "create_folder", "Should match: create file"),
        
        # Media
        ("play", "play_pause", "Should match: play"),
        ("pause", "play_pause", "Should match: pause"),
        ("next", "next_track", "Should match: next track"),
        ("previous", "prev_track", "Should match: previous track"),
        
        # Audio
        ("mute", "mute_audio", "Should match: mute"),
        ("set volume 50", "set_volume", "Should match: set volume"),
        ("volume 75%", "set_volume", "Should match: volume percentage"),
        
        # System
        ("lock", "lock_pc", "Should match: lock PC"),
        ("sleep", "sleep_pc", "Should match: sleep PC"),
        ("system stats", "get_system_stats", "Should match: system info"),
        
        # Clipboard
        ("copy hello world", "clipboard_copy", "Should match: copy text"),
        
        # Casual speech patterns (NEW!)
        ("can you open youtube", "open_website", "Should match: casual speech prefix"),
        ("can you open chrome", "launch_app", "Should match: can you open app"),
        ("could you open github", "open_website", "Should match: could you open"),
        ("orang can you open youtube", "open_website", "Should match: name + casual prefix"),
        ("hey can you play despacito", "play_youtube", "Should match: hey + casual"),
        ("please open spotify", "launch_app", "Should match: please open app"),
        ("pls open settings", "launch_app", "Should match: pls open"),
        ("aura open amazon", "open_website", "Should match: aura name prefix"),
        
        # Complex (should NOT match)
        ("open chrome and search for python", None, "Should NOT match: multi-action"),
        ("what's the best browser", None, "Should NOT match: question"),
        ("can you help me find something", None, "Should NOT match: complex request"),
    ]
    
    print("=" * 80)
    print("FAST-PATH PATTERN MATCHING TEST")
    print("=" * 80)
    
    passed = 0
    failed = 0
    
    for message, expected_tool, reason in test_cases:
        match = await try_fastpath(message)
        
        if match:
            tool_name, args = match
            status = "[OK] MATCH" if tool_name == expected_tool else "[FAIL] WRONG"
            if tool_name == expected_tool:
                passed += 1
            else:
                failed += 1
            print(f"\n{status}: '{message}'")
            print(f"  Expected: {expected_tool}")
            print(f"  Got:      {tool_name}")
            print(f"  Args:     {args}")
        else:
            status = "[OK] NO MATCH" if expected_tool is None else "[FAIL] MISS"
            if expected_tool is None:
                passed += 1
            else:
                failed += 1
            print(f"\n{status}: '{message}'")
            print(f"  Expected: {expected_tool}")
            print(f"  Got:      None")
        
        print(f"  Reason:   {reason}")
    
    print("\n" + "=" * 80)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 80)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(test_fastpath())
    sys.exit(0 if success else 1)
