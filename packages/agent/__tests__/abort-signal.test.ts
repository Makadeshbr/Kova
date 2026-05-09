import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ToolExecutor } from '../src/tools'

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-abort-test-'))
})

afterEach(async () => {
  // On Windows, killed child processes may briefly hold a lock on their cwd.
  // Retry a few times before giving up.
  for (let attempt = 0; attempt < 4; attempt++) {
    try { rmSync(projectRoot, { recursive: true, force: true }); break } catch {
      await new Promise(r => setTimeout(r, 150))
    }
  }
})

describe('ToolExecutor — AbortSignal: run_command', () => {
  it('returns Aborted immediately when signal is already aborted before call', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/Aborted/)
  })

  it('runs command normally when signal is not aborted', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/v\d+\.\d+/)
  })

  it('does not run command at all when signal pre-aborted — no process spawned', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const result = await executor.execute('run_command', { command: 'node -e "setTimeout(()=>{},10000)"' })
    const elapsed = Date.now() - start
    expect(result).toMatch(/Aborted/)
    // Must return immediately — not wait 10 seconds
    expect(elapsed).toBeLessThan(1000)
  })

  it('propagates abort to long-running command — terminates the child process', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const cmdPromise = executor.execute('run_command', { command: 'node -e "setTimeout(()=>{},10000)"' })
    // Abort after a short delay to let the process start
    await new Promise(r => setTimeout(r, 100))
    ctrl.abort()
    const result = await cmdPromise
    const elapsed = Date.now() - start
    expect(result).toMatch(/Aborted|Error/)
    // Must resolve in well under 10 seconds
    expect(elapsed).toBeLessThan(5000)
  })
})

describe('ToolExecutor — AbortSignal: write/read/delete not affected', () => {
  it('write_file works regardless of signal state', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('write_file', { path: 'app.ts', content: 'export const x = 1' })
    expect(result).toMatch(/OK/)
  })

  it('read_file works regardless of signal state', async () => {
    writeFileSync(join(projectRoot, 'app.ts'), 'export const x = 1', 'utf-8')
    const ctrl = new AbortController()
    ctrl.abort()  // aborted — but read should still work
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('read_file', { path: 'app.ts' })
    expect(result).toContain('export const x = 1')
  })

  it('new ToolExecutor without signal runs commands normally', async () => {
    const executor = new ToolExecutor(projectRoot)  // no signal — backwards compat
    const result = await executor.execute('run_command', { command: 'node --version' })
    expect(result).toMatch(/v\d+/)
  })
})

describe('ToolExecutor — AbortSignal: security invariants', () => {
  it('blocklist is enforced when signal is not aborted', async () => {
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const result = await executor.execute('run_command', { command: 'rm -rf /' })
    expect(result).toMatch(/Blocked/)
  })

  it('returns Aborted (not Blocked) when signal is aborted — abort takes precedence', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    // Even a blocked command returns Aborted when session is aborted (no need to check blocklist)
    const result = await executor.execute('run_command', { command: 'rm -rf /' })
    expect(result).toMatch(/Aborted/)
  })
})
