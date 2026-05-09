import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

const cIncludeRe = /#include\s+[<"]([^>"]+)[>"]/gm

function parseCIncludes(content: string): string[] {
  const imports = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = cIncludeRe.exec(content)) !== null) {
    imports.add(m[1].replace(/\.(h|hpp)$/, '').split('/')[0])
  }
  return [...imports]
}

export const CppAdapter: StackAdapter = {
  name: 'cpp',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'CMakeLists.txt')) ||
      existsSync(join(projectRoot, 'meson.build')) ||
      existsSync(join(projectRoot, 'configure.ac'))
    )
  },

  commands: {
    build: 'cmake --build . --parallel',
    test: 'ctest --output-on-failure',
    lint: 'clang-tidy -p build',
    format: 'clang-format -i -r .',
  },

  parseImports: (_f, content) => parseCIncludes(content),
  treeSitterLanguage: () => 'cpp',
  semgrepRuleset: () => 'p/cpp',

  namingConvention: {
    functions: 'snake_case',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}

export const CAdapter: StackAdapter = {
  name: 'c',

  detect(projectRoot: string): boolean {
    return (
      (existsSync(join(projectRoot, 'Makefile')) || existsSync(join(projectRoot, 'makefile'))) &&
      !existsSync(join(projectRoot, 'CMakeLists.txt'))
    )
  },

  commands: {
    build: 'make',
    test: 'make test',
    lint: 'make lint',
    format: '',
  },

  parseImports: (_f, content) => parseCIncludes(content),
  treeSitterLanguage: () => 'c',
  semgrepRuleset: () => 'p/c',

  namingConvention: {
    functions: 'snake_case',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}
