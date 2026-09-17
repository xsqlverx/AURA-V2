import subprocess
import time
import threading
import sys
import urllib.request
import json
import re

BASE = "http://localhost:8000"
KEY = "testkey123"
APP = "com.aura.mobile"

stop = threading.Event()


def poll_sync():
    last_rev = None
    while not stop.is_set():
        try:
            req = urllib.request.Request(
                f"{BASE}/memory/mobile-sync",
                headers={"Authorization": f"Bearer {KEY}"},
            )
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode())
            rev = data["revision"]
            curated = len(data["curated"])
            memories = len(data["memories"])
            tag = ""
            if last_rev is not None and rev != last_rev:
                tag = "  <<< REVISION CHANGED (phone pushed/pulled)"
            print(f"[sync ] rev={rev[:8]} curated={curated} recent={memories}{tag}")
            last_rev = rev
        except Exception as e:
            print(f"[sync ] ERROR: {e}")
        stop.wait(10)


def watch_logcat():
    try:
        proc = subprocess.Popen(
            ["adb", "logcat", "-v", "time"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace",
            bufsize=1,
        )
    except FileNotFoundError:
        print("[adb  ] adb not found — install platform-tools")
        return
    patterns = {
        "HANDOFF": re.compile(r"handoff_android|executeHandoff|HandoffAction|openApplication|sms:", re.I),
        "RN_ERROR": re.compile(r"ReactNativeJS.*(Error|Exception|Unable|Failed|undefined is not)", re.I),
        "AURA_APP": re.compile(r"com\.aura\.mobile", re.I),
        "SYNC": re.compile(r"memorySync|mobile_brain_sync|mobile-sync", re.I),
    }
    for line in proc.stdout:
        if stop.is_set():
            break
        for label, pat in patterns.items():
            if pat.search(line):
                print(f"[adb:{label}] {line.rstrip()}")
                break


def main():
    print("=" * 60)
    print("AURA DEV MONITOR  (Ctrl+C to stop)")
    print(f"  backend  : {BASE}")
    print(f"  watching : logcat for {APP} + sync endpoint")
    print("=" * 60)
    t1 = threading.Thread(target=poll_sync, daemon=True)
    t2 = threading.Thread(target=watch_logcat, daemon=True)
    t1.start()
    t2.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        stop.set()
        print("\nstopped.")


main()
