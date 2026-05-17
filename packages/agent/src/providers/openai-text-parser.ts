import type { FileChange } from '@kova/shared'

export interface OpenAIToolCall {
  function?: { name?: string; arguments?: string }
}

// Default filenames when the LLM outputs code without a path (common in local models)
const LANG_DEFAULT_FILE: Record<string, string> = {
  html: 'index.html', css: 'styles.css', javascript: 'script.js', js: 'script.js',
  typescript: 'app.ts', ts: 'app.ts', python: 'main.py', py: 'main.py',
  go: 'main.go', rust: 'main.rs', java: 'Main.java', kotlin: 'Main.kt',
  ruby: 'main.rb', php: 'index.php', swift: 'main.swift', dart: 'main.dart',
  cpp: 'main.cpp', c: 'main.c', csharp: 'Program.cs', cs: 'Program.cs',
  sh: 'run.sh', bash: 'run.sh', sql: 'schema.sql', json: 'data.json',
  yaml: 'config.yaml', toml: 'config.toml', markdown: 'README.md', md: 'README.md',
}

export function extractChangesFromTools(calls: OpenAIToolCall[]): FileChange[] {
  const changes: FileChange[] = []
  for (const call of calls) {
    const name = call.function?.name
    const input = parseArgs(call.function?.arguments)
    if (!name || !input) continue
    if (name === 'delete_file' && typeof input.path === 'string') {
      changes.push({ path: input.path, type: 'delete', diff: '' })
      continue
    }
    if (name !== 'write_file' || typeof input.path !== 'string' || typeof input.content !== 'string') continue
    changes.push({ path: input.path, type: 'create', diff: input.content })
  }
  return changes
}

export function extractChangesFromXml(text: string): FileChange[] {
  const changes: FileChange[] = []
  const pattern = /<kova_file\s+path="([^"]+)">([\s\S]*?)<\/kova_file>/g
  for (const m of text.matchAll(pattern)) {
    const path = m[1].trim()
    const content = m[2].replace(/^\n/, '').replace(/\n$/, '')
    if (path && content) changes.push({ path, type: 'create', diff: content })
  }
  return changes
}

export interface TextChangeExtractionOptions {
  /**
   * Bare code blocks without filenames are useful for weak local models, but
   * too risky after the model already used tools. In that case we only accept
   * explicitly labelled file blocks.
   */
  includeBareBlocks?: boolean
}

export function extractChangesFromText(text: string, options: TextChangeExtractionOptions = {}): FileChange[] {
  const includeBareBlocks = options.includeBareBlocks ?? true
  const byPath = new Map<string, string>()

  // Pattern 1: [FILE: path] or [FILE: path]\n...\n[/FILE]
  for (const m of text.matchAll(/\[FILE:\s*([^\]\n]+)\]\s*```[^\n]*\n([\s\S]*?)```/g)) {
    const p = normalizePath(m[1].trim()); if (p && m[2].trim()) byPath.set(p, m[2].trim())
  }
  for (const m of text.matchAll(/\[FILE:\s*([^\]\n]+)\]\s*(?:```[^\n]*\n)?([\s\S]*?)\[\/FILE\]/g)) {
    const p = normalizePath(m[1].trim())
    const c = m[2].replace(/```[\w]*\n?/g, '').replace(/```\s*$/g, '').trim()
    if (p && c) byPath.set(p, c)
  }
  if (byPath.size > 0) return toFileChanges(byPath)

  // Pattern 2: comment-first (// filename.ts inside code block)
  for (const m of text.matchAll(/```(?:\w+)?\n(?:\/\/|#)\s*([\w./\\-]+\.\w+)\n([\s\S]*?)```/g)) {
    const p = normalizePath(m[1].trim()); if (p && m[2].trim()) byPath.set(p, m[2].trim())
  }
  if (byPath.size > 0) return toFileChanges(byPath)

  // Pattern 3: **filename.ext** or `filename.ext:` before code block
  for (const m of text.matchAll(/(?:\*\*`?([^`\n*]{2,80}\.\w+)`?\*\*[:\s]*\n|^([^*`\n]{2,80}\.\w+):\s*\n)```[\w]*\n([\s\S]*?)```/gm)) {
    const p = normalizePath((m[1] ?? m[2]).trim()); if (p && m[3].trim()) byPath.set(p, m[3].trim())
  }
  if (byPath.size > 0) return toFileChanges(byPath)

  // Pattern 3b: plain filename line before a fenced block.
  // Local models often answer:
  //
  // index.html
  // ```html
  // ...
  // ```
  //
  // The previous parser missed this, so partial tool use could leave the most
  // important files stranded as markdown in the final response.
  for (const m of text.matchAll(/(?:^|\n)([\w./\\-]+\.\w+)\s*\n\s*```[\w#+.-]*\n([\s\S]*?)```/g)) {
    const p = normalizePath(m[1].trim()); if (p && m[2].trim()) byPath.set(p, m[2].trim())
  }
  if (byPath.size > 0) return toFileChanges(byPath)

  // Pattern 4: ## heading before code block (common in local model output)
  for (const m of text.matchAll(/^#{1,3}\s+([\w./\\-]+\.\w+)\s*\n```[\w]*\n([\s\S]*?)```/gm)) {
    const p = normalizePath(m[1].trim()); if (p && m[2].trim()) byPath.set(p, m[2].trim())
  }
  if (byPath.size > 0) return toFileChanges(byPath)

  // Pattern 5: Heading as label "File: filename.ext" or "Filename: filename.ext"
  for (const m of text.matchAll(/(?:^|\n)(?:File(?:name)?|Create|Path):\s*([\w./\\-]+\.\w+)\s*\n```[\w]*\n([\s\S]*?)```/gi)) {
    const p = normalizePath(m[1].trim()); if (p && m[2].trim()) byPath.set(p, m[2].trim())
  }
  if (byPath.size > 0) return toFileChanges(byPath)

  // Pattern 6: Language inference — bare code blocks without names (last resort for local models)
  // Only applies when there are ≤4 code blocks to avoid false positives
  const bareBlocks = includeBareBlocks ? [...text.matchAll(/```(\w+)\n([\s\S]{20,}?)```/g)] : []
  if (bareBlocks.length > 0 && bareBlocks.length <= 4) {
    const usedNames = new Set<string>()
    for (const m of bareBlocks) {
      const lang = m[1].toLowerCase()
      const content = m[2].trim()
      if (!content) continue
      let defaultName = LANG_DEFAULT_FILE[lang]
      if (!defaultName) continue
      // Avoid duplicate names (e.g., two css blocks → styles.css, styles2.css)
      if (usedNames.has(defaultName)) {
        const ext = defaultName.split('.').at(-1) ?? ''
        const base = defaultName.slice(0, defaultName.lastIndexOf('.'))
        defaultName = `${base}${usedNames.size}.${ext}`
      }
      usedNames.add(defaultName)
      byPath.set(defaultName, content)
    }
  }

  return toFileChanges(byPath)
}

function normalizePath(raw: string): string {
  let p = raw.replace(/\\/g, '/')
  const absMatch = p.match(/^(?:[A-Za-z]:\/|\/)[^/].*?\/(.+)$/)
  if (absMatch) p = absMatch[1]
  return p.replace(/[`'"]/g, '').trim()
}

function toFileChanges(map: Map<string, string>): FileChange[] {
  return [...map.entries()]
    .filter(([path, content]) => path.length > 0 && content.length > 0)
    .map(([path, content]) => ({ path, type: 'create' as const, diff: content }))
}

function parseArgs(raw?: string): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch { return null }
}
