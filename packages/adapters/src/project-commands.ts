import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { StackAdapter } from '@kova/shared'

type Commands = { build: string; test: string; lint: string; format?: string }

interface PackageJson {
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

/**
 * Descobre os comandos reais do projeto sem exigir configuração manual.
 * Prioridade: scripts do projeto > frameworks detectados > defaults do adapter.
 */
export function resolveCommands(adapter: StackAdapter, projectRoot: string): Commands {
  // 1. Projetos npm/node (package.json)
  const pkgPath = join(projectRoot, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson
      return resolveFromPackageJson(pkg, adapter.commands)
    } catch {
      return adapter.commands
    }
  }

  // 2. Outros sistemas de build — detecta pela presença de arquivos característicos
  return detectBuildSystem(projectRoot) ?? adapter.commands
}

function resolveFromPackageJson(pkg: PackageJson, defaults: Commands): Commands {
  const scripts = pkg.scripts ?? {}
  const deps = { ...pkg.devDependencies, ...pkg.dependencies }

  return {
    build: pickBuild(scripts, deps) ?? defaults.build,
    test: pickTest(scripts, deps) ?? defaults.test,
    lint: pickLint(scripts, deps) ?? defaults.lint,
    format: scripts['format'] ?? defaults.format,
  }
}

function detectBuildSystem(projectRoot: string): Commands | null {
  const has = (f: string) => existsSync(join(projectRoot, f))

  if (has('Cargo.toml')) {
    return { build: 'cargo build', test: 'cargo test', lint: 'cargo clippy -- -D warnings' }
  }
  if (has('go.mod')) {
    return { build: 'go build ./...', test: 'go test ./...', lint: 'staticcheck ./...' }
  }
  if (has('pyproject.toml') || has('setup.py') || has('setup.cfg')) {
    return { build: 'python -m build', test: 'pytest', lint: 'ruff check .' }
  }
  if (has('CMakeLists.txt')) {
    return { build: 'cmake --build .', test: 'ctest --output-on-failure', lint: '' }
  }
  if (has('build.gradle') || has('build.gradle.kts')) {
    return { build: 'gradle build', test: 'gradle test', lint: 'gradle lint' }
  }
  if (has('pom.xml')) {
    return { build: 'mvn compile -q', test: 'mvn test -q', lint: '' }
  }
  if (has('Makefile') || has('makefile')) {
    return { build: 'make', test: 'make test', lint: 'make lint' }
  }

  return null
}

function pickBuild(scripts: Record<string, string>, deps: Record<string, string>): string | undefined {
  // Usa `npm run build` para garantir que node_modules/.bin está no PATH
  if (validScript(scripts['build']) ?? validScript(scripts['compile'])) return 'npm run build'
  if ('next' in deps) return 'npx next build'
  if ('vite' in deps) return 'npx vite build'
  if ('nuxt' in deps) return 'npx nuxt build'
  return undefined
}

function pickTest(scripts: Record<string, string>, deps: Record<string, string>): string | undefined {
  // npm run test garante que o runner local (vitest, jest) seja encontrado
  if (validScript(scripts['test'])) return 'npm run test'
  if ('vitest' in deps) return 'npx vitest run'
  if ('jest' in deps) return 'npx jest --passWithNoTests'
  if ('mocha' in deps) return 'npx mocha'
  return undefined
}

function pickLint(scripts: Record<string, string>, deps: Record<string, string>): string | undefined {
  if (validScript(scripts['lint'])) return 'npm run lint'
  if ('@biomejs/biome' in deps || 'biome' in deps) return 'npx biome lint .'
  if ('eslint' in deps) return 'npx eslint .'
  return undefined
}

function validScript(script: string | undefined): string | undefined {
  if (!script) return undefined
  const t = script.trim()
  if (t.startsWith('echo') || t.startsWith('exit')) return undefined
  return t
}
