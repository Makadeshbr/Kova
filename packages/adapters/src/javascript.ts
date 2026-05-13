import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const JavaScriptAdapter: StackAdapter = {
  name: 'javascript',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'package.json')) &&
      !existsSync(join(projectRoot, 'tsconfig.json'))
    )
  },

  commands: {
    build: '',
    test: 'node --test',
    lint: '',
  },

  parseImports(_filePath: string, content: string): string[] {
    const patterns = [
      /\brequire\(\s*['"]([^'"]+)['"]\s*\)/gm,
      /\bimport\s+(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/gm,
    ]
    const imports = new Set<string>()
    for (const pattern of patterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) imports.add(match[1])
    }
    return [...imports]
  },

  treeSitterLanguage(): string {
    return 'javascript'
  },

  semgrepRuleset(): string {
    return 'p/javascript'
  },

  namingConvention: {
    functions: 'camelCase',
    files: 'kebab-case',
    classes: 'PascalCase',
  },
}
