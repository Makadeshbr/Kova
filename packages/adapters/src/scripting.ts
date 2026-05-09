import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

export const RubyAdapter: StackAdapter = {
  name: 'ruby',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'Gemfile')) ||
      existsSync(join(projectRoot, 'Rakefile')) ||
      existsSync(join(projectRoot, '.ruby-version'))
    )
  },

  commands: {
    build: 'bundle install --quiet',
    test: 'bundle exec rspec',
    lint: 'bundle exec rubocop -f quiet',
    format: 'bundle exec rubocop -a -f quiet',
  },

  parseImports(_filePath: string, content: string): string[] {
    const imports = new Set<string>()
    const patterns = [/\brequire\s+['"]([^'"]+)['"]/gm, /\brequire_relative\s+['"]([^'"]+)['"]/gm]
    for (const p of patterns) {
      let m: RegExpExecArray | null
      while ((m = p.exec(content)) !== null) imports.add(m[1])
    }
    return [...imports]
  },

  treeSitterLanguage(): string { return 'ruby' },
  semgrepRuleset(): string { return 'p/ruby' },

  namingConvention: {
    functions: 'snake_case',
    files: 'snake_case',
    classes: 'PascalCase',
  },
}

export const PhpAdapter: StackAdapter = {
  name: 'php',

  detect(projectRoot: string): boolean {
    return (
      existsSync(join(projectRoot, 'composer.json')) ||
      existsSync(join(projectRoot, 'artisan'))
    )
  },

  commands: {
    build: 'composer install -q',
    test: 'php vendor/bin/phpunit',
    lint: 'php vendor/bin/phpcs',
    format: 'php vendor/bin/phpcbf',
  },

  parseImports(_filePath: string, content: string): string[] {
    const imports = new Set<string>()
    const re = /\buse\s+([\w\\]+)/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) imports.add(m[1].split('\\')[0])
    return [...imports]
  },

  treeSitterLanguage(): string { return 'php' },
  semgrepRuleset(): string { return 'p/php' },

  namingConvention: {
    functions: 'camelCase',
    files: 'PascalCase',
    classes: 'PascalCase',
  },
}
