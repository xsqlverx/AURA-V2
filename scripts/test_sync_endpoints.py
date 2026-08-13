import asyncio
import sys
import json

sys.path.insert(0, r"C:\AURA_V2")

import httpx
from core import server
from core.config import MOBILE_API_KEY
from memory.store import init_store
from memory import chroma_store

HEADERS = {"Authorization": f"Bearer {MOBILE_API_KEY}"}


async def main():
    init_store()
    chroma_store.init()

    transport = httpx.ASGITransport(app=server.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", headers=HEADERS) as c:
        r = await c.get("/memory/mobile-sync")
        print("GET mobile-sync:", r.status_code)
        data = r.json()
        assert "revision" in data, data
        assert isinstance(data["curated"], list)
        assert isinstance(data["memories"], list)
        print("  revision:", data["revision"][:12], "curated:", len(data["curated"]), "memories:", len(data["memories"]))

        r = await c.post("/memory/mobile-sync", json={
            "curated": [{"text": "User prefers espresso over lattes", "category": "user"}],
            "memories": [{"text": "Phone test memory sync at 13 Aug"}],
        })
        print("POST mobile-sync:", r.status_code, r.json())

        r = await c.get("/memory/mobile-sync")
        data2 = r.json()
        print("  after push -> curated:", len(data2["curated"]), "revision changed:",
              data2["revision"] != data["revision"])
        assert any("espresso" in (e["text"]) for e in data2["curated"])
        print("OK: sync endpoints work")


asyncio.run(main())
