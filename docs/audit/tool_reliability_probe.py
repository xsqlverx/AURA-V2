"""Read-only AURA reliability probes. No application imports or real side effects.
Extracts only pure definitions from source and substitutes every used action.
Run from the repository with Python 3.10+: python docs/audit/tool_reliability_probe.py
"""
import ast
import asyncio
import json
import logging
import re
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[2]

def definitions(path, names, scope):
    tree = ast.parse((ROOT / path).read_text(encoding="utf-8-sig"))
    body = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in names]
    assert {n.name for n in body} == set(names)
    exec(compile(ast.Module(body=body, type_ignores=[]), str(ROOT / path), "exec"), scope)

def literal(path, name):
    tree = ast.parse((ROOT / path).read_text(encoding="utf-8-sig"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError(name)

async def run():
    calls = []
    completions = []
    async def fake_search(*args, **kwargs):
        calls.append({"handler": "web_search", "args": list(args), "kwargs": kwargs})
        return {"success": True}
    scope = {
        "json": json, "re": re, "logger": logging.getLogger("isolated-probe"),
        "TOOLS": literal("tools/registry.py", "TOOLS"),
        "system": SimpleNamespace(
            set_volume=lambda level: calls.append({"handler": "set_volume", "level": level}) or {"success": True},
            mute_audio=lambda muted: calls.append({"handler": "mute_audio", "muted": muted}) or {"success": True},
            get_volume=lambda: {"error": "simulated unavailable audio endpoint"},
        ),
        "web": SimpleNamespace(web_search=fake_search),
        "jobs": SimpleNamespace(record_tool=lambda *a: 0, finish_tool=lambda *a: completions.append(list(a))),
    }
    scope["TOOL_NAMES"] = {t["function"]["name"] for t in scope["TOOLS"]}
    definitions("core/agent.py", ["_parse_native_function", "_run_tool", "_tool_human_detail", "_scrub", "_strip_tail_tags", "_scrub_stream"], scope)

    malformed = '<function=set_volume {"level":} </function>'
    parsed = scope["_parse_native_function"](malformed)
    await scope["_run_tool"](parsed[0]["name"], parsed[0]["arguments"])
    print("malformed_json_default_action=" + json.dumps({"parsed_arguments": parsed[0]["arguments"], "effect": calls[-1]}))

    browser_result = json.loads(await scope["_run_tool"]("browser_control", {"action": "get_url"}, "fake-job"))
    print("advertised_browser_dispatch=" + json.dumps({"result": browser_result, "marked_success": completions[-1][2]}))

    error_result = json.loads(await scope["_run_tool"]("get_volume", {}, "fake-job"))
    print("error_result_job_status=" + json.dumps({"result": error_result, "marked_success": completions[-1][2]}))

    await scope["_run_tool"]("web_search", {"query": "example", "mode": "compare", "items": ["A", "B"], "aspect": "cost"})
    print("web_search_argument_forwarding=" + json.dumps(calls[-1]))

    async def chunks():
        for chunk in ['<function=', 'mute_audio {"muted":true}', '<function=mute_audio>']:
            yield chunk
    streamed = "".join([p async for p in scope["_scrub_stream"](chunks())])
    print("split_tag_stream_output=" + json.dumps(streamed))

    launch_calls = []
    launcher = {
        "APP_MAP": literal("tools/system.py", "APP_MAP"),
        "os": SimpleNamespace(startfile=lambda path: launch_calls.append(path)),
        "_resolve_exe": lambda name: None,
        "subprocess": SimpleNamespace(Popen=Mock(), DEVNULL=-3),
        "logger": logging.getLogger("isolated-probe"),
    }
    definitions("tools/system.py", ["launch_app"], launcher)
    launched = launcher["launch_app"]("settings")
    print("uri_launch_result=" + json.dumps({"mocked_actions": launch_calls, "result": launched}))

    router = {"logger": logging.getLogger("isolated-probe"), "_TOOL_KEYWORDS": literal("core/router.py", "_TOOL_KEYWORDS")}
    definitions("core/router.py", ["classify_intent"], router)
    routing = {}
    for prompt in ["turn it down", "skip this song", "could you unpause it", "I have a headache"]:
        routing[prompt] = await router["classify_intent"](prompt)
    print("keyword_routing_examples=" + json.dumps(routing))

    tree = ast.parse((ROOT / "core/agent.py").read_text(encoding="utf-8-sig"))
    run_node = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "_run")
    guard_names = {"_play_verbs", "_msg_l", "_has_verb", "_on_youtube", "_wants_play"}
    guard_body = [n for n in run_node.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in guard_names for t in n.targets)]
    assert len(guard_body) == 5
    guard_code = compile(ast.Module(body=guard_body, type_ignores=[]), str(ROOT / "core/agent.py"), "exec")
    guard_results = {}
    for prompt in ["Do not play anything on YouTube", "How can I display anything in Python?", "Can you explain this YouTube video?"]:
        guard_scope = {"message": prompt, "_re": re}
        exec(guard_code, guard_scope)
        guard_results[prompt] = guard_scope["_wants_play"]
    print("forced_youtube_guard_examples=" + json.dumps(guard_results))

if __name__ == "__main__":
    asyncio.run(run())
