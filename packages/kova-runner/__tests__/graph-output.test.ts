import { describe, it, expect, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildGraphOutput } from '../src/graph-output'

let tmpDir = ''

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-runner-graph-'))
  writeFileSync(join(tmpDir, 'package.json'), '{}')
  mkdirSync(join(tmpDir, 'src', 'ui'), { recursive: true })
  mkdirSync(join(tmpDir, 'src', 'core'), { recursive: true })
  return tmpDir
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = ''
})

describe('buildGraphOutput', () => {
  it('agrega arquivos em módulos e preserva deps externas', async () => {
    const root = setup()
    writeFileSync(join(root, 'src', 'ui', 'view.ts'), `import { run } from '../core/run'\nimport d3 from 'd3-force'\nrun()`)
    writeFileSync(join(root, 'src', 'core', 'run.ts'), `export function run() {\n  return true\n}`)

    const graph = await buildGraphOutput(root)

    expect(graph.nodes).toContainEqual(expect.objectContaining({ id: 'src/ui', type: 'module' }))
    expect(graph.nodes).toContainEqual(expect.objectContaining({ id: 'src/core', type: 'module' }))
    expect(graph.nodes).toContainEqual(expect.objectContaining({ id: 'external:d3-force', type: 'external' }))
    expect(graph.links).toContainEqual({ source: 'src/ui', target: 'src/core' })
    expect(graph.links).toContainEqual({ source: 'src/ui', target: 'external:d3-force' })
  })
})
