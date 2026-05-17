/**
 * Vision (image-input) capability detection by model ID.
 *
 * Lives in @kova/shared so the renderer can use it without pulling in
 * @kova/agent (which transitively depends on the Anthropic SDK and other
 * Node-only modules Vite cannot bundle for the browser).
 *
 * This is the SINGLE SOURCE OF TRUTH for vision capability. The provider
 * layer (`@kova/agent`) re-uses these patterns when reporting capabilities;
 * the renderer reads it directly to gate the "+" attach button.
 *
 * Adding a new vision-capable family: append a regex to VISION_PATTERNS.
 * Adding a text-only override (e.g. coding-tuned variant): append to
 * TEXT_ONLY_OVERRIDES — those win over VISION_PATTERNS.
 */
const VISION_PATTERNS: RegExp[] = [
  // Anthropic Claude 3.5+ — all current and recent models are multimodal
  /\bclaude-(opus|sonnet|haiku)-[34]/i,
  /\bclaude-3-5/i,
  // Google Gemini — all 2.x and 3.x are multimodal
  /\bgemini-3/i,
  /\bgemini-2\.5/i,
  // OpenAI GPT-4o / GPT-4.1 / GPT-5.x (full and mini/pro tiers)
  /\bgpt-4(o|\.1)/i,
  /\bgpt-5(\.\d+)?(-pro|-mini)?\b/i,
  /\bo[1-9](-mini|-pro)?/i,
  // xAI Grok 4.x is multimodal
  /\bgrok-(4|3|code-fast)/i,
  /\bx-ai\/grok/i,
  // Dedicated VL (vision-language) variants of open-source families
  /\bdeepseek-vl/i,
  /\bkimi-k2(\.\d+)?(-vl|-vision)/i,
  /\bqwen2\.5-vl/i,
]

const TEXT_ONLY_OVERRIDES: RegExp[] = [
  // OpenAI coding/nano variants are text-only despite the GPT-5.x prefix.
  /\bgpt-5(\.\d+)?-codex/i,
  /\bgpt-5(\.\d+)?-nano/i,
]

export function detectVisionSupport(modelId: string): boolean {
  if (!modelId) return false
  if (TEXT_ONLY_OVERRIDES.some(rx => rx.test(modelId))) return false
  return VISION_PATTERNS.some(rx => rx.test(modelId))
}
