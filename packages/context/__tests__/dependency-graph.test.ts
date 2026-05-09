import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TypeScriptAdapter, GenericAdapter } from '@kova/adapters'
import { DependencyGraph } from '../src/dependency-graph'

let tmpDir = ''

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-graph-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

describe('DependencyGraph', () => {
  it('deve resolver imports relativos entre arquivos TS', async () => {
    const root = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), `import { helper } from './utils'`)
    writeFileSync(join(root, 'src', 'utils.ts'), `export function helper() {}`)

    const graph = new DependencyGraph()
    await graph.build(root, TypeScriptAdapter)

    const deps = graph.directDependencies('src/app.ts')
    expect(deps).toContain('src/utils.ts')
  })

  it('deve construir dependentes reversos', async () => {
    const root = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), `import { x } from './shared'`)
    writeFileSync(join(root, 'src', 'lib.ts'), `import { x } from './shared'`)
    writeFileSync(join(root, 'src', 'shared.ts'), `export const x = 1`)

    const graph = new DependencyGraph()
    await graph.build(root, TypeScriptAdapter)

    const dependents = graph.dependents('src/shared.ts')
    expect(dependents).toContain('src/app.ts')
    expect(dependents).toContain('src/lib.ts')
  })

  it('deve ignorar imports de packages externos', async () => {
    const root = setup()
    writeFileSync(join(root, 'app.ts'), `import { x } from '@kova/shared'\nimport fs from 'node:fs'`)

    const graph = new DependencyGraph()
    await graph.build(root, TypeScriptAdapter)

    expect(graph.directDependencies('app.ts')).toHaveLength(0)
  })

  it('deve incluir deps externas quando solicitado', async () => {
    const root = setup()
    writeFileSync(join(root, 'app.ts'), `import { x } from '@kova/shared'\nimport fs from 'node:fs'`)

    const graph = new DependencyGraph()
    await graph.build(root, TypeScriptAdapter, { includeExternal: true })

    expect(graph.directDependencies('app.ts')).toContain('external:@kova/shared')
    expect(graph.directDependencies('app.ts')).toContain('external:node:fs')
  })

  it('deve retornar grafo vazio com GenericAdapter (parseImports retorna [])', async () => {
    const root = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'main.cpp'), `#include "utils.h"`)

    const graph = new DependencyGraph()
    await graph.build(root, GenericAdapter)

    // GenericAdapter retorna [] — grafo vazio, sem crash
    expect(graph.directDependencies('src/main.cpp')).toHaveLength(0)
    expect(graph.fullGraph().size).toBe(0)
  })

  it('deve retornar array vazio para arquivo sem deps', async () => {
    const root = setup()
    writeFileSync(join(root, 'standalone.ts'), `export const x = 1`)

    const graph = new DependencyGraph()
    await graph.build(root, TypeScriptAdapter)

    expect(graph.directDependencies('standalone.ts')).toHaveLength(0)
    expect(graph.dependents('standalone.ts')).toHaveLength(0)
  })

  it('fullGraph deve retornar mapa completo', async () => {
    const root = setup()
    writeFileSync(join(root, 'a.ts'), `import { b } from './b'`)
    writeFileSync(join(root, 'b.ts'), `export const b = 1`)

    const graph = new DependencyGraph()
    await graph.build(root, TypeScriptAdapter)

    const full = graph.fullGraph()
    expect(full.has('a.ts')).toBe(true)
  })
})
