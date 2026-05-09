import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const SwiftAdapter: StackAdapter = {
  name: 'swift',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'Package.swift')) ||
      existsSync(join(projectRoot, 'Podfile'))
    )
  },

  commands: {
    build: 'swift build',
    test: 'swift test',
    lint: 'swiftlint lint --quiet',
    format: 'swiftformat .',
  },

  parseImports(_filePath: string, content: string): string[] {
    const imports = new Set<string>()
    const re = /\bimport\s+(\w+)/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) imports.add(m[1])
    return [...imports]
  },

  treeSitterLanguage(): string { return 'swift' },
  semgrepRuleset(): string { return 'p/swift' },

  namingConvention: {
    functions: 'camelCase',
    files: 'PascalCase',
    classes: 'PascalCase',
  },
}

export const FlutterAdapter: StackAdapter = {
  name: 'dart',

  detect(projectRoot: string): boolean {
    return existsSync(join(projectRoot, 'pubspec.yaml'))
  },

  commands: {
    build: 'flutter build apk --debug',
    test: 'flutter test',
    lint: 'flutter analyze --no-fatal-infos',
    format: 'dart format .',
  },

  parseImports(_filePath: string, content: string): string[] {
    const imports = new Set<string>()
    const re = /\bimport\s+['"]([^'"]+)['"]/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) imports.add(m[1].split('/')[0])
    return [...imports]
  },

  treeSitterLanguage(): string { return 'dart' },
  semgrepRuleset(): string { return 'auto' },

  namingConvention: {
    functions: 'camelCase',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}
