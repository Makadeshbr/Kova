import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const TypeScriptAdapter: StackAdapter = {
  name: 'typescript',

  detect(projectRoot: string): boolean {
    return existsSync(join(projectRoot, 'tsconfig.json'))
  },

  commands: {
    build: 'tsc --noEmit',
    test: 'vitest run',
    lint: 'eslint .',
  },

  parseImports(_filePath: string, content: string): string[] {
    return collectImports(content)
  },

  treeSitterLanguage(): string {
    return 'typescript'
  },

  semgrepRuleset(): string {
    return 'p/typescript'
  },

  namingConvention: {
    functions: 'camelCase',
    files: 'kebab-case',
    classes: 'PascalCase',
  },
}

function collectImports(content: string): string[] {
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/gm,
    /\bexport\s+(?:type\s+)?(?:[\w*{},\s]+\s+from\s+)['"]([^'"]+)['"]/gm,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/gm,
  ]
  const imports = new Set<string>()

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content)) !== null) {
      imports.add(match[1])
    }
  }

  return [...imports]
}

export function detectStructure(projectRoot: string): {
  hasSrc: boolean
  hasTests: boolean
  entryPoint: string | null
} {
  const entryPoints = ['src/index.ts', 'index.ts', 'src/main.ts', 'main.ts']
  const entryPoint = entryPoints.find(ep => existsSync(join(projectRoot, ep))) ?? null

  return {
    hasSrc: existsSync(join(projectRoot, 'src')),
    hasTests:
      existsSync(join(projectRoot, '__tests__')) ||
      existsSync(join(projectRoot, 'src', '__tests__')),
    entryPoint,
  }
}
