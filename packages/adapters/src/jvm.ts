import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

const javaImportRe = /^\s*import\s+([\w.]+)/gm

function parseJavaImports(content: string): string[] {
  const imports = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = javaImportRe.exec(content)) !== null) {
    imports.add(m[1].split('.')[0])
  }
  return [...imports]
}

export const JavaMavenAdapter: StackAdapter = {
  name: 'java',

  detect(projectRoot: string): boolean {
    return existsSync(join(projectRoot, 'pom.xml'))
  },

  commands: {
    build: 'mvn compile -q',
    test: 'mvn test -q',
    lint: 'mvn checkstyle:check -q',
    format: '',
  },

  parseImports: (_f, content) => parseJavaImports(content),
  treeSitterLanguage: () => 'java',
  semgrepRuleset: () => 'p/java',

  namingConvention: {
    functions: 'camelCase',
    files: 'PascalCase',
    classes: 'PascalCase',
  },
}

export const GradleAdapter: StackAdapter = {
  name: 'kotlin',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'build.gradle')) ||
      existsSync(join(projectRoot, 'build.gradle.kts')) ||
      existsSync(join(projectRoot, 'settings.gradle.kts'))
    )
  },

  commands: {
    build: 'gradle build -q',
    test: 'gradle test -q',
    lint: 'gradle ktlintCheck -q',
    format: 'gradle ktlintFormat -q',
  },

  parseImports: (_f, content) => parseJavaImports(content),
  treeSitterLanguage: () => 'kotlin',
  semgrepRuleset: () => 'p/kotlin',

  namingConvention: {
    functions: 'camelCase',
    files: 'PascalCase',
    classes: 'PascalCase',
  },
}
