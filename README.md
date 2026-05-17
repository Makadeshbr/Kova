# Kova

> An AI coding agent compatible with Claude Code, with atomic git checkpoints, multi-provider support and vision attachments.

Kova is a desktop coding agent built on Electron + React + TypeScript. It speaks the same model as Claude Code, Codex and Cursor — but adds atomic per-iteration git commits, native multi-provider support (Anthropic, OpenAI, Gemini, Grok, DeepSeek, Kimi, OpenRouter, NVIDIA, Ollama, LM Studio), and automatic vision detection per model so you can attach images to any vision-capable model.

## Documentation

- [`KOVA.md`](./KOVA.md) — Product north star. What Kova is and is not.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — How the system works.
- [`CLAUDE.md`](./CLAUDE.md) — Operating rules for AI assistants working on Kova.
- [`ROADMAP.md`](./ROADMAP.md) — Current state, pending work, decisions.

Per-package docs live in each `packages/*/CLAUDE.md` and `apps/electron/CLAUDE.md`.

## Stack

- Monorepo with `pnpm` + `turbo`
- TypeScript libraries built with `tsup`
- Electron app built with `electron-vite`
- Vitest for tests

## Quickstart

```bash
pnpm install
pnpm -r build
pnpm --filter "@kova/electron" dev    # desktop app
pnpm --filter "@kova/cli" dev         # CLI
```

To run all tests:
```bash
pnpm -r test
```

## Providers supported

Anthropic · OpenAI · Google Gemini · xAI Grok · DeepSeek · Moonshot Kimi · OpenRouter · NVIDIA · Ollama · LM Studio · any OpenAI-compatible endpoint.

Vision (image inputs) is detected per model via [`packages/shared/src/model-vision.ts`](./packages/shared/src/model-vision.ts).

## License

See [`LICENSE.txt`](./LICENSE.txt).
