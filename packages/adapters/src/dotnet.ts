import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

function hasCsproj(projectRoot: string): boolean {
  try {
    return readdirSync(projectRoot).some(f => f.endsWith('.csproj') || f.endsWith('.sln'))
  } catch {
    return false
  }
}

export const DotNetAdapter: StackAdapter = {
  name: 'csharp',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'global.json')) ||
      existsSync(join(projectRoot, 'Directory.Build.props')) ||
      hasCsproj(projectRoot)
    )
  },

  commands: {
    build: 'dotnet build -q',
    test: 'dotnet test -q',
    lint: 'dotnet format --verify-no-changes',
    format: 'dotnet format',
  },

  parseImports(_filePath: string, content: string): string[] {
    const imports = new Set<string>()
    const re = /^\s*using\s+([\w.]+)/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) imports.add(m[1].split('.')[0])
    return [...imports]
  },

  treeSitterLanguage(): string { return 'c_sharp' },
  semgrepRuleset(): string { return 'p/csharp' },

  namingConvention: {
    functions: 'PascalCase',
    files: 'PascalCase',
    classes: 'PascalCase',
  },
}
