"""Small manual voice comparison; no tools, memory writes, or live chat changes."""

import asyncio
import faulthandler
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from core.persona import AURA_PERSONA_CONVO
from core.router import get_client_and_model

CASES = [
    ("greeting", [], "yo"),
    ("bored", [], "im bored dawg, don't feel like doing anything productive"),
    ("rough_day", [], "im sick rn and everything is annoying me. don't give me a whole list of stuff to do"),
    ("continuity", [
        {"role": "user", "content": "im sick and tired, just want to hang out"},
        {"role": "assistant", "content": "Yeah, we can just hang out. No agenda."},
    ], "just distract me for a bit"),
    ("unknown_memory", [], "what was the name of my first pet?"),
]
PARAPHRASES = [
    ("greeting_paraphrase", [], "hey aura, you there?"),
    ("bored_paraphrase", [], "zero energy for work tonight. entertain me"),
    ("rough_day_paraphrase", [], "ugh, feel awful. please don't start fixing everything"),
    ("continuity_paraphrase", [
        {"role": "user", "content": "im sick and tired, just want to hang out"},
        {"role": "assistant", "content": "Yeah, we can just hang out. No agenda."},
    ], "tell me something stupid"),
    ("unknown_memory_paraphrase", [], "what did I call my first pet again?"),
]
CONTEXT = "\n\n## Saved user facts\n- Kenaz likes Minecraft Bedrock Edition.\n- Kenaz enjoys website development and personal projects.\n"


async def main():
    client, model = get_client_and_model("convo")
    override = next((arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--model=")), None)
    if override:
        model = override
    if client is None:
        raise RuntimeError("No configured conversation provider")
    prompts = {
        "before": Path(__file__).with_name("convo-before.txt").read_text(encoding="utf-8"),
        "after": AURA_PERSONA_CONVO,
    }
    if "--after-only" in sys.argv:
        prompts.pop("before")
    cases = CASES + PARAPHRASES if "--paraphrases" in sys.argv else CASES
    client = client.with_options(max_retries=0, timeout=8.0)
    semaphore = asyncio.Semaphore(4)
    print("Comparing configured model: " + model, flush=True)

    async def sample(version, prompt, case, history, message):
        async with semaphore:
            try:
                response = await asyncio.wait_for(client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": prompt + CONTEXT}, *history,
                              {"role": "user", "content": message}],
                    max_tokens=180,
                    temperature=0.5,
                    timeout=8.0,
                ), timeout=12.0)
                print(case + " / " + version + ": " + str(response.choices[0].message.content), flush=True)
                return {"case": case, "version": version, "reply": response.choices[0].message.content}
            except Exception as exc:
                return {"case": case, "version": version, "error": type(exc).__name__ + ": " + str(exc)[:400]}

    results = await asyncio.gather(*(
        sample(version, prompt, case, history, message)
        for case, history, message in cases
        for version, prompt in prompts.items()
    ))
    report = {"model": model, "synthetic_scenarios": True, "results": results}
    Path(__file__).with_name("comparison.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True, indent=2))
    await client.close()


if __name__ == "__main__":
    faulthandler.dump_traceback_later(45, exit=True)
    asyncio.run(main())
    faulthandler.cancel_dump_traceback_later()
