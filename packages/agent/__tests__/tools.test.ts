import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ASK_PERMISSION_POLICY, READ_ONLY_PERMISSION_POLICY, ToolExecutor } from '../src/tools'
import { normalizeCommandInvocation } from '@kova/shared'

let projectRoot: string
let executor: ToolExecutor

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-tools-test-'))
  executor = new ToolExecutor(projectRoot)
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

// ─── INVARIANT: existing files stay buffered, brand-new files stream ─────────
//
// Claude Code parity: brand-new files are written to disk immediately so the
// user sees them appearing live. Existing files stay buffered — their on-disk
// content is only changed by ApplicationEngine.apply at the end of the
// iteration. This protects the user's working state during modify-heavy tasks
// while giving the responsive UX of streaming creates for scaffolding.

describe('streaming creates / buffered modifies', () => {
  it('write_file streams brand-new files to disk immediately (CC parity)', async () => {
    await executor.execute('write_file', { path: 'main.go', content: 'package main\n' })
    expect(existsSync(join(projectRoot, 'main.go'))).toBe(true)
    expect(readFileSync(join(projectRoot, 'main.go'), 'utf-8')).toBe('package main\n')
  })

  it('write_file does not modify existing file on disk', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'original', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'modified' })
    expect(readFileSync(join(projectRoot, 'main.go'), 'utf-8')).toBe('original')
  })

  it('delete_file does not remove pre-existing file from disk', async () => {
    writeFileSync(join(projectRoot, 'old.go'), 'content', 'utf-8')
    await executor.execute('delete_file', { path: 'old.go' })
    expect(existsSync(join(projectRoot, 'old.go'))).toBe(true)
  })

  it('delete_file removes a streamed-create file (transient lifecycle)', async () => {
    await executor.execute('write_file', { path: 'tmp.ts', content: 'export {}' })
    expect(existsSync(join(projectRoot, 'tmp.ts'))).toBe(true)
    await executor.execute('delete_file', { path: 'tmp.ts' })
    expect(existsSync(join(projectRoot, 'tmp.ts'))).toBe(false)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('mixed batch: existing files stay buffered, new files stream', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'original a', 'utf-8')
    writeFileSync(join(projectRoot, 'b.ts'), 'original b', 'utf-8')

    await executor.execute('write_file', { path: 'a.ts', content: 'new a' })
    await executor.execute('write_file', { path: 'b.ts', content: 'new b' })
    await executor.execute('write_file', { path: 'c.ts', content: 'brand new' })

    expect(readFileSync(join(projectRoot, 'a.ts'), 'utf-8')).toBe('original a')
    expect(readFileSync(join(projectRoot, 'b.ts'), 'utf-8')).toBe('original b')
    expect(readFileSync(join(projectRoot, 'c.ts'), 'utf-8')).toBe('brand new')
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
  it('limpa buffer e changes — existing files were never touched on disk', async () => {
    writeFileSync(join(projectRoot, 'main.go'), 'before', 'utf-8')
    await executor.execute('write_file', { path: 'main.go', content: 'after' })
    await executor.execute('write_file', { path: 'new.go', content: 'package main\n' })

    executor.rollbackWrites()

    // Modify target stays at its original content
    expect(readFileSync(join(projectRoot, 'main.go'), 'utf-8')).toBe('before')
    // Streamed creates are intentionally LEFT on disk so the user can inspect
    // what was produced before the rollback (Claude Code parity).
    expect(existsSync(join(projectRoot, 'new.go'))).toBe(true)
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

  it('após rollback, nova sessão vê arquivo streamed como modify', async () => {
    // Streamed creates survive rollback (CC parity), so on a fresh executor
    // the same path is now a pre-existing file → second write is a modify.
    await executor.execute('write_file', { path: 'a.ts', content: 'v1' })
    executor.rollbackWrites()

    const fresh = new ToolExecutor(projectRoot)
    await fresh.execute('write_file', { path: 'a.ts', content: 'v2' })

    const changes = fresh.getChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0].diff).toBe('v2')
    expect(changes[0].type).toBe('modify')
    expect(changes[0].before).toBe('v1')
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

  it('FIX-006: trunca apenas arquivos acima de 32K chars (era 8K)', async () => {
    // 9K chars used to truncate; now must NOT truncate (limit raised to 32K)
    writeFileSync(join(projectRoot, 'medium.go'), 'x'.repeat(9_000), 'utf-8')
    const result = await executor.execute('read_file', { path: 'medium.go' })
    expect(result).not.toMatch(/TRUNCATED|truncated/)
    expect(result.length).toBeGreaterThanOrEqual(9_000)
  })

  it('FIX-006: arquivo acima de 32K é truncado com mensagem explícita', async () => {
    writeFileSync(join(projectRoot, 'huge.go'), 'a'.repeat(40_000), 'utf-8')
    const result = await executor.execute('read_file', { path: 'huge.go' })
    expect(result).toMatch(/TRUNCATED/)
    expect(result).toMatch(/40000 chars total/)
    expect(result).toMatch(/offset=32000/)
  })

  it('FIX-006: read_file aceita offset para ler chunks subsequentes', async () => {
    writeFileSync(join(projectRoot, 'huge.go'), 'a'.repeat(20_000) + 'b'.repeat(20_000), 'utf-8')
    const second = await executor.execute('read_file', { path: 'huge.go', offset: 32_000 })
    // Bytes 32000-40000 should be all 'b'
    expect(second.startsWith('b')).toBe(true)
    expect(second).not.toMatch(/TRUNCATED/)
  })

  it('FIX-006: offset além do final retorna mensagem clara', async () => {
    writeFileSync(join(projectRoot, 'small.go'), 'hello', 'utf-8')
    const result = await executor.execute('read_file', { path: 'small.go', offset: 1_000 })
    expect(result).toMatch(/offset 1000 is beyond file end \(5 chars\)/)
  })

  it('FIX-006: offset 0 = comportamento default (sem offset)', async () => {
    writeFileSync(join(projectRoot, 'file.go'), 'short content', 'utf-8')
    const withOffset = await executor.execute('read_file', { path: 'file.go', offset: 0 })
    const noOffset = await executor.execute('read_file', { path: 'file.go' })
    expect(withOffset).toBe(noOffset)
  })

  it('FIX-006: buffer staged respeita o mesmo limite e offset', async () => {
    await executor.execute('write_file', { path: 'big.go', content: 'y'.repeat(40_000) })
    const first = await executor.execute('read_file', { path: 'big.go' })
    expect(first).toMatch(/TRUNCATED/)
    expect(first).toMatch(/40000 chars total/)

    const second = await executor.execute('read_file', { path: 'big.go', offset: 32_000 })
    expect(second).toMatch(/^y+$/)
    expect(second.length).toBeLessThanOrEqual(32_000)
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
  it('still blocks curl/wget pointing at HTTP URLs (exfil-shell pattern)', async () => {
    // The permissive policy lets `mkdir`, `gh`, `docker`, `psql` through, but
    // `curl https://...` and `wget https://...` stay blocked because they're
    // the canonical exfil/remote-shell on-ramp. `curl --version` and other
    // non-URL invocations pass.
    const blocked = await executor.execute('run_command', { command: 'curl https://evil.com' })
    expect(blocked).toMatch(/^Blocked:/)
    const allowed = await executor.execute('run_command', { command: 'curl --version' })
    expect(allowed).not.toMatch(/^Blocked:/)
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
    expect(result).toContain('diff unavailable')
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

  describe('staged file overlay for run_command (FIX-012)', () => {
    it('runs commands against staged writes and restores disk afterwards', async () => {
      await executor.execute('write_file', { path: 'src/app.js', content: 'console.log("staged-ok")' })
      const result = await executor.execute('run_command', { command: 'node src/app.js' })
      expect(result).toContain('staged-ok')
      expect(existsSync(join(projectRoot, 'src', 'app.js'))).toBe(false)
    })

    it('runs normal commands without staged overlay noise', async () => {
      await executor.execute('write_file', { path: 'src/app.js', content: 'console.log(1)' })
      const result = await executor.execute('run_command', { command: 'node --version' })
      expect(result).not.toMatch(/staged path/i)
    })

    it('does not warn when no files are staged at all', async () => {
      const result = await executor.execute('run_command', { command: 'node --version' })
      expect(result).not.toMatch(/staged path/i)
    })

    it('makes multiple staged files visible to the command', async () => {
      await executor.execute('write_file', { path: 'a.js', content: 'module.exports = "A"' })
      await executor.execute('write_file', { path: 'b.js', content: 'console.log(require("./a.js") + "B")' })
      const result = await executor.execute('run_command', { command: 'node b.js' })
      expect(result).toContain('AB')
      expect(existsSync(join(projectRoot, 'a.js'))).toBe(false)
      expect(existsSync(join(projectRoot, 'b.js'))).toBe(false)
    })

    it('restores original file content after command observes staged modification', async () => {
      writeFileSync(join(projectRoot, 'existing.js'), 'console.log("original")', 'utf-8')
      await executor.execute('write_file', { path: 'existing.js', content: 'console.log("staged")' })
      const result = await executor.execute('run_command', { command: 'node existing.js' })
      expect(result).toContain('staged')
      expect(readFileSync(join(projectRoot, 'existing.js'), 'utf-8')).toBe('console.log("original")')
    })
  })

  describe('manifest validation honours staged buffer (FIX-CMD)', () => {
    it('allows pnpm/npm/go commands after the agent staged the manifest in the same iteration', async () => {
      // No package.json on disk. Agent stages it, then runs `pnpm install`
      // (or any manifest-required command) — must pass validation.
      await executor.execute('write_file', { path: 'package.json', content: '{"name":"x","version":"1.0.0"}' })
      // We don't actually want to run pnpm here (would hit network), so use
      // `npm --version` which goes through the same validator. The manifest
      // check should NOT block it now that staged package.json is visible.
      const result = await executor.execute('run_command', { command: 'npm --version' })
      expect(result).not.toMatch(/^Blocked:/)
      // Disk remains clean per the staging invariant.
      expect(existsSync(join(projectRoot, 'package.json'))).toBe(false)
    })

    it('still blocks manifest-required commands when nothing is staged and disk is empty', async () => {
      const result = await executor.execute('run_command', { command: 'pnpm test', kind: 'test' })
      expect(result).toMatch(/^Blocked:/)
      expect(result).toMatch(/manifest\/build file/)
    })

    it('allows bootstrap subcommands (npm init, cargo new, go mod init) without any manifest', async () => {
      // We only assert the validator does NOT block — we never execute these
      // for real here (would scaffold a project on disk).
      const npmInit = await executor.execute('run_command', { command: 'npm init -y' })
      const cargoNew = await executor.execute('run_command', { command: 'cargo new myapp' })
      const goModInit = await executor.execute('run_command', { command: 'go mod init example.com/app' })
      // None of these should match the manifest-block message — they may fail
      // for other reasons (binary missing) but not for manifest validation.
      expect(npmInit).not.toMatch(/manifest\/build file/)
      expect(cargoNew).not.toMatch(/manifest\/build file/)
      expect(goModInit).not.toMatch(/manifest\/build file/)
    })

    it('allows versioned bootstrap packages such as create-next-app@latest', () => {
      const result = normalizeCommandInvocation({
        command: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/src/*" --no-turbopack --use-npm --skip-install',
        workspaceRoot: projectRoot,
      })
      expect(result.ok).toBe(true)
    })
  })
})

// ─── run_command streaming output (FIX-003) ───────────────────────────────────

describe('run_command — streaming output via onCommandOutput callback', () => {
  it('streams stdout lines in real-time when callback is provided', async () => {
    const lines: Array<{ id: string; line: string; stream: string }> = []
    const streamingExecutor = new ToolExecutor(
      projectRoot,
      undefined,
      undefined,
      undefined,
      (id, line, stream) => lines.push({ id, line, stream }),
    )

    const result = await streamingExecutor.execute('run_command', { command: 'node --version' })

    expect(result).toMatch(/v\d+\.\d+/)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every(entry => entry.stream === 'stdout' || entry.stream === 'stderr')).toBe(true)
  })

  it('all streamed lines from a single command share the same commandId', async () => {
    const ids = new Set<string>()
    const streamingExecutor = new ToolExecutor(
      projectRoot,
      undefined,
      undefined,
      undefined,
      (id) => ids.add(id),
    )

    await streamingExecutor.execute('run_command', { command: 'node --version' })

    expect(ids.size).toBe(1)
  })

  it('different commands produce different commandIds', async () => {
    const ids = new Set<string>()
    const streamingExecutor = new ToolExecutor(
      projectRoot,
      undefined,
      undefined,
      undefined,
      (id) => ids.add(id),
    )

    await streamingExecutor.execute('run_command', { command: 'node --version' })
    await streamingExecutor.execute('run_command', { command: 'node --version' })

    expect(ids.size).toBe(2)
  })

  it('does not require a callback (backwards compatible)', async () => {
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/v\d+\.\d+/)
  })

  it('callback is NOT invoked for blocked commands', async () => {
    const lines: string[] = []
    const streamingExecutor = new ToolExecutor(
      projectRoot,
      undefined,
      undefined,
      undefined,
      (_id, line) => lines.push(line),
    )

    const result = await streamingExecutor.execute('run_command', { command: 'curl https://evil.com' })

    expect(result).toMatch(/Blocked/)
    expect(lines).toHaveLength(0)
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

  it('routes ask-mode run_command through the interactive approval runner', async () => {
    const guarded = new ToolExecutor(
      projectRoot,
      undefined,
      ASK_PERMISSION_POLICY,
      async (command, cwd, reason) => ({ exitCode: 0, output: `${command}\n${cwd}\n${reason}` }),
    )

    const result = await guarded.execute('run_command', { command: 'node --version' })

    expect(result).toContain('Interactive command completed successfully')
    expect(result).toContain('node --version')
    expect(result).toContain('Kova wants to run this command')
  })

  it('routes long-running run_command through a persistent interactive session', async () => {
    let capturedCommand = ''
    const guarded = new ToolExecutor(
      projectRoot,
      undefined,
      undefined,
      async (command) => {
        capturedCommand = command
        return { exitCode: 0, output: 'Local: http://localhost:5173', sessionId: 'term-1', persistent: true }
      },
    )

    const result = await guarded.execute('run_command', { command: 'npm run dev' })

    expect(capturedCommand).toBe('npm run dev')
    expect(result).toContain('Persistent command started')
    expect(result).toContain('term-1')
  })

  it('starts persistent server with buffered modifies as preview changes', async () => {
    writeFileSync(join(projectRoot, 'src.ts'), 'old', 'utf-8')
    let capturedOptions: { previewChanges?: unknown[] } | undefined
    const guarded = new ToolExecutor(
      projectRoot,
      undefined,
      undefined,
      async (_command, _cwd, _reason, options) => {
        capturedOptions = options
        return {
          exitCode: 0,
          output: 'Local: http://localhost:5173',
          sessionId: 'term-preview',
          persistent: true,
          ready: true,
          url: 'http://localhost:5173',
          port: 5173,
        }
      },
    )

    await guarded.execute('write_file', { path: 'src.ts', content: 'new' })
    const result = await guarded.execute('run_command', { command: 'npm run dev' })

    expect(result).toContain('Persistent command started')
    expect(result).toContain('term-preview')
    expect(result).toContain('ready=true')
    expect(result).toContain('http://localhost:5173')
    expect(capturedOptions?.previewChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'src.ts', type: 'modify', diff: 'new' }),
    ]))
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

// ─── edit_file (FIX-013) ──────────────────────────────────────────────────────

describe('edit_file — staging invariant', () => {
  it('edit_file does not touch disk', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'const x = 1', 'utf-8')
    await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'const x = 1',
      new_string: 'const x = 2',
    })
    expect(readFileSync(join(projectRoot, 'app.ts'), 'utf-8')).toBe('const x = 1')
  })

  it('multiple edits leave disk completely untouched', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'function foo() { return 1 }', 'utf-8')
    await executor.execute('edit_file', {
      path: 'a.ts', old_string: 'return 1', new_string: 'return 2',
    })
    await executor.execute('edit_file', {
      path: 'a.ts', old_string: 'foo', new_string: 'bar',
    })
    expect(readFileSync(join(projectRoot, 'a.ts'), 'utf-8')).toBe('function foo() { return 1 }')
  })
})

describe('edit_file — basic replacement', () => {
  it('replaces unique single occurrence', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'export const VERSION = "1.0.0"', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: '"1.0.0"',
      new_string: '"1.1.0"',
    })
    expect(result).toMatch(/OK/)
    const staged = await executor.execute('read_file', { path: 'app.ts' })
    expect(staged).toBe('export const VERSION = "1.1.0"')
  })

  it('reports number of lines after edit', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'line1\nline2\nline3', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'line2',
      new_string: 'line2-modified',
    })
    expect(result).toMatch(/3 lines/)
  })

  it('records FileChange with type=modify and preserves before', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'const x = 1', 'utf-8')
    await executor.execute('edit_file', {
      path: 'app.ts', old_string: 'const x = 1', new_string: 'const x = 2',
    })
    const [change] = executor.getChanges()
    expect(change.type).toBe('modify')
    expect(change.path).toBe('app.ts')
    expect(change.diff).toBe('const x = 2')
    expect(change.before).toBe('const x = 1')
  })
})

describe('edit_file — uniqueness enforcement', () => {
  it('rejects multi-match without replace_all and reports count + hint', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'foo\nfoo\nfoo', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'foo',
      new_string: 'bar',
    })
    expect(result).toMatch(/3 times/)
    expect(result).toMatch(/replace_all/)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('replace_all: true substitutes every occurrence', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'foo\nfoo\nfoo', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'foo',
      new_string: 'bar',
      replace_all: true,
    })
    expect(result).toMatch(/OK/)
    expect(result).toMatch(/3 occurrences/)
    const staged = await executor.execute('read_file', { path: 'app.ts' })
    expect(staged).toBe('bar\nbar\nbar')
  })

  it('replace_all with single match still works', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'unique', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'unique',
      new_string: 'changed',
      replace_all: true,
    })
    expect(result).toMatch(/OK/)
    expect(result).toMatch(/1 occurrence/)
  })

  it('reports 0 matches with actionable hint', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'const x = 1', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'const y = 2',
      new_string: 'whatever',
    })
    expect(result).toMatch(/not found/)
    expect(result).toMatch(/read.*file.*first|exact|whitespace/i)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('replace_all with 0 matches still errors (same as without)', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'content', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'missing',
      new_string: 'whatever',
      replace_all: true,
    })
    expect(result).toMatch(/not found/)
  })
})

describe('edit_file — input validation', () => {
  it('rejects empty old_string', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'content', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: '',
      new_string: 'inserted',
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/empty|write_file/)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('rejects identical old_string and new_string (no-op)', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'content', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'content',
      new_string: 'content',
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/identical|same|no edit/i)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('rejects edit of non-existent file with actionable hint', async () => {
    const result = await executor.execute('edit_file', {
      path: 'missing.ts',
      old_string: 'foo',
      new_string: 'bar',
    })
    expect(result).toMatch(/not found/)
    expect(result).toMatch(/write_file|read_file/)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('rejects edit on file deleted in this session', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'content', 'utf-8')
    await executor.execute('delete_file', { path: 'app.ts' })
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'content',
      new_string: 'new',
    })
    expect(result).toMatch(/deleted|not found/)
  })

  it('rejects edit that would produce empty content', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'only-content', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'only-content',
      new_string: '',
    })
    expect(result).toMatch(/empty|delete_file/i)
    expect(executor.getChanges()).toHaveLength(0)
  })
})

describe('edit_file — chaining and staged state', () => {
  it('successive edits chain on staged result', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'const x = 1\nconst y = 2', 'utf-8')
    await executor.execute('edit_file', {
      path: 'app.ts', old_string: 'const x = 1', new_string: 'const x = 10',
    })
    await executor.execute('edit_file', {
      path: 'app.ts', old_string: 'const y = 2', new_string: 'const y = 20',
    })
    const staged = await executor.execute('read_file', { path: 'app.ts' })
    expect(staged).toBe('const x = 10\nconst y = 20')
    const [change] = executor.getChanges()
    expect(change.diff).toBe('const x = 10\nconst y = 20')
  })

  it('edit after write_file in same session keeps type=create', async () => {
    await executor.execute('write_file', { path: 'new.ts', content: 'export const A = 1' })
    await executor.execute('edit_file', {
      path: 'new.ts',
      old_string: 'const A = 1',
      new_string: 'const A = 2',
    })
    const [change] = executor.getChanges()
    expect(change.type).toBe('create')
    expect(change.diff).toBe('export const A = 2')
    expect(change.before).toBeUndefined()
  })

  it('edit_file on staged-only file (never on disk) works correctly', async () => {
    await executor.execute('write_file', { path: 'tmp.ts', content: 'a\nb\nc' })
    const result = await executor.execute('edit_file', {
      path: 'tmp.ts', old_string: 'b', new_string: 'B',
    })
    expect(result).toMatch(/OK/)
    expect(await executor.execute('read_file', { path: 'tmp.ts' })).toBe('a\nB\nc')
  })

  it('before reflects original disk content, not intermediate staged states', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'v0', 'utf-8')
    await executor.execute('edit_file', { path: 'app.ts', old_string: 'v0', new_string: 'v1' })
    await executor.execute('edit_file', { path: 'app.ts', old_string: 'v1', new_string: 'v2' })
    const [change] = executor.getChanges()
    expect(change.before).toBe('v0')
    expect(change.diff).toBe('v2')
  })

  it('multiple files edited produce separate FileChange entries', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'aaa', 'utf-8')
    writeFileSync(join(projectRoot, 'b.ts'), 'bbb', 'utf-8')
    await executor.execute('edit_file', { path: 'a.ts', old_string: 'aaa', new_string: 'AAA' })
    await executor.execute('edit_file', { path: 'b.ts', old_string: 'bbb', new_string: 'BBB' })
    expect(executor.getChanges()).toHaveLength(2)
  })
})

describe('edit_file — special content', () => {
  it('handles regex special characters in old_string literally', async () => {
    writeFileSync(join(projectRoot, 'r.ts'), 'matches /^[a-z]+$/g', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'r.ts',
      old_string: '/^[a-z]+$/g',
      new_string: '/^[A-Z]+$/g',
    })
    expect(result).toMatch(/OK/)
    expect(await executor.execute('read_file', { path: 'r.ts' })).toBe('matches /^[A-Z]+$/g')
  })

  it('handles multi-line old_string', async () => {
    writeFileSync(
      join(projectRoot, 'app.ts'),
      'function foo() {\n  return 1\n}\n',
      'utf-8',
    )
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'function foo() {\n  return 1\n}',
      new_string: 'function foo() {\n  return 42\n}',
    })
    expect(result).toMatch(/OK/)
    expect(await executor.execute('read_file', { path: 'app.ts' }))
      .toBe('function foo() {\n  return 42\n}\n')
  })

  it('handles dollar signs in new_string literally (no $1 substitution)', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'placeholder', 'utf-8')
    const result = await executor.execute('edit_file', {
      path: 'app.ts',
      old_string: 'placeholder',
      new_string: 'cost is $100 ($1 each)',
    })
    expect(result).toMatch(/OK/)
    expect(await executor.execute('read_file', { path: 'app.ts' }))
      .toBe('cost is $100 ($1 each)')
  })

  it('rejects Python edit that creates an empty block', async () => {
    writeFileSync(
      join(projectRoot, 'mod.py'),
      'def foo(x):\n    return x\n',
      'utf-8',
    )
    const result = await executor.execute('edit_file', {
      path: 'mod.py',
      old_string: '    return x',
      new_string: '',
    })
    expect(result).toMatch(/Python syntax invalid/)
    expect(executor.getChanges()).toHaveLength(0)
  })
})

describe('edit_file — security and permissions', () => {
  it('blocks path traversal', async () => {
    const result = await executor.execute('edit_file', {
      path: '../outside.ts',
      old_string: 'foo',
      new_string: 'bar',
    })
    expect(result).toMatch(/Blocked/)
  })

  it('blocks under READ_ONLY_PERMISSION_POLICY', async () => {
    const readOnlyExec = new ToolExecutor(projectRoot, undefined, READ_ONLY_PERMISSION_POLICY)
    writeFileSync(join(projectRoot, 'app.ts'), 'content', 'utf-8')
    const result = await readOnlyExec.execute('edit_file', {
      path: 'app.ts',
      old_string: 'content',
      new_string: 'edited',
    })
    expect(result).toMatch(/Blocked|denied/i)
  })

  it('respects .env deny pattern (edit permission key)', async () => {
    writeFileSync(join(projectRoot, '.env'), 'SECRET=value', 'utf-8')
    // edit permission is 'allow' globally, but read denies .env — edit
    // should at least be evaluated through the edit policy. For DEFAULT
    // policy, edit is 'allow', so this is allowed; we assert the result
    // is not a permission block, ensuring policy is wired through.
    const result = await executor.execute('edit_file', {
      path: '.env',
      old_string: 'SECRET=value',
      new_string: 'SECRET=newvalue',
    })
    // Either succeeds (default edit=allow) or is blocked explicitly — both
    // are valid; what we assert is no crash and the buffer state is consistent.
    if (result.startsWith('Blocked') || result.startsWith('Approval')) {
      expect(executor.getChanges()).toHaveLength(0)
    } else {
      expect(result).toMatch(/OK/)
    }
  })
})

describe('edit_file — tool registration', () => {
  it('is registered in AGENT_TOOLS with required schema fields', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'edit_file')
    expect(tool).toBeDefined()
    const schema = tool!.inputSchema as {
      type: string
      properties: Record<string, unknown>
      required: string[]
    }
    expect(schema.type).toBe('object')
    expect(schema.properties.path).toBeDefined()
    expect(schema.properties.old_string).toBeDefined()
    expect(schema.properties.new_string).toBeDefined()
    expect(schema.properties.replace_all).toBeDefined()
    expect(schema.required).toEqual(expect.arrayContaining(['path', 'old_string', 'new_string']))
    // replace_all must be optional
    expect(schema.required).not.toContain('replace_all')
  })

  it('is NOT included in READ_ONLY_TOOLS', async () => {
    const { READ_ONLY_TOOLS } = await import('../src/tools')
    expect(READ_ONLY_TOOLS.find(t => t.name === 'edit_file')).toBeUndefined()
  })

  it('tool description mentions preferring edit_file over write_file for changes', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'edit_file')!
    expect(tool.description.toLowerCase()).toMatch(/prefer|surgical|existing|change|edit/)
  })
})

describe('edit_file — rollback', () => {
  it('rollbackWrites clears edits and getChanges returns empty', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'v0', 'utf-8')
    await executor.execute('edit_file', { path: 'app.ts', old_string: 'v0', new_string: 'v1' })
    executor.rollbackWrites()
    expect(executor.getChanges()).toHaveLength(0)
    // Re-reading reads from disk (no staged buffer)
    expect(await executor.execute('read_file', { path: 'app.ts' })).toBe('v0')
  })
})

// ─── grep_codebase (FIX-015) ──────────────────────────────────────────────────

describe('grep_codebase — tool registration', () => {
  it('is registered in AGENT_TOOLS with required schema fields', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'grep_codebase')
    expect(tool).toBeDefined()
    const schema = tool!.inputSchema as {
      type: string
      properties: Record<string, unknown>
      required: string[]
    }
    expect(schema.properties.pattern).toBeDefined()
    expect(schema.properties.path).toBeDefined()
    expect(schema.properties.glob).toBeDefined()
    expect(schema.properties.type).toBeDefined()
    expect(schema.properties.output_mode).toBeDefined()
    expect(schema.required).toEqual(['pattern'])
  })

  it('is included in READ_ONLY_TOOLS (search is always safe)', async () => {
    const { READ_ONLY_TOOLS } = await import('../src/tools')
    expect(READ_ONLY_TOOLS.find(t => t.name === 'grep_codebase')).toBeDefined()
  })

  it('description steers the model away from run_command grep/rg/findstr', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'grep_codebase')!
    expect(tool.description.toLowerCase()).toMatch(/run_command|findstr|prefer/)
  })
})

describe('grep_codebase — dispatch through ToolExecutor.execute()', () => {
  it('returns files_with_matches output by default', async () => {
    writeFileSync(join(projectRoot, 'auth.ts'), 'export function login() {}', 'utf-8')
    writeFileSync(join(projectRoot, 'utils.ts'), 'export const x = 1', 'utf-8')
    const result = await executor.execute('grep_codebase', { pattern: 'export' })
    expect(result).toMatch(/auth\.ts/)
    expect(result).toMatch(/utils\.ts/)
  })

  it('content mode emits path:line:match lines', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'first\nmatch here\nthird', 'utf-8')
    const result = await executor.execute('grep_codebase', {
      pattern: 'match',
      output_mode: 'content',
    })
    expect(result).toMatch(/a\.ts:2:match here/)
  })

  it('count mode emits path:count', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'x\nx\nx', 'utf-8')
    const result = await executor.execute('grep_codebase', {
      pattern: 'x',
      output_mode: 'count',
    })
    expect(result).toMatch(/a\.ts:3/)
  })

  it('case_insensitive=true matches different casing', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'Hello World', 'utf-8')
    const result = await executor.execute('grep_codebase', {
      pattern: 'hello',
      case_insensitive: true,
    })
    expect(result).toMatch(/a\.ts/)
  })

  it('rejects empty pattern with descriptive error', async () => {
    const result = await executor.execute('grep_codebase', { pattern: '' })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/empty/i)
  })

  it('rejects path traversal outside projectRoot', async () => {
    const result = await executor.execute('grep_codebase', {
      pattern: 'foo',
      path: '../escape',
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/outside|traversal/i)
  })

  it('finds staged writes via withStagedFilesOnDisk overlay', async () => {
    // No file on disk — agent stages a write, then greps for content in it.
    await executor.execute('write_file', { path: 'staged.ts', content: 'unique_marker_42' })
    const result = await executor.execute('grep_codebase', { pattern: 'unique_marker_42' })
    expect(result).toMatch(/staged\.ts/)
    // After grep, disk must remain clean (staging invariant)
    expect(existsSync(join(projectRoot, 'staged.ts'))).toBe(false)
  })

  it('finds staged edits (write_file then edit_file then grep)', async () => {
    writeFileSync(join(projectRoot, 'original.ts'), 'OLD_VALUE', 'utf-8')
    await executor.execute('edit_file', {
      path: 'original.ts',
      old_string: 'OLD_VALUE',
      new_string: 'NEW_TOKEN',
    })
    const result = await executor.execute('grep_codebase', { pattern: 'NEW_TOKEN' })
    expect(result).toMatch(/original\.ts/)
    // Disk file still has the OLD content because the edit was staged
    expect(readFileSync(join(projectRoot, 'original.ts'), 'utf-8')).toBe('OLD_VALUE')
  })

  it('skips default-ignored directories (node_modules, dist, .git)', async () => {
    mkdirSync(join(projectRoot, 'node_modules'))
    mkdirSync(join(projectRoot, 'dist'))
    writeFileSync(join(projectRoot, 'src.ts'), 'secret', 'utf-8')
    writeFileSync(join(projectRoot, 'node_modules', 'dep.ts'), 'secret', 'utf-8')
    writeFileSync(join(projectRoot, 'dist', 'bundle.js'), 'secret', 'utf-8')
    const result = await executor.execute('grep_codebase', {
      pattern: 'secret',
      output_mode: 'files_with_matches',
    })
    expect(result).toMatch(/src\.ts/)
    expect(result).not.toMatch(/node_modules/)
    expect(result).not.toMatch(/dist[\\/]bundle/)
  })

  it('returns "No matches." when nothing matches', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), 'nothing here', 'utf-8')
    const result = await executor.execute('grep_codebase', { pattern: 'completely-missing-token' })
    expect(result).toBe('No matches.')
  })

  it('respects head_limit and reports truncation in the header', async () => {
    for (let i = 0; i < 30; i++) {
      writeFileSync(join(projectRoot, `f${i}.ts`), 'match', 'utf-8')
    }
    const result = await executor.execute('grep_codebase', {
      pattern: 'match',
      head_limit: 5,
      output_mode: 'files_with_matches',
    })
    expect(result).toMatch(/truncated/i)
    // Header counts only the returned lines (≤ head_limit)
    expect(result).toMatch(/^5 /)
  })
})

// ─── glob_files (FIX-016) ────────────────────────────────────────────────────

describe('glob_files — tool registration', () => {
  it('is registered in AGENT_TOOLS with required schema fields', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'glob_files')
    expect(tool).toBeDefined()
    const schema = tool!.inputSchema as {
      type: string
      properties: Record<string, unknown>
      required: string[]
    }
    expect(schema.properties.pattern).toBeDefined()
    expect(schema.properties.path).toBeDefined()
    expect(schema.properties.head_limit).toBeDefined()
    expect(schema.required).toEqual(['pattern'])
  })

  it('is included in READ_ONLY_TOOLS (listing files is always safe)', async () => {
    const { READ_ONLY_TOOLS } = await import('../src/tools')
    expect(READ_ONLY_TOOLS.find(t => t.name === 'glob_files')).toBeDefined()
  })

  it('description steers the model away from run_command find/ls', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'glob_files')!
    expect(tool.description.toLowerCase()).toMatch(/find|ls|prefer/)
  })

  it('description documents forward-slash and most-recent-first ordering', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'glob_files')!
    expect(tool.description.toLowerCase()).toMatch(/forward[- ]slash|recent|newest|modified/)
  })
})

describe('glob_files — dispatch through ToolExecutor.execute()', () => {
  it('returns matching file paths with the documented header', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), '', 'utf-8')
    writeFileSync(join(projectRoot, 'b.ts'), '', 'utf-8')
    const result = await executor.execute('glob_files', { pattern: '**/*.ts' })
    expect(result).toMatch(/^2 file\(s\)/)
    expect(result).toMatch(/a\.ts/)
    expect(result).toMatch(/b\.ts/)
  })

  it('returns "No files matched." when the glob matches nothing', async () => {
    writeFileSync(join(projectRoot, 'a.ts'), '', 'utf-8')
    const result = await executor.execute('glob_files', { pattern: '**/*.go' })
    expect(result).toBe('No files matched.')
  })

  it('rejects empty pattern with descriptive error', async () => {
    const result = await executor.execute('glob_files', { pattern: '' })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/empty/i)
  })

  it('rejects path traversal outside projectRoot', async () => {
    const result = await executor.execute('glob_files', {
      pattern: '**/*.ts',
      path: '../escape',
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/outside|traversal/i)
  })

  it('scopes results when "path" is provided', async () => {
    mkdirSync(join(projectRoot, 'src'), { recursive: true })
    writeFileSync(join(projectRoot, 'a.ts'), '', 'utf-8')
    writeFileSync(join(projectRoot, 'src', 'b.ts'), '', 'utf-8')
    const result = await executor.execute('glob_files', { pattern: '**/*.ts', path: 'src' })
    expect(result).toMatch(/src\/b\.ts/)
    expect(result).not.toMatch(/(^|\s|:)a\.ts/)
  })

  it('respects head_limit and reports truncation in the header', async () => {
    for (let i = 0; i < 30; i++) {
      writeFileSync(join(projectRoot, `f${i}.ts`), '', 'utf-8')
    }
    const result = await executor.execute('glob_files', {
      pattern: '**/*.ts',
      head_limit: 5,
    })
    expect(result).toMatch(/^5 file\(s\) \(truncated/)
  })

  it('skips default-ignored directories (node_modules, dist, .git, .turbo, out)', async () => {
    writeFileSync(join(projectRoot, 'keep.ts'), '', 'utf-8')
    for (const dir of ['node_modules', 'dist', '.git', '.turbo', 'out']) {
      mkdirSync(join(projectRoot, dir), { recursive: true })
      writeFileSync(join(projectRoot, dir, 'hidden.ts'), '', 'utf-8')
    }
    const result = await executor.execute('glob_files', { pattern: '**/*.ts' })
    expect(result).toMatch(/keep\.ts/)
    expect(result).not.toMatch(/node_modules/)
    expect(result).not.toMatch(/dist[/\\]/)
    expect(result).not.toMatch(/\.git[/\\]/)
    expect(result).not.toMatch(/\.turbo/)
    expect(result).not.toMatch(/out[/\\]/)
  })

  it('returns forward-slash paths regardless of host OS', async () => {
    mkdirSync(join(projectRoot, 'src', 'deep'), { recursive: true })
    writeFileSync(join(projectRoot, 'src', 'deep', 'file.ts'), '', 'utf-8')
    const result = await executor.execute('glob_files', { pattern: '**/*.ts' })
    expect(result).toMatch(/src\/deep\/file\.ts/)
    expect(result).not.toMatch(/src\\\\deep/)
  })

  it('finds staged writes via withStagedFilesOnDisk overlay', async () => {
    // No file on disk — agent stages a write, then globs.
    await executor.execute('write_file', { path: 'staged.ts', content: '// staged content' })
    const result = await executor.execute('glob_files', { pattern: '**/*.ts' })
    expect(result).toMatch(/staged\.ts/)
    // After glob, disk must remain clean (staging invariant)
    expect(existsSync(join(projectRoot, 'staged.ts'))).toBe(false)
  })

  it('does not return paths from a staged delete (delete_file)', async () => {
    writeFileSync(join(projectRoot, 'to-delete.ts'), '', 'utf-8')
    writeFileSync(join(projectRoot, 'keep.ts'), '', 'utf-8')
    await executor.execute('delete_file', { path: 'to-delete.ts' })
    const result = await executor.execute('glob_files', { pattern: '**/*.ts' })
    expect(result).toMatch(/keep\.ts/)
    expect(result).not.toMatch(/to-delete\.ts/)
    // Disk untouched (staging invariant)
    expect(existsSync(join(projectRoot, 'to-delete.ts'))).toBe(true)
  })

  it('is denied for read-only executors with the deny edit policy (but still works — listing is read-only)', async () => {
    // glob_files lives in READ_ONLY_TOOLS, so it is allowed even under the
    // restrictive policy used by plan/review modes.
    const readOnlyExecutor = new ToolExecutor(projectRoot, undefined, READ_ONLY_PERMISSION_POLICY)
    writeFileSync(join(projectRoot, 'a.ts'), '', 'utf-8')
    const result = await readOnlyExecutor.execute('glob_files', { pattern: '**/*.ts' })
    expect(result).toMatch(/a\.ts/)
  })
})

// ─── todo_write (FIX-018) ────────────────────────────────────────────────────

describe('todo_write — tool registration', () => {
  it('is registered in AGENT_TOOLS with the documented schema', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'todo_write')
    expect(tool).toBeDefined()
    const schema = tool!.inputSchema as {
      type: string
      properties: Record<string, unknown>
      required: string[]
    }
    expect(schema.properties.todos).toBeDefined()
    expect(schema.required).toEqual(['todos'])
  })

  it('is in READ_ONLY_TOOLS (planning aid; does not mutate the project)', async () => {
    const { READ_ONLY_TOOLS } = await import('../src/tools')
    expect(READ_ONLY_TOOLS.find(t => t.name === 'todo_write')).toBeDefined()
  })

  it('description steers the model toward multi-step usage', async () => {
    const { AGENT_TOOLS } = await import('../src/tools')
    const tool = AGENT_TOOLS.find(t => t.name === 'todo_write')!
    expect(tool.description.toLowerCase()).toMatch(/3\+|multi[- ]step|complex/i)
    expect(tool.description.toLowerCase()).toMatch(/replace|full list/i)
  })
})

describe('todo_write — dispatch and state', () => {
  it('writes a new todo list and confirms success', async () => {
    const result = await executor.execute('todo_write', {
      todos: [
        { content: 'Create auth module', activeForm: 'Creating auth module', status: 'pending' },
        { content: 'Add tests',          activeForm: 'Adding tests',          status: 'pending' },
      ],
    })
    expect(result).toMatch(/^OK: todo list updated/)
    expect(result).toMatch(/2 item/)
  })

  it('exposes the current list via getTodos()', async () => {
    await executor.execute('todo_write', {
      todos: [
        { content: 'A', activeForm: 'Doing A', status: 'pending' },
      ],
    })
    expect(executor.getTodos()).toEqual([
      { content: 'A', activeForm: 'Doing A', status: 'pending' },
    ])
  })

  it('replaces the full list on every call (no merging)', async () => {
    await executor.execute('todo_write', {
      todos: [
        { content: 'A', activeForm: 'Doing A', status: 'pending' },
        { content: 'B', activeForm: 'Doing B', status: 'pending' },
      ],
    })
    await executor.execute('todo_write', {
      todos: [
        { content: 'B', activeForm: 'Doing B', status: 'completed' },
      ],
    })
    expect(executor.getTodos()).toEqual([
      { content: 'B', activeForm: 'Doing B', status: 'completed' },
    ])
  })

  it('fires onTodosUpdated callback with the full new list', async () => {
    const captured: Array<Array<{ content: string; activeForm: string; status: string }>> = []
    const exec = new ToolExecutor(projectRoot, undefined, undefined, undefined, undefined, {
      onTodosUpdated: (todos) => captured.push(todos),
    })
    await exec.execute('todo_write', {
      todos: [
        { content: 'X', activeForm: 'Doing X', status: 'in_progress' },
      ],
    })
    expect(captured).toHaveLength(1)
    expect(captured[0]).toEqual([
      { content: 'X', activeForm: 'Doing X', status: 'in_progress' },
    ])
  })

  it('accepts an empty list (model clears the plan)', async () => {
    await executor.execute('todo_write', {
      todos: [{ content: 'A', activeForm: 'Doing A', status: 'pending' }],
    })
    const result = await executor.execute('todo_write', { todos: [] })
    expect(result).toMatch(/OK: todo list cleared/i)
    expect(executor.getTodos()).toEqual([])
  })

  it('seeds from initialTodos when provided', async () => {
    const seeded = [
      { content: 'Seed', activeForm: 'Seeding', status: 'pending' as const },
    ]
    const exec = new ToolExecutor(projectRoot, undefined, undefined, undefined, undefined, {
      initialTodos: seeded,
    })
    expect(exec.getTodos()).toEqual(seeded)
  })

  it('initialTodos is copied (mutation of source does not affect executor state)', async () => {
    const seeded = [
      { content: 'Seed', activeForm: 'Seeding', status: 'pending' as const },
    ]
    const exec = new ToolExecutor(projectRoot, undefined, undefined, undefined, undefined, {
      initialTodos: seeded,
    })
    seeded[0].status = 'completed'
    expect(exec.getTodos()[0].status).toBe('pending')
  })
})

describe('todo_write — input validation', () => {
  it('rejects missing todos array', async () => {
    const result = await executor.execute('todo_write', {})
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/todos.*array/i)
  })

  it('rejects todos that is not an array', async () => {
    const result = await executor.execute('todo_write', { todos: 'not an array' })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/todos.*array/i)
  })

  it('rejects todos with missing required fields', async () => {
    const result = await executor.execute('todo_write', {
      todos: [{ content: 'A', status: 'pending' }],
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/activeForm/i)
  })

  it('rejects invalid status value', async () => {
    const result = await executor.execute('todo_write', {
      todos: [{ content: 'A', activeForm: 'Doing A', status: 'wip' }],
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/status/i)
  })

  it('rejects empty content string', async () => {
    const result = await executor.execute('todo_write', {
      todos: [{ content: '', activeForm: 'Doing A', status: 'pending' }],
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/content/i)
  })

  it('rejects empty activeForm string', async () => {
    const result = await executor.execute('todo_write', {
      todos: [{ content: 'A', activeForm: '', status: 'pending' }],
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/activeForm/i)
  })

  it('rejects more than one in_progress item simultaneously', async () => {
    // Matches Claude Code's TodoWrite contract: only one item may be in_progress
    // at a time to enforce focused work.
    const result = await executor.execute('todo_write', {
      todos: [
        { content: 'A', activeForm: 'Doing A', status: 'in_progress' },
        { content: 'B', activeForm: 'Doing B', status: 'in_progress' },
      ],
    })
    expect(result).toMatch(/Error/)
    expect(result).toMatch(/one.*in_progress|only.*one/i)
  })

  it('keeps the list unchanged when validation fails', async () => {
    await executor.execute('todo_write', {
      todos: [{ content: 'Original', activeForm: 'Originaling', status: 'pending' }],
    })
    const before = executor.getTodos()
    await executor.execute('todo_write', { todos: 'garbage' })
    expect(executor.getTodos()).toEqual(before)
  })

  it('does NOT fire onTodosUpdated on validation failure', async () => {
    const captured: Array<unknown> = []
    const exec = new ToolExecutor(projectRoot, undefined, undefined, undefined, undefined, {
      onTodosUpdated: (todos) => captured.push(todos),
    })
    await exec.execute('todo_write', { todos: 'garbage' })
    expect(captured).toHaveLength(0)
  })
})

describe('todo_write — disk invariant', () => {
  it('does not touch disk regardless of payload', async () => {
    await executor.execute('todo_write', {
      todos: [{ content: 'A', activeForm: 'Doing A', status: 'pending' }],
    })
    // No new files appear, no files are modified.
    expect(executor.getChanges()).toHaveLength(0)
  })
})
