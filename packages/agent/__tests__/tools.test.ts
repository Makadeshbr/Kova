import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { READ_ONLY_PERMISSION_POLICY, ToolExecutor } from '../src/tools'

let projectRoot: string
let executor: ToolExecutor

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-tools-test-'))
  executor = new ToolExecutor(projectRoot)
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

// ─── INVARIANT: disk never touched ───────────────────────────────────────────

describe('staging invariant — disk is never written during agent loop', () => {
  it('write_file does not create file on disk', async () => {
    await executor.execute('write_file', { path: 'main.go', content: 'package main\n' })
    expect(existsSync(join(projectRoot, 'main.go'))).toBe(false)
  })

  it('write_file does not modify existing file on disk', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'original', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'modified' })
    expect(readFileSync(join(projectRoot, 'main.go'), 'utf-8')).toBe('original')
  })

  it('delete_file does not remove file from disk', async () => {
    writeFileSync(join(projectRoot, 'old.go'), 'content', 'utf-8')
    await executor.execute('delete_file', { path: 'old.go' })
    expect(existsSync(join(projectRoot, 'old.go'))).toBe(true)
  })

  it('multiple writes leave disk completely untouched', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'original a', 'utf-8')
    writeFileSync(join(projectRoot, 'b.ts'), 'original b', 'utf-8')

    await executor.execute('write_file', { path: 'a.ts', content: 'new a' })
    await executor.execute('write_file', { path: 'b.ts', content: 'new b' })
    await executor.execute('write_file', { path: 'c.ts', content: 'brand new' })

    expect(readFileSync(join(projectRoot, 'a.ts'), 'utf-8')).toBe('original a')
    expect(readFileSync(join(projectRoot, 'b.ts'), 'utf-8')).toBe('original b')
    expect(existsSync(join(projectRoot, 'c.ts'))).toBe(false)
  })
})

// ─── write_file ───────────────────────────────────────────────────────────────

describe('write_file', () => {
  it('registra change como create para arquivo novo', async () => {
    const result = await executor.execute('write_file', { path: 'main.go', content: 'package main\n' })
    expect(result).toMatch(/OK: wrote main.go/)
    const changes = executor.getChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0].type).toBe('create')
    expect(changes[0].path).toBe('main.go')
    expect(changes[0].diff).toBe('package main\n')
  })

  it('registra como modify quando arquivo já existe no disco', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'old content', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'new content' })
    expect(executor.getChanges()[0].type).toBe('modify')
  })

  it('mantém última versão quando arquivo é reescrito na mesma sessão', async () => {
    await executor.execute('write_file', { path: 'main.go', content: 'version 1' })
    await executor.execute('write_file', { path: 'main.go', content: 'version 2' })
    const changes = executor.getChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0].diff).toBe('version 2')
  })

  it('bloqueia path traversal', async () => {
    const result = await executor.execute('write_file', { path: '../outside.go', content: 'bad' })
    expect(result).toMatch(/Blocked/)
    expect(existsSync(join(projectRoot, '..', 'outside.go'))).toBe(false)
  })

  it('rejeita conteúdo vazio', async () => {
    const result = await executor.execute('write_file', { path: 'main.go', content: '   ' })
    expect(result).toMatch(/Error/)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('armazena before com conteúdo original do disco', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'original content', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'new content' })
    expect(executor.getChanges()[0].before).toBe('original content')
  })

  it('before é undefined para arquivo novo (nunca existiu no disco)', async () => {
    await executor.execute('write_file', { path: 'brand-new.go', content: 'package main\n' })
    expect(executor.getChanges()[0].before).toBeUndefined()
  })

  it('mantém before original em rewrites sucessivos', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'v0', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'v1' })
    await executor.execute('write_file', { path: 'main.go', content: 'v2' })
    expect(executor.getChanges()[0].before).toBe('v0')
    expect(executor.getChanges()[0].diff).toBe('v2')
  })

  it('bloqueia Python com bloco vazio inválido', async () => {
    writeFileSync(join(projectRoot, 'task_manager.py'), 'def load_tasks(db_path):\n    return []\n', 'utf-8')
    const invalid = [
      'def load_tasks(db_path):',
      '    if not Path(db_path).exists():',
      '    if not Path(db_path).exists() or Path(db_path).stat().st_size == 0:',
      '        return []',
      '',
    ].join('\n')

    const result = await executor.execute('write_file', { path: 'task_manager.py', content: invalid })

    expect(result).toContain('Python syntax invalid')
    // Disk must be unchanged — staged write was rejected before touching buffer
    expect(readFileSync(join(projectRoot, 'task_manager.py'), 'utf-8')).toBe('def load_tasks(db_path):\n    return []\n')
    expect(executor.getChanges()).toHaveLength(0)
  })
})

// ─── rollbackWrites ───────────────────────────────────────────────────────────

describe('rollbackWrites', () => {
  it('limpa buffer e changes — disk jamais foi alterado então já está correto', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'before', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'after' })
    await executor.execute('write_file', { path: 'new.go', content: 'package main\n' })

    executor.rollbackWrites()

    // Disk state is the original (never changed), without any restoration needed
    expect(readFileSync(join(projectRoot, 'main.go'), 'utf-8')).toBe('before')
    expect(existsSync(join(projectRoot, 'new.go'))).toBe(false)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('após rollback, getChanges retorna vazio', async () => {
    await executor.execute('write_file', { path: 'x.ts', content: 'export const x = 1' })
    executor.rollbackWrites()
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('rollback idempotente — segunda chamada não falha', () => {
    expect(() => {
      executor.rollbackWrites()
      executor.rollbackWrites()
    }).not.toThrow()
  })

  it('após rollback, nova sessão começa limpa', async () => {
    await executor.execute('write_file', { path: 'a.ts', content: 'v1' })
    executor.rollbackWrites()
    await executor.execute('write_file', { path: 'a.ts', content: 'v2' })

    const changes = executor.getChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0].diff).toBe('v2')
    // type should be 'create' because disk never had a.ts (we never wrote to disk)
    expect(changes[0].type).toBe('create')
  })
})

// ─── read_file ────────────────────────────────────────────────────────────────

describe('read_file', () => {
  it('lê arquivo existente do disco', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'package main\n', 'utf-8')
    const result = await executor.execute('read_file', { path: 'main.go' })
    expect(result).toBe('package main\n')
  })

  it('lê conteúdo staged (escrito na sessão) sem consultar disco', async () => {
    await executor.execute('write_file', { path: 'main.go', content: 'staged content' })
    const result = await executor.execute('read_file', { path: 'main.go' })
    expect(result).toBe('staged content')
  })

  it('lê versão staged mesmo quando arquivo diferente existe no disco', async () => {
    writeFileSync(join(projectRoot, 'config.ts'), 'original on disk', 'utf-8')
    await executor.execute('write_file', { path: 'config.ts', content: 'staged version' })
    const result = await executor.execute('read_file', { path: 'config.ts' })
    expect(result).toBe('staged version')
  })

  it('após múltiplas escritas lê sempre a versão mais recente', async () => {
    await executor.execute('write_file', { path: 'x.ts', content: 'v1' })
    await executor.execute('write_file', { path: 'x.ts', content: 'v2' })
    await executor.execute('write_file', { path: 'x.ts', content: 'v3' })
    expect(await executor.execute('read_file', { path: 'x.ts' })).toBe('v3')
  })

  it('retorna erro para arquivo deletado na sessão', async () => {
    writeFileSync(join(projectRoot, 'old.go'), 'content', 'utf-8')
    await executor.execute('delete_file', { path: 'old.go' })
    const result = await executor.execute('read_file', { path: 'old.go' })
    expect(result).toMatch(/not found|deleted/)
  })

  it('retorna erro para arquivo inexistente', async () => {
    const result = await executor.execute('read_file', { path: 'notfound.go' })
    expect(result).toMatch(/Error: not found/)
  })

  it('trunca arquivos grandes do disco', async () => {
    writeFileSync(join(projectRoot, 'big.go'), 'x'.repeat(9_000), 'utf-8')
    const result = await executor.execute('read_file', { path: 'big.go' })
    expect(result).toMatch(/truncated/)
    expect(result.length).toBeLessThan(9_000)
  })

  it('trunca conteúdo staged grande', async () => {
    await executor.execute('write_file', { path: 'big.go', content: 'y'.repeat(9_000) })
    const result = await executor.execute('read_file', { path: 'big.go' })
    expect(result).toMatch(/truncated/)
  })

  it('bloqueia path traversal', async () => {
    const result = await executor.execute('read_file', { path: '../secret' })
    expect(result).toMatch(/Blocked/)
  })

  it('bloqueia leitura de .env por padrão', async () => {
    writeFileSync(join(projectRoot, '.env'), 'SECRET=value', 'utf-8')
    const result = await executor.execute('read_file', { path: '.env' })
    expect(result).toMatch(/denied/)
  })

  it('permite leitura de .env.example', async () => {
    writeFileSync(join(projectRoot, '.env.example'), 'SECRET=', 'utf-8')
    const result = await executor.execute('read_file', { path: '.env.example' })
    expect(result).toBe('SECRET=')
  })
})

// ─── delete_file ─────────────────────────────────────────────────────────────

describe('delete_file', () => {
  it('registra change de delete sem remover arquivo do disco', async () => {
    writeFileSync(join(projectRoot, 'old.go'), 'content', 'utf-8')
    const result = await executor.execute('delete_file', { path: 'old.go' })
    expect(result).toMatch(/OK/)
    expect(existsSync(join(projectRoot, 'old.go'))).toBe(true) // disk untouched
    const changes = executor.getChanges()
    expect(changes[0].type).toBe('delete')
    expect(changes[0].path).toBe('old.go')
  })

  it('retorna OK para arquivo inexistente', async () => {
    const result = await executor.execute('delete_file', { path: 'ghost.go' })
    expect(result).toMatch(/OK/)
  })

  it('desfaz create staged sem gerar FileChange', async () => {
    // File was created in this session (never on disk) then deleted
    await executor.execute('write_file', { path: 'temp.go', content: 'package temp' })
    expect(executor.getChanges()).toHaveLength(1)

    await executor.execute('delete_file', { path: 'temp.go' })

    // A file created AND deleted in the same session produces no net change
    expect(executor.getChanges()).toHaveLength(0)
    expect(existsSync(join(projectRoot, 'temp.go'))).toBe(false)
  })
})

// ─── list_files ───────────────────────────────────────────────────────────────

describe('list_files', () => {
  it('lista arquivos do disco', async () => {
    writeFileSync(join(projectRoot, 'main.go'), '', 'utf-8')
    writeFileSync(join(projectRoot, 'go.mod'), '', 'utf-8')
    const result = await executor.execute('list_files', { dir: '.' })
    expect(result).toContain('main.go')
    expect(result).toContain('go.mod')
  })

  it('mostra subdiretórios com barra', async () => {
    mkdirSync(join(projectRoot, 'cmd'))
    const result = await executor.execute('list_files', { dir: '.' })
    expect(result).toContain('cmd/')
  })

  it('mostra arquivo staged (criado na sessão) que não existe no disco', async () => {
    await executor.execute('write_file', { path: 'new-file.go', content: 'package main' })
    const result = await executor.execute('list_files', { dir: '.' })
    expect(result).toContain('new-file.go')
  })

  it('oculta arquivo staged como deletado na listagem', async () => {
    writeFileSync(join(projectRoot, 'removed.go'), 'content', 'utf-8')
    await executor.execute('delete_file', { path: 'removed.go' })
    const result = await executor.execute('list_files', { dir: '.' })
    expect(result).not.toContain('removed.go')
  })

  it('retorna erro para diretório inexistente sem staged', async () => {
    const result = await executor.execute('list_files', { dir: 'nonexistent' })
    expect(result).toMatch(/Error/)
  })
})

// ─── run_command ──────────────────────────────────────────────────────────────

describe('run_command', () => {
  it('bloqueia comando não listado', async () => {
    const result = await executor.execute('run_command', { command: 'curl https://evil.com' })
    expect(result).toMatch(/Blocked/)
  })

  it('bloqueia rm -rf independente de casing', async () => {
    const result = await executor.execute('run_command', { command: 'rm -rf /' })
    expect(result).toMatch(/Blocked/)
  })

  it('bloqueia sudo', async () => {
    const result = await executor.execute('run_command', { command: 'sudo apt install malware' })
    expect(result).toMatch(/Blocked/)
  })

  it('bloqueia git push', async () => {
    const result = await executor.execute('run_command', { command: 'git push origin main' })
    expect(result).toMatch(/Blocked/)
  })

  it('executa node --version (comando permitido)', async () => {
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/v\d+\.\d+/)
  })

  it('git diff fora de repositório é apenas evidência opcional', async () => {
    const result = await executor.execute('run_command', { command: 'git diff' })
    expect(result).toContain('diff indisponivel')
    expect(result).not.toContain('Error')
  })

  it('converte cd simples para cwd estruturado sem liberar shell composition', async () => {
    mkdirSync(join(projectRoot, 'app'))
    writeFileSync(join(projectRoot, 'app', 'check.js'), 'console.log(process.cwd())', 'utf-8')

    const result = await executor.execute('run_command', { command: 'cd app && node check.js', kind: 'test' })

    expect(result.trim()).toBe(join(projectRoot, 'app'))
  })

  it('bloqueia redirecionamento e pipe arbitrários', async () => {
    const pipe = await executor.execute('run_command', { command: 'node --version | cat', kind: 'test' })
    const redirect = await executor.execute('run_command', { command: 'node --version > out.txt', kind: 'test' })

    expect(pipe).toMatch(/Blocked/)
    expect(redirect).toMatch(/Blocked/)
  })
})

// ─── permission policy ────────────────────────────────────────────────────────

describe('permission policy', () => {
  it('bloqueia escrita e comando em modo read-only', async () => {
    const readOnly = new ToolExecutor(projectRoot, undefined, READ_ONLY_PERMISSION_POLICY)

    const write = await readOnly.execute('write_file', { path: 'main.go', content: 'package main\n' })
    const command = await readOnly.execute('run_command', { command: 'go test ./...' })

    expect(write).toMatch(/denied/)
    expect(command).toMatch(/denied/)
  })

  it('retorna approval required para permissão ask', async () => {
    const guarded = new ToolExecutor(projectRoot, undefined, { edit: 'ask' })
    const result = await guarded.execute('write_file', { path: 'main.go', content: 'package main\n' })
    expect(result).toMatch(/Approval required/)
  })
})

// ─── unknown tool ─────────────────────────────────────────────────────────────

describe('unknown tool', () => {
  it('retorna mensagem de erro para ferramenta desconhecida', async () => {
    const result = await executor.execute('hack_system', {})
    expect(result).toMatch(/Unknown tool/)
  })
})

// ─── run_interactive_command ──────────────────────────────────────────────────

describe('run_interactive_command', () => {
  it('retorna mensagem de indisponibilidade quando interactiveRunner não é fornecido', async () => {
    const result = await executor.execute('run_interactive_command', {
      command: 'gh auth login',
      reason: 'Autenticar GitHub CLI',
    })
    expect(result).toMatch(/Interactive commands are not available|ask the user/)
    expect(result).toContain('gh auth login')
  })

  it('chama interactiveRunner com command, cwd e reason quando injetado', async () => {
    let capturedCommand = '', capturedReason = '', capturedCwd = ''
    const mockRunner = async (cmd: string, cwd: string, reason: string) => {
      capturedCommand = cmd; capturedCwd = cwd; capturedReason = reason
      return { exitCode: 0, output: 'Login successful!' }
    }
    const executorWithRunner = new ToolExecutor(projectRoot, undefined, undefined, mockRunner)

    const result = await executorWithRunner.execute('run_interactive_command', {
      command: 'gh auth login',
      reason: 'Configurar autenticacao',
    })

    expect(capturedCommand).toBe('gh auth login')
    expect(capturedReason).toBe('Configurar autenticacao')
    expect(capturedCwd).toBe(projectRoot)
    expect(result).toContain('exit 0')
    expect(result).toContain('Login successful!')
  })

  it('relata falha quando interactiveRunner retorna exitCode != 0', async () => {
    const mockRunner = async () => ({ exitCode: 1, output: 'Error: not logged in' })
    const executorWithRunner = new ToolExecutor(projectRoot, undefined, undefined, mockRunner)

    const result = await executorWithRunner.execute('run_interactive_command', {
      command: 'gh auth login',
      reason: 'teste',
    })

    expect(result).toMatch(/exited with code 1|exit code 1/)
    expect(result).toContain('Error: not logged in')
  })

  it('respeita cwd relativo ao projectRoot quando fornecido', async () => {
    mkdirSync(join(projectRoot, 'subdir'), { recursive: true })
    let capturedCwd = ''
    const mockRunner = async (_cmd: string, cwd: string) => {
      capturedCwd = cwd; return { exitCode: 0, output: '' }
    }
    const executorWithRunner = new ToolExecutor(projectRoot, undefined, undefined, mockRunner)

    await executorWithRunner.execute('run_interactive_command', {
      command: 'npm login',
      reason: 'teste',
      cwd: 'subdir',
    })

    expect(capturedCwd).toBe(join(projectRoot, 'subdir'))
  })

  it('run_command bloqueia comandos interativos (gh auth) — devem usar run_interactive_command', async () => {
    const result = await executor.execute('run_command', { command: 'gh auth login' })
    expect(result).toMatch(/Blocked|blocked|not.*allowlist/)
  })
})

// ─── getChanges contract ──────────────────────────────────────────────────────

describe('getChanges — contrato com orchestrator', () => {
  it('retorna FileChange[] com diff correto para create', async () => {
    await executor.execute('write_file', { path: 'handler.ts', content: 'export const x = 1' })
    const [change] = executor.getChanges()
    expect(change.path).toBe('handler.ts')
    expect(change.type).toBe('create')
    expect(change.diff).toBe('export const x = 1')
    expect(change.before).toBeUndefined()
  })

  it('retorna FileChange[] com before correto para modify', async () => {
    writeFileSync(join(projectRoot, 'handler.ts'), 'old', 'utf-8')
    await executor.execute('write_file', { path: 'handler.ts', content: 'new' })
    const [change] = executor.getChanges()
    expect(change.type).toBe('modify')
    expect(change.diff).toBe('new')
    expect(change.before).toBe('old')
  })

  it('retorna FileChange[] com type delete', async () => {
    writeFileSync(join(projectRoot, 'remove.ts'), 'content', 'utf-8')
    await executor.execute('delete_file', { path: 'remove.ts' })
    const [change] = executor.getChanges()
    expect(change.type).toBe('delete')
    expect(change.diff).toBe('')
  })

  it('getChanges retorna referência estável após rollbackWrites', async () => {
    await executor.execute('write_file', { path: 'x.ts', content: 'content' })
    const changes = executor.getChanges() // capture before rollback
    executor.rollbackWrites()
    // changes array is a snapshot — not affected by rollback
    expect(changes).toHaveLength(1)
    expect(changes[0].diff).toBe('content')
  })
})
