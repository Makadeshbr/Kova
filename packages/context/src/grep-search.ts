import fg from 'fast-glob'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

export interface GrepMatch {
  file: string
  score: number
}

const SOURCE_GLOBS = ['**/*.{ts,tsx,js,jsx,py,go,rs,cpp,c,java,cs,rb}']
const IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.kova/**']
const MAX_FILE_BYTES = 100_000

export async function grepForTask(task: string, projectRoot: string): Promise<GrepMatch[]> {
  const keywords = extractKeywords(task)
  if (keywords.length === 0) return []

  const files = await fg(SOURCE_GLOBS, { cwd: projectRoot, ignore: IGNORE })
  const matches: GrepMatch[] = []

  for (const file of files) {
    const score = scoreFile(file, projectRoot, keywords)
    if (score > 0) matches.push({ file, score })
  }

  return matches.sort((a, b) => b.score - a.score)
}

export function extractKeywords(text: string): string[] {
  return [...new Set(
    text.toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w)),
  )]
}

function scoreFile(relPath: string, projectRoot: string, keywords: string[]): number {
  const fullPath = join(projectRoot, relPath)
  if (!existsSync(fullPath)) return 0

  let score = 0
  const name = basename(relPath).toLowerCase()
  for (const kw of keywords) {
    if (name.includes(kw)) score += 3
  }

  try {
    if (statSync(fullPath).size > MAX_FILE_BYTES) return score
    const content = readFileSync(fullPath, 'utf-8').toLowerCase()
    for (const kw of keywords) {
      // cap por keyword para evitar skew em arquivos com repetição mecânica
      score += Math.min((content.match(new RegExp(kw, 'g')) ?? []).length, 5)
    }
  } catch {
    return score // arquivo ilegível (binário / sem permissão) — pontuação só pelo nome
  }

  return score
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was',
  'para', 'que', 'com', 'uma', 'não', 'por', 'mais', 'como', 'seu',
])
