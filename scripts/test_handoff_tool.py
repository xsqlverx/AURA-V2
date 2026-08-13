import asyncio
import json
import sys

from core import agent


async def main():
    r = await agent._run_tool(
        "android_handoff",
        {"action": "send_sms", "phone_number": "+123456789", "message": "hello"},
        "test-job",
    )
    print("HANDOFF RESULT:", r)
    payload = json.loads(r)
    assert payload["handoff"] is True
    assert payload["action"] == "send_sms"
    assert payload["phone_number"] == "+123456789"
    print("OK: _run_tool dispatch + payload correct")


asyncio.run(main())
