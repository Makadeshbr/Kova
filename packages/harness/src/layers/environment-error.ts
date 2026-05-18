import type { HarnessError, LayerResult } from '@kova/shared'

/**
 * Detects build/test output that indicates the environment is broken rather
 * than the source code. Surfacing these as `type: 'environment'` lets the
 * execution engine break out of the repair loop — no amount of editing
 * source will install a missing binary.
 *
 * Patterns target the three platforms Kova runs on:
 *   - Windows cmd / PowerShell: "X" is not recognized as an internal/external command
 *   - POSIX shells:             X: command not found  /  not found: X
 *   - Node:                     Cannot find module 'X'  /  MODULE_NOT_FOUND  /  ERR_MODULE_NOT_FOUND
 *   - Python:                   ModuleNotFoundError: No module named
 *
 * Each pattern includes a hint of which tooling step failed (binary vs module)
 * so the user gets a precise next-step (`install dependencies` vs `install <tool>`).
 */

interface EnvPattern {
  // Anchor on stderr/stdout content. Order is fail-fast — first match wins.
  pattern: RegExp
  // Extract the offending binary or module name for the humanMessage.
  extractName: (match: RegExpMatchArray) => string
  // The remediation hint we surface to the user.
  hint: (name: string) => string
}

const ENVIRONMENT_PATTERNS: EnvPattern[] = [
  // Windows English: 'next' is not recognized as an internal or external command
  // Windows pt-BR:    'next' não é reconhecido como um comando interno ou externo
  // Windows mangled:  'next' n o   reconhecido (cp1252→utf8 corruption)
  // The middle part is intentionally lenient (up to 40 chars of anything) so
  // localized + corrupted variants all match without per-locale patterns.
  {
    pattern: /['"]([^'"\n]+)['"][^\n]{0,40}(?:is\s+not\s+recognized|reconhecid[oa])/i,
    extractName: m => m[1],
    hint: name => `'${name}' is not on PATH. Install it (e.g. \`npm install ${name}\` or globally) or run \`npm install\` to populate node_modules.`,
  },
  // zsh: "zsh: command not found: pytest" — name comes AFTER the message.
  {
    pattern: /command not found:\s*([^\s\n]+)/i,
    extractName: m => m[1],
    hint: name => `'${name}' is not on PATH. Install it or run \`npm install\` to populate node_modules.`,
  },
  // bash/sh: "bash: pytest: command not found" — name comes BEFORE the message.
  // Optionally consume a shell prefix (`bash: ` / `sh: `) so the shell name is
  // not captured by mistake.
  {
    pattern: /(?:^|\n)(?:[a-z]+:\s+)?([^\s:]+):\s*command not found/i,
    extractName: m => m[1],
    hint: name => `'${name}' is not on PATH. Install it or run \`npm install\` to populate node_modules.`,
  },
  // Node: "Cannot find module 'X'" / "Cannot find module \"X\""
  {
    pattern: /Cannot find module ['"]([^'"\n]+)['"]/,
    extractName: m => m[1],
    hint: name => `Node could not resolve '${name}'. Run \`npm install\` (or the project's package manager) to install dependencies.`,
  },
  // Node: bare MODULE_NOT_FOUND code without the friendly message
  {
    pattern: /\b(?:MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND)\b/,
    extractName: () => 'a required module',
    hint: () => 'A required Node module is missing. Run `npm install` (or the project\'s package manager) to install dependencies.',
  },
  // Python: ModuleNotFoundError: No module named 'X'
  {
    pattern: /ModuleNotFoundError:\s*No module named ['"]([^'"\n]+)['"]/,
    extractName: m => m[1],
    hint: name => `Python could not import '${name}'. Run \`pip install ${name}\` (or use the project's virtualenv).`,
  },
]

/**
 * @returns A typed HarnessError when the output matches an environment failure
 * signature, or `null` when the failure looks like normal source-code breakage
 * that the repair loop can attempt to fix.
 */
export function classifyEnvironmentFailure(
  layer: LayerResult['name'],
  output: string,
  command: string | undefined,
): HarnessError | null {
  if (!output) return null
  for (const entry of ENVIRONMENT_PATTERNS) {
    const match = output.match(entry.pattern)
    if (!match) continue
    const name = entry.extractName(match).trim()
    if (!name) continue
    const commandPrefix = command ? `${command}: ` : ''
    return {
      layer,
      type: 'environment',
      severity: 'critical',
      fixable: false,
      message: `${commandPrefix}${match[0].trim()}`,
      humanMessage: entry.hint(name),
      file: '',
      rule: 'environment_missing',
      suggestion: entry.hint(name),
    }
  }
  return null
}
