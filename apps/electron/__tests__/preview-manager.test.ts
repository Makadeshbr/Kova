import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPreviewWorkspace } from '../src/main/preview-manager'

let projectRoot = ''

afterEach(() => {
  if (projectRoot) rmSync(projectRoot, { recursive: true, force: true })
  projectRoot = ''
})

describe('preview workspace', () => {
  it('materializes pending changes without copying generated or dangerous directories', () => {
    projectRoot = join(tmpdir(), `kova-preview-${Date.now()}`)
    mkdirSync(join(projectRoot, 'src'), { recursive: true })
    mkdirSync(join(projectRoot, '.git'), { recursive: true })
    mkdirSync(join(projectRoot, 'node_modules/pkg'), { recursive: true })
    mkdirSync(join(projectRoot, 'dist'), { recursive: true })
    mkdirSync(join(projectRoot, 'out'), { recursive: true })
    mkdirSync(join(projectRoot, '.kova/sessions'), { recursive: true })
    writeFileSync(join(projectRoot, 'src/app.ts'), 'old', 'utf-8')
    writeFileSync(join(projectRoot, '.git/config'), 'secret', 'utf-8')
    writeFileSync(join(projectRoot, 'node_modules/pkg/index.js'), 'module', 'utf-8')
    writeFileSync(join(projectRoot, 'dist/app.js'), 'bundle', 'utf-8')
    writeFileSync(join(projectRoot, 'out/app.js'), 'bundle', 'utf-8')
    writeFileSync(join(projectRoot, '.kova/sessions/state.json'), '{}', 'utf-8')

    const preview = createPreviewWorkspace(projectRoot, [
      { path: 'src/app.ts', type: 'modify', diff: 'new' },
      { path: 'src/new.ts', type: 'create', diff: 'created' },
    ], 'task-1')

    expect(preview.root).toContain(join(projectRoot, '.kova', 'preview'))
    expect(readFileSync(join(preview.root, 'src/app.ts'), 'utf-8')).toBe('new')
    expect(readFileSync(join(preview.root, 'src/new.ts'), 'utf-8')).toBe('created')
    expect(existsSync(join(preview.root, '.git'))).toBe(false)
    expect(existsSync(join(preview.root, 'node_modules'))).toBe(false)
    expect(existsSync(join(preview.root, 'dist'))).toBe(false)
    expect(existsSync(join(preview.root, 'out'))).toBe(false)
    expect(existsSync(join(preview.root, '.kova/sessions'))).toBe(false)
  })
})
