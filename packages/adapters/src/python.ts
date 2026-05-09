import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const PythonAdapter: StackAdapter = {
  name: 'python',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'pyproject.toml')) ||
      existsSync(join(projectRoot, 'setup.py')) ||
      existsSync(join(projectRoot, 'requirements.txt'))
    )
  },

  commands: {
    build: 'python -m py_compile',
    test: 'pytest',
    lint: 'ruff check .',
  },

  parseImports(_filePath: string, content: string): string[] {
    return collectPythonImports(content)
  },

  treeSitterLanguage(): string {
    return 'python'
  },

  semgrepRuleset(): string {
    return 'p/python'
  },

  namingConvention: {
    functions: 'snake_case',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}

function collectPythonImports(content: string): string[] {
  const imports = new Set<string>()
  const importPattern = /^\s*import\s+(.+)$/gm
  const fromPattern = /^\s*from\s+([A-Za-z_][\w.]*|\.+[A-Za-z_][\w.]*)\s+import\s+/gm

  let match: RegExpExecArray | null
  while ((match = importPattern.exec(content)) !== null) {
    for (const item of match[1].split(',')) {
      const moduleName = item.trim().split(/\s+as\s+/i)[0]?.trim()
      if (moduleName) imports.add(moduleName)
    }
  }

  while ((match = fromPattern.exec(content)) !== null) {
    imports.add(match[1])
  }

  return [...imports]
}
