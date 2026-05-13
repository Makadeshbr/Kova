import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

export interface AtRef { name: string; path: string; content: string }
export interface DeniedAtRef { name: string; path: string; reason: string }
export interface ResolvedAtRefs {
  userContent: string
  refs: AtRef[]
  denied: DeniedAtRef[]
  missing: string[]
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'out', '.next',
  '__pycache__', '.cache', 'vendor', 'target', 'build', 'coverage',
])

function isProtectedPath(path: string): boolean {
  const name = basename(path.replace(/\\/g, '/')).toLowerCase()
  if (name === '.env.example') return false
  return name === '.env' || name.startsWith('.env.') || name.endsWith('.env') || name.includes('.env.')
}

function findFileByName(root: string, filename: string, depth = 0): string | null {
  if (depth > 6) return null
  let entries: string[]
  try { entries = readdirSync(root) } catch { return null }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue
    const full = join(root, entry)
    try {
      const st = statSync(full)
      if (!st.isDirectory() && entry === filename) return full
      if (st.isDirectory()) {
        const found = findFileByName(full, filename, depth + 1)
        if (found) return found
      }
    } catch { /* skip */ }
  }
  return null
}

function extractAtTokens(message: string): string[] {
  const tokens: string[] = []
  for (const match of message.matchAll(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? ''
    const token = raw.replace(/[)\].!?]+$/g, '').trim()
    if (token && !tokens.includes(token)) tokens.push(token)
  }
  return tokens
}

export function resolveAtRefs(message: string, projectRoot: string): ResolvedAtRefs {
  const refs: AtRef[] = []
  const denied: DeniedAtRef[] = []
  const missing: string[] = []
  const seen = new Set<string>()

  for (const token of extractAtTokens(message)) {
    if (seen.has(token)) continue
    seen.add(token)

    let fullPath = join(projectRoot, token)
    if (!existsSync(fullPath)) {
      fullPath = findFileByName(projectRoot, basename(token)) ?? ''
    }
    if (!fullPath || !existsSync(fullPath)) {
      missing.push(token)
      continue
    }

    try {
      const rel = relative(projectRoot, fullPath).replace(/\\/g, '/')
      if (isProtectedPath(rel)) {
        denied.push({ name: token, path: rel, reason: 'Arquivo protegido: segredos nao sao anexados ao contexto.' })
        continue
      }
      refs.push({ name: token, path: rel, content: readFileSync(fullPath, 'utf-8').slice(0, 8_000) })
    } catch { /* skip unreadable files */ }
  }

  const attachment = refs.length > 0
    ? '\n\nReferenced files:\n' + refs.map(r => `\`\`\`\n// @${r.path}\n${r.content}\n\`\`\``).join('\n\n')
    : ''
  const deniedText = denied.length > 0
    ? '\n\nDenied references:\n' + denied.map(r => `- @${r.path}: ${r.reason}`).join('\n')
    : ''

  return { userContent: message + attachment + deniedText, refs, denied, missing }
}

export function shouldShortCircuitDeniedRefs(message: string, resolution: ResolvedAtRefs): boolean {
  if (resolution.denied.length === 0 || resolution.refs.length > 0) return false
  const withoutRefs = message.replace(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g, '').trim().toLowerCase()
  if (!withoutRefs) return true
  return /^(leia|ler|read|explique|explain|mostre|show|abrir|open)\b/.test(withoutRefs)
}

export function deniedRefsMessage(resolution: ResolvedAtRefs): string {
  const files = resolution.denied.map(r => `@${r.path}`).join(', ')
  return `Nao posso ler ${files}. Arquivos de ambiente podem conter segredos e nao sao anexados ao contexto. Use um arquivo exemplo, como @.env.example, se quiser compartilhar variaveis sem valores sensiveis.`
}
