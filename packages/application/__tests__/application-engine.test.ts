import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { FileChange } from '@kova/shared'
import { CodeApplicationEngine } from '../src/application-engine'

let tmpDir = ''

function setup(): { root: string; engine: CodeApplicationEngine } {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-engine-'))
  return { root: tmpDir, engine: new CodeApplicationEngine(tmpDir) }
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

describe('preview', () => {
  it('deve retornar diff formatado para modify', () => {
    const { engine } = setup()
    const changes: FileChange[] = [{
      path: 'src/app.ts',
      type: 'modify',
      diff: 'const x = 2',
      before: 'const x = 1',
    }]
    const result = engine.preview(changes)
    expect(result).toContain('[MODIFY] src/app.ts')
    expect(result).toContain('- const x = 1')
    expect(result).toContain('+ const x = 2')
  })

  it('deve indicar deleção para type delete', () => {
    const { engine } = setup()
    const changes: FileChange[] = [{ path: 'old.ts', type: 'delete', diff: '' }]
    const result = engine.preview(changes)
    expect(result).toContain('[DELETE] old.ts')
    expect(result).toContain('será deletado')
  })

  it('deve mostrar conteúdo para create sem before', () => {
    const { engine } = setup()
    const changes: FileChange[] = [{ path: 'new.ts', type: 'create', diff: 'export const x = 1' }]
    const result = engine.preview(changes)
    expect(result).toContain('[CREATE] new.ts')
    expect(result).toContain('export const x = 1')
  })
})

describe('apply', () => {
  it('deve criar arquivo novo', async () => {
    const { root, engine } = setup()
    const changes: FileChange[] = [{ path: 'src/new.ts', type: 'create', diff: 'export const x = 1' }]
    const result = await engine.apply(changes, 'task-1')

    expect(result.applied).toBe(true)
    expect(result.checkpointId).toBeTruthy()
    expect(result.patches).toHaveLength(1)
    expect(readFileSync(join(root, 'src', 'new.ts'), 'utf-8')).toBe('export const x = 1')
  })

  it('deve modificar arquivo existente', async () => {
    const { root, engine } = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), 'const x = 1')

    const changes: FileChange[] = [{
      path: 'src/app.ts', type: 'modify',
      diff: 'const x = 2', before: 'const x = 1',
    }]
    const result = await engine.apply(changes, 'task-1')

    expect(result.applied).toBe(true)
    expect(readFileSync(join(root, 'src', 'app.ts'), 'utf-8')).toBe('const x = 2')
  })

  it('deve deletar arquivo', async () => {
    const { root, engine } = setup()
    writeFileSync(join(root, 'old.ts'), 'content')

    const result = await engine.apply([{ path: 'old.ts', type: 'delete', diff: '' }], 'task-1')

    expect(result.applied).toBe(true)
    expect(existsSync(join(root, 'old.ts'))).toBe(false)
  })

  it('deve bloquear com human_required quando arquivo é safe zone', async () => {
    const { engine } = setup()
    const changes: FileChange[] = [{ path: '.env', type: 'modify', diff: 'SECRET=new' }]
    const result = await engine.apply(changes, 'task-1')

    expect(result.applied).toBe(false)
    expect(result.reason).toContain('human_required')
    expect(result.reason).toContain('.env')
  })

  it('deve bloquear com human_required quando arquivo foi modificado externamente', async () => {
    const { root, engine } = setup()
    writeFileSync(join(root, 'src.ts'), 'changed by user')

    const changes: FileChange[] = [{
      path: 'src.ts', type: 'modify',
      diff: 'agent version', before: 'original before agent',
    }]
    const result = await engine.apply(changes, 'task-1')

    expect(result.applied).toBe(false)
    expect(result.reason).toContain('human_required')
    expect(result.reason).toContain('modificado externamente')
  })

  it('deve criar checkpoint antes de aplicar', async () => {
    const { root, engine } = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), 'original')

    const changes: FileChange[] = [{
      path: 'src/app.ts', type: 'modify',
      diff: 'modified', before: 'original',
    }]
    const result = await engine.apply(changes, 'task-1', 85)

    const id = result.checkpointId.replace('kova:', '')
    const checkpointDir = join(root, '.kova', 'checkpoints', id)
    expect(existsSync(checkpointDir)).toBe(true)
  })

  it('deve reverter automaticamente se apply falhar', async () => {
    const { root, engine } = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), 'original')

    // Arquivo em diretório não-criável para forçar erro
    const changes: FileChange[] = [
      { path: 'src/app.ts', type: 'modify', diff: 'ok change', before: 'original' },
      { path: '\x00/invalid', type: 'create', diff: 'content' },
    ]

    await expect(engine.apply(changes, 'task-1')).rejects.toThrow('Apply failed')
    expect(readFileSync(join(root, 'src', 'app.ts'), 'utf-8')).toBe('original')
  })
})

describe('rollback', () => {
  it('deve restaurar arquivo ao estado do checkpoint', async () => {
    const { root, engine } = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), 'before apply')

    const changes: FileChange[] = [{
      path: 'src/app.ts', type: 'modify',
      diff: 'after apply', before: 'before apply',
    }]
    const result = await engine.apply(changes, 'task-1')
    expect(readFileSync(join(root, 'src', 'app.ts'), 'utf-8')).toBe('after apply')

    await engine.rollback(result.checkpointId)
    expect(readFileSync(join(root, 'src', 'app.ts'), 'utf-8')).toBe('before apply')
  })

  it('deve lançar erro para checkpoint inexistente', async () => {
    const { engine } = setup()
    await expect(engine.rollback('nao-existe')).rejects.toThrow()
  })
})
