/**
 * Detects an explicit language/stack mention in a task description.
 *
 * Returns the canonical stack adapter name when the user's text clearly names a language,
 * or null when no explicit language is mentioned (caller should fall back to project detection).
 *
 * Order matters: "javascript" is checked before "java" to avoid false matches.
 *
 * This is intentionally pattern-based and conservative — it returns null on ambiguity
 * rather than guessing. The goal is to capture EXPLICIT user intent ("em JavaScript puro",
 * "Python script", "Go handler") and override the project-level adapter only when the user
 * was unambiguous.
 */

interface LanguageRule {
  readonly stack: string
  readonly pattern: RegExp
}

const LANGUAGE_RULES: LanguageRule[] = [
  // JavaScript — explicit mentions, node:test, .mjs/.cjs hints
  { stack: 'javascript', pattern: /\b(?:javascript|js\s+puro|node:test|node\s*--\s*test|\.mjs\b|\.cjs\b)\b/i },
  // TypeScript — explicit name, tsconfig, .ts file extension references
  { stack: 'typescript', pattern: /\b(?:typescript|tsconfig|\.tsx?\b)\b/i },
  // Python — language name or framework hints
  { stack: 'python',     pattern: /\b(?:python\d?|pytest|django|flask|fastapi|pyproject|\.py\b)\b/i },
  // Go — "Golang", "em Go", explicit Go file/module
  { stack: 'go',         pattern: /\b(?:golang|em\s+go\b|go\s+puro|go\.mod|\.go\b)\b/i },
  // Rust
  { stack: 'rust',       pattern: /\b(?:rust|cargo|\.rs\b)\b/i },
  // Java (not "JavaScript")
  { stack: 'java',       pattern: /\bjava\b(?!script)/i },
  // C# / .NET — note: '#' is not a word char, so \b cannot follow 'c#'
  { stack: 'csharp',     pattern: /(?:\bc#|\bcsharp\b|\bdotnet\b|\.cs\b)/i },
  // Ruby
  { stack: 'ruby',       pattern: /\b(?:ruby|rails|gemfile|\.rb\b)\b/i },
  // PHP
  { stack: 'php',        pattern: /\bphp\b/i },
  // Swift
  { stack: 'swift',      pattern: /\bswift\b/i },
  // Dart / Flutter
  { stack: 'flutter',    pattern: /\b(?:dart|flutter)\b/i },
  // C++
  { stack: 'cpp',        pattern: /(?:\bc\+\+|\bcpp\b|\.cpp\b)/i },
]

export function detectExplicitLanguage(text: string): string | null {
  if (!text) return null
  for (const rule of LANGUAGE_RULES) {
    if (rule.pattern.test(text)) return rule.stack
  }
  return null
}

/**
 * Resolves the effective stack adapter for a task.
 *
 * Priority:
 *   1. Explicit mention in the user-provided text (objective + constraints)
 *   2. Project-detected stack from the file system
 *
 * Example: project is "generic" (empty folder), but user says "Crie em JavaScript puro" →
 * effective stack is "javascript" → contract restricts to .js/.mjs/.cjs and forbids .ts.
 */
export function resolveTaskStack(text: string, projectStack: string): string {
  const explicit = detectExplicitLanguage(text)
  return explicit ?? projectStack
}
