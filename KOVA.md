# Kova Project Instructions

## Product Thesis
Kova is a harness-first coding ADE. It should discover how a project works, assemble a small evidence-based context pack, make limited changes, validate objectively, and explain the result.

## Stack
- Monorepo managed with pnpm workspaces and Turbo.
- TypeScript packages live in `packages/*`.
- Electron application lives in `apps/electron`.
- Tests use Vitest.
- Packages build with tsup or electron-vite.

## Architecture Rules
- Keep core behavior stack-agnostic. Do not hardcode Kova around one language or framework.
- Prefer ProjectProfile, adapters, context packs, memory, harness, and decision layers over model-only guessing.
- Preserve local project architecture. Do not introduce broad refactors unless the task explicitly asks.
- Agent execution must be permission-aware. Plan/review flows must stay read-only.
- Do not read or log secrets. Treat `.env` files as protected unless they are examples.
- Scores and apply decisions must be based on validation evidence, not model confidence.

## Validation Commands
- `pnpm --filter @kova/shared build`
- `pnpm --filter @kova/project test`
- `pnpm --filter @kova/project build`
- `pnpm --filter @kova/adapters test`
- `pnpm --filter @kova/adapters build`
- `pnpm --filter @kova/agent test`
- `pnpm --filter @kova/agent build`
- `pnpm --filter @kova/context test`
- `pnpm --filter @kova/context build`
- `pnpm --filter @kova/orchestrator test`
- `pnpm --filter @kova/orchestrator build`
- `pnpm --filter @kova/electron test`
- `pnpm --filter @kova/electron build`

## Security Rules
- Network access is off by default unless the user approves it.
- Write access should stay inside the workspace.
- Dangerous commands such as destructive deletes, forced git operations, publishing, privilege escalation, and pipe-to-shell installs require blocking or explicit approval.
- Command stdout/stderr should be visible to the user when the agent runs tools.
