/**
 * Browser-safe entry point for @kova/shared.
 *
 * Exports a curated subset of shared utilities that contain NO Node-only
 * imports (`node:fs`, `node:child_process`, `node:path`, etc.). The renderer
 * imports from `@kova/shared/browser-safe` so Vite can statically bundle
 * everything without pulling in the Node-only command runner.
 *
 * The main `@kova/shared` entry (used by all Node-side packages) re-exports
 * these same helpers, so there is still one source of truth.
 *
 * Rule: only add re-exports here from files that import zero Node built-ins.
 */
export * from './model-vision'
export type * from './types'
