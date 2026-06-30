# Velo

An open-source AI meeting notetaker that is local-first, privacy-first, and yours to fork.

## Download

→ [github.com/BryanParreira/Velo/releases/latest](https://github.com/BryanParreira/Velo/releases/latest)

## What it does

Open it and join a meeting. Velo records, transcribes locally, and saves your notes as markdown on disk. Bring your own LLM: OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, or anything OpenAI-compatible.

## Why use it

- **Your data, your disk.** Every meeting is a `.md` file you can inspect, search, and sync through Dropbox, iCloud, Syncthing, or git. No cloud backend means no cloud lock-in.
- **Local transcription.** Transcription runs on-device, so audio never leaves your machine.
- **Bring your own AI.** Use any LLM provider, including OpenAI-compatible services and local models.
- **Open source, MIT.** Fork it, sell it, or self-host it.
- **No accounts or tracking.** There is no hosted account model.

## Build from source

```bash
# Prerequisites: Rust, Node.js, pnpm
pnpm install
pnpm -F @hypr/desktop tauri:dev
```

---

**License:** MIT · **Maintainer:** [BryanParreira](https://github.com/BryanParreira)
