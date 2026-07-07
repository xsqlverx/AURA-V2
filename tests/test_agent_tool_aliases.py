import asyncio
import json
import unittest
from unittest.mock import patch

from core.agent import _run_tool


class AgentToolAliasTests(unittest.TestCase):
    def test_lock_screen_alias_dispatches_to_lock_pc(self):
        with patch("tools.system.lock_pc", return_value={"success": True}) as mocked_lock:
            result = asyncio.run(_run_tool("lock_screen", {}))

        self.assertEqual(json.loads(result), {"success": True})
        mocked_lock.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
