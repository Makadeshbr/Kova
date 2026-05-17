/**
 * Renderer-side vision capability check. Re-exports the canonical helper from
 * `@kova/shared/browser-safe` — a curated entry point that excludes Node-only
 * modules. The provider layer (Node-side, in @kova/agent) consumes the same
 * function via the main `@kova/shared` entry. Single source of truth.
 */
export { detectVisionSupport } from '@kova/shared/browser-safe'
