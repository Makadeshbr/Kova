import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ToolExecutor } from '../src/tools'

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-abort-test-'))
})

afterEach(async () => {
  // On Windows, killed child processes may briefly hold a lock on their cwd.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      rmSync(projectRoot, { recursive: true, force: true })
      break
    } catch {
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }
})

describe('ToolExecutor - AbortSignal: run_command', () => {
  it('returns Aborted immediately when signal is already aborted before call', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/^Aborted:/)
  })

  it('runs command normally when signal is not aborted', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/v\d+\.\d+/)
  })

  it('does not run command at all when signal pre-aborted - no process spawned', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const result = await executor.execute('run_command', { command: 'node -e "setTimeout(()=>{},10000)"' })
    const elapsed = Date.now() - start
    expect(result).toMatch(/^Aborted:/)
    expect(elapsed).toBeLessThan(1000)
  })

  it('propagates abort to long-running command - terminates the child process', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const cmdPromise = executor.execute('run_command', { command: 'node -e "setTimeout(()=>{},10000)"' })
    await new Promise(resolve => setTimeout(resolve, 100))
    ctrl.abort()
    const result = await cmdPromise
    const elapsed = Date.now() - start
    expect(result).toMatch(/^Aborted:|^Error:/)
    expect(elapsed).toBeLessThan(5000)
  })
})

describe('ToolExecutor - AbortSignal: every tool cooperates', () => {
  it('does not write a streamed create when signal is already aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('write_file', { path: 'app.ts', content: 'export const x = 1' })
    expect(result).toMatch(/^Aborted:/)
    expect(existsSync(join(projectRoot, 'app.ts'))).toBe(false)
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('does not read, list, search, glob, delete, edit, or update todos after pre-abort', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'export const x = 1', 'utf-8')
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)

    await expect(executor.execute('read_file', { path: 'app.ts' })).resolves.toMatch(/^Aborted:/)
    await expect(executor.execute('list_files', { dir: '.' })).resolves.toMatch(/^Aborted:/)
    await expect(executor.execute('grep_codebase', { pattern: 'x' })).resolves.toMatch(/^Aborted:/)
    await expect(executor.execute('glob_files', { pattern: '**/*.ts' })).resolves.toMatch(/^Aborted:/)
    await expect(executor.execute('delete_file', { path: 'app.ts' })).resolves.toMatch(/^Aborted:/)
    await expect(executor.execute('edit_file', { path: 'app.ts', old_string: 'x', new_string: 'y' })).resolves.toMatch(/^Aborted:/)
    await expect(executor.execute('todo_write', {
      todos: [{ content: 'A', activeForm: 'Doing A', status: 'pending' }],
    })).resolves.toMatch(/^Aborted:/)

    expect(executor.getChanges()).toHaveLength(0)
    expect(executor.getTodos()).toEqual([])
    expect(readFileSync(join(projectRoot, 'app.ts'), 'utf-8')).toBe('export const x = 1')
  })

  it('stops list_files during a large directory traversal', async () => {
    for (let i = 0; i < 900; i++) {
      writeFileSync(join(projectRoot, `file-${i}.ts`), 'export {}', 'utf-8')
    }
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const promise = executor.execute('list_files', { dir: '.' })
    setTimeout(() => ctrl.abort(), 0)
    const result = await promise
    expect(result).toMatch(/^Aborted:/)
    expect(Date.now() - start).toBeLessThan(2000)
  })

  it('cleans staged disk overlay when grep aborts mid-search', async () => {
    mkdirSync(join(projectRoot, 'src'), { recursive: true })
    writeFileSync(join(projectRoot, 'src', 'existing.ts'), 'old token', 'utf-8')
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    await executor.execute('write_file', { path: 'src/existing.ts', content: 'new token' })
    for (let i = 0; i < 900; i++) {
      writeFileSync(join(projectRoot, 'src', `scan-${i}.ts`), `token ${i}`, 'utf-8')
    }

    const promise = executor.execute('grep_codebase', { pattern: 'token', output_mode: 'content', head_limit: 5000 })
    setTimeout(() => ctrl.abort(), 0)
    const result = await promise

    expect(result).toMatch(/^Aborted:/)
    expect(readFileSync(join(projectRoot, 'src', 'existing.ts'), 'utf-8')).toBe('old token')
  })

  it('new ToolExecutor without signal runs commands normally', async () => {
    const executor = new ToolExecutor(projectRoot)
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/v\d+/)
  })
})

describe('ToolExecutor - AbortSignal escalation to SIGKILL', () => {
  it('kills a SIGTERM-ignoring child within the grace period', async () => {
    const stubbornCmd = 'node -e "process.on(\'SIGTERM\',()=>{});setTimeout(()=>{},30000)"'
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const cmdPromise = executor.execute('run_command', { command: stubbornCmd })
    await new Promise(resolve => setTimeout(resolve, 200))
    ctrl.abort()
    const result = await cmdPromise
    const elapsed = Date.now() - start
    expect(result).toMatch(/^Aborted:|^Error:/)
    expect(elapsed).toBeLessThan(6000)
  }, 15_000)

  it('clears the SIGKILL fallback timer when the process exits naturally', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const r1 = await executor.execute('run_command', { command: 'node --version' })
    const r2 = await executor.execute('run_command', { command: 'node --version' })
    expect(r1).toMatch(/v\d+/)
    expect(r2).toMatch(/v\d+/)
  })
})

describe('ToolExecutor - AbortSignal: security invariants', () => {
  it('blocklist is enforced when signal is not aborted', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'rm -rf /' })
    expect(result).toMatch(/Blocked/)
  })

  it('returns Aborted, not Blocked, when signal is aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'rm -rf /' })
    expect(result).toMatch(/^Aborted:/)
  })
})
