import { existsSync, readFileSync } from 'node:fs'
import { join, dirname, resolve, extname } from 'node:path'
import fg from 'fast-glob'
import type { StackAdapter } from '@kova/shared'

const SOURCE_GLOBS = ['**/*.{ts,tsx,js,jsx,py,go,rs}']
const IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.kova/**']
const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs']
const EXTERNAL_PREFIX = 'external:'

export interface DependencyGraphBuildOptions {
  includeExternal?: boolean
}

export class DependencyGraph {
  private readonly deps = new Map<string, string[]>()    // file → o que importa
  private readonly rdeps = new Map<string, string[]>()   // file → quem importa ele

  async build(
    projectRoot: string,
    adapter: StackAdapter,
    options: DependencyGraphBuildOptions = {},
  ): Promise<void> {
    const files = await fg(SOURCE_GLOBS, { cwd: projectRoot, ignore: IGNORE })

    for (const relPath of files) {
      const fullPath = join(projectRoot, relPath)
      let content: string
      try {
        content = readFileSync(fullPath, 'utf-8')
      } catch {
        continue // arquivo ilegível não bloqueia o grafo
      }

      const imports = adapter.parseImports(relPath, content)
      const resolved = imports
        .map(imp => resolveImport(imp, relPath, projectRoot, options))
        .filter((p): p is string => p !== null)

      this.deps.set(relPath, resolved)
      for (const dep of resolved) {
        const existing = this.rdeps.get(dep) ?? []
        this.rdeps.set(dep, [...existing, relPath])
      }
    }
  }

  directDependencies(file: string): string[] {
    return this.deps.get(file) ?? []
  }

  dependents(file: string): string[] {
    return this.rdeps.get(file) ?? []
  }

  fullGraph(): Map<string, string[]> {
    return new Map(this.deps)
  }
}

function resolveImport(
  importPath: string,
  fromFile: string,
  projectRoot: string,
  options: DependencyGraphBuildOptions,
): string | null {
  // Ignora imports de packages externos (não começam com . ou /)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return options.includeExternal ? `${EXTERNAL_PREFIX}${packageName(importPath)}` : null
  }

  const fromDir = dirname(join(projectRoot, fromFile))
  const base = resolve(fromDir, importPath)

  // Tenta com extensão já incluída
  if (existsSync(base) && extname(base)) {
    return toRelative(base, projectRoot)
  }

  // Tenta adicionar extensões comuns
  for (const ext of RESOLVE_EXTS) {
    if (existsSync(base + ext)) return toRelative(base + ext, projectRoot)
  }

  // Tenta index file
  for (const ext of RESOLVE_EXTS) {
    const idx = join(base, `index${ext}`)
    if (existsSync(idx)) return toRelative(idx, projectRoot)
  }

  return null
}

function packageName(importPath: string): string {
  if (importPath.startsWith('@')) {
    const [scope, name] = importPath.split('/')
    return name ? `${scope}/${name}` : importPath
  }
  return importPath.split('/')[0]
}

function toRelative(absPath: string, projectRoot: string): string {
  // Normaliza para forward-slashes independente do OS
  const abs = absPath.replace(/\\/g, '/')
  const root = projectRoot.replace(/\\/g, '/')
  return abs.startsWith(root + '/') ? abs.slice(root.length + 1) : abs
}
