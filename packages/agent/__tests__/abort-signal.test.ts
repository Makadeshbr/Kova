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

describe('ToolExecutor — AbortSignal escalation to SIGKILL (FIX-009)', () => {
  it('kills a SIGTERM-ignoring child within the grace period', async () => {
    // Child registers SIGTERM handler that does nothing and would run 30s.
    // POSIX: SIGTERM is ignored, our SIGKILL escalation must fire after ~3s grace.
    // Windows: doesn't have POSIX signals, the first kill is already TerminateProcess.
    // Either way: the process must die in well under 30s.
    const stubbornCmd = 'node -e "process.on(\'SIGTERM\',()=>{});setTimeout(()=>{},30000)"'
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const start = Date.now()
    const cmdPromise = executor.execute('run_command', { command: stubbornCmd })
    // Let the child start and register its SIGTERM handler
    await new Promise(r => setTimeout(r, 200))
    ctrl.abort()
    const result = await cmdPromise
    const elapsed = Date.now() - start
    expect(result).toMatch(/Aborted|Error/)
    // Must die within grace+slack (3s SIGTERM grace + 2s slack) — well under 30s
    expect(elapsed).toBeLessThan(6000)
  }, 15_000)

  it('clears the SIGKILL fallback timer when the process exits naturally', async () => {
    // If a command finishes BEFORE abort fires, no SIGKILL timer should linger.
    // We can't directly observe the timer, but we can ensure two consecutive normal
    // runs complete cleanly with the same executor and shared signal.
    const ctrl = new AbortController()
    const executor = new ToolExecutor(projectRoot, ctrl.signal)
    const r1 = await executor.execute('run_command', { command: 'node --version' })
    const r2 = await executor.execute('run_command', { command: 'node --version' })
    expect(r1).toMatch(/v\d+/)
    expect(r2).toMatch(/v\d+/)
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
