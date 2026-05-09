import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const GoAdapter: StackAdapter = {
  name: 'go',

  detect(projectRoot: string): boolean {
    return existsSync(join(projectRoot, 'go.mod'))
  },

  commands: {
    build: 'go build ./...',
    test: 'go test ./...',
    lint: 'golangci-lint run',
  },

  parseImports(_filePath: string, content: string): string[] {
    return collectGoImports(content)
  },

  treeSitterLanguage(): string {
    return 'go'
  },

  semgrepRuleset(): string {
    return 'p/golang'
  },

  namingConvention: {
    functions: 'camelCase',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}

function collectGoImports(content: string): string[] {
  const imports = new Set<string>()
  const singlePattern = /^\s*import\s+(?:[\w.]+\s+)?["`]([^"`]+)["`]/gm
  const blockPattern = /^\s*import\s*\(([\s\S]*?)\)/gm
  const blockEntryPattern = /^\s*(?:[\w.]+\s+)?["`]([^"`]+)["`]/gm

  let match: RegExpExecArray | null
  while ((match = singlePattern.exec(content)) !== null) {
    imports.add(match[1])
  }

  while ((match = blockPattern.exec(content)) !== null) {
    let entry: RegExpExecArray | null
    while ((entry = blockEntryPattern.exec(match[1])) !== null) {
      imports.add(entry[1])
    }
    blockEntryPattern.lastIndex = 0
  }

  return [...imports]
}
