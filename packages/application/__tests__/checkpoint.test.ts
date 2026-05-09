import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createCheckpoint, restoreCheckpoint, listCheckpoints, deleteCheckpoint } from '../src/checkpoint'

let tmpDir = ''

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-checkpoint-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

describe('createCheckpoint', () => {
  it('deve salvar meta.json com taskId e timestamp', () => {
    const root = setup()
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src', 'app.ts'), 'const x = 1')

    const meta = createCheckpoint({ taskId: 'task-1', files: ['src/app.ts'], projectRoot: root })

    expect(meta.taskId).toBe('task-1')
    expect(meta.id).toBeTruthy()
    expect(meta.timestamp).toBeTruthy()
    expect(meta.harnessScore).toBe(0)
    expect(meta.files).toEqual(['src/app.ts'])
  })

  it('deve copiar conteúdo dos arquivos para o checkpoint', () => {
    const root = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), 'original content')

    const meta = createCheckpoint({ taskId: 'task-1', files: ['src/app.ts'], projectRoot: root })

    const saved = readFileSync(join(root, '.kova', 'checkpoints', meta.id, 'files', 'src', 'app.ts'), 'utf-8')
    expect(saved).toBe('original content')
  })

  it('deve ignorar arquivos que não existem', () => {
    const root = setup()
    const meta = createCheckpoint({ taskId: 't1', files: ['nao-existe.ts'], projectRoot: root })
    expect(meta.files).toEqual(['nao-existe.ts'])
  })

  it('deve salvar harnessScore no meta', () => {
    const root = setup()
    const meta = createCheckpoint({ taskId: 't1', files: [], projectRoot: root, harnessScore: 87 })
    expect(meta.harnessScore).toBe(87)
  })
})

describe('restoreCheckpoint', () => {
  it('deve restaurar conteúdo original do arquivo', () => {
    const root = setup()
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'app.ts'), 'original')

    const meta = createCheckpoint({ taskId: 't1', files: ['src/app.ts'], projectRoot: root })

    writeFileSync(join(root, 'src', 'app.ts'), 'modified by agent')
    restoreCheckpoint(meta.id, root)

    expect(readFileSync(join(root, 'src', 'app.ts'), 'utf-8')).toBe('original')
  })

  it('deve lançar erro se checkpoint não existe', () => {
    const root = setup()
    expect(() => restoreCheckpoint('id-inexistente', root)).toThrow('não encontrado')
  })
})

describe('listCheckpoints', () => {
  it('deve retornar array vazio quando não há checkpoints', () => {
    const root = setup()
    expect(listCheckpoints(root)).toEqual([])
  })

  it('deve retornar checkpoints ordenados por timestamp', () => {
    const root = setup()
    const m1 = createCheckpoint({ taskId: 't1', files: [], projectRoot: root })
    const m2 = createCheckpoint({ taskId: 't2', files: [], projectRoot: root })

    const list = listCheckpoints(root)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe(m1.id)
    expect(list[1].id).toBe(m2.id)
  })
})

describe('deleteCheckpoint', () => {
  it('deve remover o diretório do checkpoint', () => {
    const root = setup()
    const meta = createCheckpoint({ taskId: 't1', files: [], projectRoot: root })
    const dir = join(root, '.kova', 'checkpoints', meta.id)

    expect(existsSync(dir)).toBe(true)
    deleteCheckpoint(meta.id, root)
    expect(existsSync(dir)).toBe(false)
  })

  it('não deve lançar erro se checkpoint não existe', () => {
    const root = setup()
    expect(() => deleteCheckpoint('id-inexistente', root)).not.toThrow()
  })
})
