import type { StackAdapter } from '@kova/shared'

/**
 * Fallback universal — funciona para qualquer linguagem/stack.
 * Comandos vazios = layer pulado (skipped: true).
 * Usado quando nenhum adapter específico reconhece o projeto.
 */
export const GenericAdapter: StackAdapter = {
  name: 'generic',

  detect(): boolean {
    return true // sempre fallback
  },

  commands: {
    build: '',
    test: '',
    lint: '',
  },

  parseImports(): string[] {
    return []
  },

  treeSitterLanguage(): string {
    return 'unknown'
  },

  semgrepRuleset(): string {
    return 'auto'
  },

  namingConvention: {
    functions: 'camelCase',
    files: 'kebab-case',
    classes: 'PascalCase',
  },
}
