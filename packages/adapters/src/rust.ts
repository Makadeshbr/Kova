import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const RustAdapter: StackAdapter = {
  name: 'rust',

  detect(projectRoot: string): boolean {
    return existsSync(join(projectRoot, 'Cargo.toml'))
  },

  commands: {
    build: 'cargo build',
    test: 'cargo test',
    lint: 'cargo clippy -- -D warnings',
    format: 'cargo fmt',
  },

  parseImports(_filePath: string, content: string): string[] {
    const imports = new Set<string>()
    const patterns = [/\buse\s+([\w:]+)/gm, /extern\s+crate\s+(\w+)/gm]
    for (const p of patterns) {
      let m: RegExpExecArray | null
      while ((m = p.exec(content)) !== null) imports.add(m[1].split('::')[0])
    }
    return [...imports]
  },

  treeSitterLanguage(): string { return 'rust' },
  semgrepRuleset(): string { return 'p/rust' },

  namingConvention: {
    functions: 'snake_case',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}
