# PC Aura personal voice review

Date: 2026-11-06

Casual PC chat used a short generic persona and Llama 3.1 8B. The first
personal-voice rewrite still produced invented personal details in live samples.

## Changes

- `core/persona.py` supplies a shared voice for conversation and tool routes.
  It addresses Kenaz, grounds familiarity in supplied facts, allows casual
  conversation without a task, and gives short tone examples.
- Retrieved conversation snippets are labelled as historical excerpts, including
  previous assistant replies, rather than verified facts about the user.
- The default OpenRouter conversation model is Llama 3.3 70B. `MODEL_FAST`
  still overrides it. Chat temperature is 0.5, matching the comparison.
- The old test requirement to imitate JARVIS was removed.

## Live comparison

The user explicitly approved sending the sample personal context to the
configured provider. The probe used saved-interest fixtures and fictional
messages; it did not run PC actions or write personal memories.

Five scenarios covered greeting, boredom without productivity, a rough day,
continuing a request for distraction, and a missing personal memory. Five
paraphrases checked beyond the exact example wording.

The initial 8B rewrite invented a Minecraft server and a current website
project. The revised 8B prompt improved the tone but still inferred a throat
symptom and sometimes appended generic capability explanations.

The revised prompt on 70B avoided those unsupported personal details in the
ten sampled replies and acknowledged missing memories briefly. This is a
small qualitative check, not a reliability score or proof of long-term
personalization. Some replies still resemble the examples.

Local evidence, when available:

- `.local/personality-review/comparison-first-pass.json`
- `.local/personality-review/comparison-revised-8b.json`
- `.local/personality-review/comparison-revised-70b.json`
- `.local/personality-review/compare_voice.py`

The 70B model has higher per-token prices. See the provider's current
[70B pricing](https://openrouter.ai/meta-llama/llama-3.3-70b-instruct) and
[8B pricing](https://openrouter.ai/meta-llama/llama-3.1-8b-instruct).

## Limits and activation

Validation: 24 existing hands-free/persona regression tests and 9 existing
tool-engine regression tests passed. Changed Python sources parsed successfully.

The comparison supplied the persona, controlled memory fixtures, and sample
history directly to the model. It did not exercise live memory retrieval,
the desktop UI, or spoken delivery. Chat still does not automatically curate
new preferences into lasting memory. The backend needs a restart to load
the new voice and default model.
