<div align="center">

# A U R A

### Your computer, more conversational.

**A personal AI assistant that listens, remembers, and helps you get things done.**

Talk naturally. Control your PC. Pick up where you left off.

`VOICE` &nbsp; · &nbsp; `MEMORY` &nbsp; · &nbsp; `TOOLS` &nbsp; · &nbsp; `YOUR DESKTOP`

</div>

---

## Meet Aura

Aura is an evolving Windows-first personal assistant: part conversation partner, part voice interface, and part bridge between an AI model and the tools on your computer. It brings speech, memory, desktop actions, and a local API together in one project.

Ask a question and Aura can respond conversationally. Give it a supported command and it can route that request to a tool. Speak to it through the voice pipeline, or connect through its backend. The goal is an assistant that feels present in your workflow instead of another tab you have to visit.

> **The idea:** make interacting with your computer feel less like operating a machine and more like working with an assistant.

## What Aura can do

🎙️ **Listen and speak** — A voice pipeline connects speech recognition, conversation, and speech synthesis. It supports local and cloud voice components, with configurable providers and voices.

🧠 **Remember context** — Local memory files and a Chroma vector store help bring relevant information back into conversations. Transcript saving can be configured.

⚡ **Handle everyday commands** — Fast paths and tool routing connect requests to supported actions, including opening websites, media controls, volume, and system information.

🔎 **Research and reason** — Different model providers serve conversation, tool execution, and deeper research. Availability depends on your configured API keys.

🖥️ **Connect to your desktop** — A FastAPI backend exposes the assistant to compatible clients. A separate desktop UI can connect to it; it is not included in this repository.

💬 **Meet you on Discord** — An optional bot can connect Aura to Discord when configured and its dependencies are available.

Aura is an active personal project. Features and integrations are evolving, and some depend on Windows, external services, models, or separately installed components.

## How it fits together

```text
  Your voice / a compatible client / Discord
                    │
                    ▼
             ┌─────────────┐
             │    AURA     │
             │  FastAPI +  │
             │   routing   │
             └──────┬──────┘
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   Voice I/O     AI models    PC tools
       │            │            │
       └────────────┼────────────┘
                    ▼
              Local memory
```

Simple requests can take a fast path; others are routed through the assistant and its available tools. Voice and memory run alongside the backend, while configured cloud providers supply model capabilities.

## Get started

**You’ll need:** Windows, Python, a microphone and speakers for voice, and API keys for the services you want to use. Some voice models and dependencies may need additional downloads or system setup.

```powershell
git clone https://github.com/xsqlverx/AURA-V2.git
cd AURA-V2
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env.local
```

Open `.env.local` and add the relevant keys. The current configuration uses **OpenRouter** for conversation, **Groq** for tool execution, and **NVIDIA** for deep research; other integrations have their own settings. See [`.env.example`](.env.example) and [`core/config.py`](core/config.py) for options and defaults. Keep your keys private.

```powershell
python main.py
```

The backend starts on port **8000** by default. `main.py` also attempts to start the voice pipeline and, if configured, the Discord bot. Optional components can be unavailable without preventing every other component from running. The desktop UI is a separate project; the startup message’s port 3000 refers to that client, not a UI served by this repository.

## Explore the project

| Path | What’s inside |
|:--|:--|
| [`main.py`](main.py) | Starts the backend and optional voice and Discord workers |
| [`core/`](core/) | Assistant, routing, fast paths, configuration, and API |
| [`voice/`](voice/) | Speech recognition, audio handling, and text-to-speech |
| [`tools/`](tools/) | Desktop actions and tool registry |
| [`memory/`](memory/) | Local and semantic memory |
| [`comms/`](comms/) | Communication integrations |
| [`tests/`](tests/) | Automated checks for assistant components |
| [`docs/`](docs/) | Design notes, implementation details, and project history |

## A note on privacy and access

Aura stores runtime data locally under `data/` by default, but **local storage does not mean fully offline**: configured model, speech, and other integrations can send data to external providers. Review your provider settings and the code before using sensitive information. The backend binds to `0.0.0.0` by default; review its authentication and network configuration before making it reachable by other devices.

---

<div align="center">

**Built to be useful. Designed to feel personal. Always evolving.**

*This repository contains the desktop assistant backend. Mobile app versions are maintained separately.*

</div>
