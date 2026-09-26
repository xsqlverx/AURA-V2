# Antigravity New Session Handoff Prompt

> **Instructions for User**: Copy the text inside the code block below and paste it as your first message in your new Antigravity chat.

---

```markdown
Hey Antigravity! We are continuing the development of AURA Mobile V2. 

We have completely pivoted away from React Native / Expo to 100% Native Android (Kotlin + Jetpack Compose) to achieve the deep OS-level integration of Samsung One UI / Bixby (see https://www.youtube.com/watch?v=adAcFscS2JY).

Please read the master handoff specifications and roadmap before doing anything:
1. `c:\AURA_V2\HANDOFF_TO_NATIVE.md`
2. `c:\AURA_V2\mobile_aura_V2\ROADMAP_PHASES.md`

Current Context & Next Steps:
- The React Native app is preserved and committed at `c:\AURA_V2\mobile_aura_V2` (commit `a0845b0`).
- The PC FastAPI backend runs on port 8000 (accessible via Tailscale `http://100.x.y.z:8000`, auth `Authorization: Bearer testkey123`).
- I have generated the initial Kotlin + Jetpack Compose scaffold using Google AI Studio and pushed it to GitHub.
- Here is my GitHub repository link: [PASTE YOUR GITHUB REPO URL HERE]

Please clone/pull this repository, inspect its structure, wire up the Cloud CI/CD build action, and let's begin Phase 1 & Phase 2 implementation!
```
