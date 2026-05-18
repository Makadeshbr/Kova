import { resolve, relative } from 'node:path'
import { execFile } from 'node:child_process'
import type { WebContents } from 'electron'
import { isLongRunningCommand, type ServerSessionInfo } from '@kova/shared'

// node-pty is a native module that requires the correct Node.js ABI for the
// Electron version. Load it lazily with a try-catch so that if it is not
// available (wrong ABI, missing binary, etc.), terminal features degrade
// gracefully without crashing the main process.
// eslint-disable-next-line @typescript-eslint/no-require-imports
let pty: typeof import('@lydell/node-pty') | null = null
try {
  // Using require() (not import) so we can wrap it in try-catch
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pty = require('@lydell/node-pty') as typeof import('@lydell/node-pty')
  console.log('[TerminalManager] node-pty loaded OK')
} catch (e) {
  console.warn('[TerminalManager] node-pty not available — terminal features disabled.', e instanceof Error ? e.message : e)
  console.warn('[TerminalManager] Run `npx @electron/rebuild` to rebuild node-pty for this Electron version.')
}

export interface TerminalSession {
  id: string
  command: string
  cwd: string
  pty: import('@lydell/node-pty').IPty
  outputBuf: string
  exitCode: number | null
  persistent: boolean
  stopping: boolean
}

export interface InteractiveResult {
  exitCode: number
  output: string
  sessionId?: string
  persistent?: boolean
  ready?: boolean
  url?: string
  port?: number
  cwd?: string
  diagnostics?: string[]
}

export type ServerReadinessProbe = (url: string) => Promise<boolean>

const INTERACTIVE_ALLOWLIST = new Set([
  'gh', 'git', 'npm', 'npx', 'pnpm', 'yarn', 'bun',
  'npm.cmd', 'npx.cmd', 'pnpm.cmd', 'yarn.cmd', 'bun.cmd',
  'node', 'python', 'python3', 'pip', 'pip3', 'uv',
  'node.exe', 'python.exe', 'python3.exe', 'pip.exe', 'pip3.exe', 'uv.exe',
  'cargo', 'rustup', 'go', 'mvn', 'gradle',
  'cargo.exe', 'rustup.exe', 'go.exe', 'mvn.cmd', 'gradle.bat',
  'dotnet', 'docker', 'kubectl', 'aws', 'gcloud', 'az',
  'dotnet.exe', 'docker.exe', 'kubectl.exe', 'aws.exe', 'gcloud.cmd', 'az.cmd',
  'heroku', 'vercel', 'fly', 'railway', 'ssh', 'sftp',
  'vite', 'next', 'astro', 'remix', 'webpack', 'webpack-dev-server',
  'vite.cmd', 'next.cmd', 'astro.cmd', 'remix.cmd', 'webpack.cmd', 'webpack-dev-server.cmd',
  'serve', 'http-server', 'rails', 'flask', 'uvicorn', 'gunicorn', 'nodemon',
  'serve.cmd', 'http-server.cmd', 'rails.bat', 'flask.exe', 'uvicorn.exe', 'nodemon.cmd',
])

const PERSISTENT_READY_PATTERNS = [
  /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])[:/]/i,
  /\blocal:\s*https?:\/\//i,
  /\bready\b/i,
  /\bcompiled\b/i,
  /\bserver (?:running|started|listening)\b/i,
  /\blistening on\b/i,
  /\bwebpack compiled\b/i,
  /\bvite\b.*\bready\b/i,
]

const PERSISTENT_START_GRACE_MS = 10_000
const WINDOWS_BATCH_TERMINATE_PROMPT = /(?:terminate batch job|finalizar o arquivo em lotes)\s*\([^)]*\)\?/i

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>()
  private webContents: WebContents | null = null
  private projectRoot: string | null = null
  private pendingApprovals = new Map<string, {
    resolve: (approved: boolean) => void
    reject: (err: Error) => void
  }>()

  constructor(
    private readonly ptyImpl = pty,
    private readonly serverProbe: ServerReadinessProbe = defaultServerProbe,
  ) {}

  setWebContents(wc: WebContents): void {
    this.webContents = wc
  }

  /** Sets the workspace boundary. All cwd inputs are validated to stay within this root. */
  setProjectRoot(root: string | null): void {
    this.projectRoot = root
  }

  get isAvailable(): boolean {
    return this.ptyImpl !== null
  }

  /**
   * Validates a cwd against the configured projectRoot.
   * Returns the absolute path when within the root, or null when outside / unsafe.
   * Empty cwd falls back to the project root itself.
   */
  private resolveSafeCwd(cwd: string | null | undefined): string | null {
    if (!this.projectRoot) return null
    const trimmed = (cwd ?? '').trim()
    if (!trimmed) return this.projectRoot
    const rootAbs = resolve(this.projectRoot)
    const abs = resolve(rootAbs, trimmed)
    const rel = relative(rootAbs, abs)
    if (rel.startsWith('..') || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return null
    return abs
  }

  /** Called from agent tool — blocks until terminal exits */
  async runInteractive(
    command: string,
    cwd: string,
    reason: string,
  ): Promise<InteractiveResult> {
    if (!this.ptyImpl) {
      return {
        exitCode: 1,
        output: 'Interactive terminal not available. The node-pty module is not compiled for this Electron version. Run: npx @electron/rebuild',
      }
    }

    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const exe = command.trim().split(/\s+/)[0]

    if (!INTERACTIVE_ALLOWLIST.has(exe)) {
      return {
        exitCode: 1,
        output: `Command "${exe}" is not in the interactive command allowlist. Allowed commands: ${[...INTERACTIVE_ALLOWLIST].join(', ')}`,
      }
    }

    const safeCwd = this.resolveSafeCwd(cwd)
    if (!safeCwd) {
      return {
        exitCode: 1,
        output: this.projectRoot
          ? `cwd "${cwd}" is outside project "${this.projectRoot}" — execution blocked.`
          : 'No project open — terminal cannot run.',
      }
    }

    const approved = await this.requestApproval(id, command, reason)
    if (!approved) {
      return { exitCode: 1, output: 'User denied interactive command execution.' }
    }

    return this.startSession(id, command, safeCwd, { persistent: isLongRunningCommand(command) })
  }

  /** Open terminal directly from UI (no agent involvement) */
  openTerminal(id: string, command: string, cwd: string): void {
    if (!this.ptyImpl) {
      this.webContents?.send('kova:terminal-exit', { id, exitCode: 1 })
      return
    }
    const safeCwd = this.resolveSafeCwd(cwd)
    if (!safeCwd) {
      this.webContents?.send('kova:terminal-exit', { id, exitCode: 1 })
      return
    }
    this.startSession(id, command, safeCwd).catch(() => { /* errors emitted via events */ })
  }

  writeInput(id: string, data: string): void {
    const session = this.sessions.get(id)
    if (!session) return

    if (session.persistent && process.platform === 'win32') {
      if (data === '\x03') {
        this.stopSession(session, 'interrupt')
        return
      }
      if (WINDOWS_BATCH_TERMINATE_PROMPT.test(session.outputBuf) && /^[sSyY](?:\r|\n|\r\n)?$/.test(data)) {
        this.stopSession(session, 'batch-confirm')
        return
      }
    }

    session.pty.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id)
    if (session) {
      try { session.pty.resize(cols, rows) } catch { /* ignore if already exited */ }
    }
  }

  kill(id: string): void {
    const session = this.sessions.get(id)
    if (session) {
      this.stopSession(session, 'user')
    }
  }

  approveInteractive(id: string, approved: boolean): void {
    const pending = this.pendingApprovals.get(id)
    if (pending) {
      this.pendingApprovals.delete(id)
      pending.resolve(approved)
    }
  }

  private async requestApproval(id: string, command: string, reason: string): Promise<boolean> {
    if (!this.webContents) return false

    return new Promise<boolean>((resolve, reject) => {
      this.pendingApprovals.set(id, { resolve, reject })
      this.webContents!.send('kova:interactive-request', { id, command, reason })

      setTimeout(() => {
        if (this.pendingApprovals.has(id)) {
          this.pendingApprovals.delete(id)
          resolve(false)
        }
      }, 60_000)
    })
  }

  private startSession(
    id: string,
    command: string,
    cwd: string,
    options: { persistent?: boolean } = {},
  ): Promise<InteractiveResult> {
    return new Promise((resolve) => {
      if (!this.ptyImpl) {
        resolve({ exitCode: 1, output: 'node-pty not available' })
        return
      }

      const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL ?? '/bin/bash'
      const args = process.platform === 'win32' ? ['/c', command] : ['-c', command]

      let outputBuf = ''
      let settled = false
      let probing = false
      let readyTimer: NodeJS.Timeout | null = null
      let retryTimer: NodeJS.Timeout | null = null
      const persistent = options.persistent === true
      const settle = (result: InteractiveResult): void => {
        if (settled) return
        settled = true
        if (readyTimer) clearTimeout(readyTimer)
        if (retryTimer) clearTimeout(retryTimer)
        resolve(result)
      }
      const scheduleReadyRetry = (): void => {
        if (settled || retryTimer) return
        retryTimer = setTimeout(() => {
          retryTimer = null
          trySettlePersistentReady()
        }, 500)
        if (typeof retryTimer.unref === 'function') retryTimer.unref()
      }
      const trySettlePersistentReady = (): void => {
        if (!persistent || probing || settled || !PERSISTENT_READY_PATTERNS.some(pattern => pattern.test(outputBuf))) return
        probing = true
        const meta = analyzePersistentOutput(outputBuf)
        const probe = meta.url ? this.serverProbe(meta.url) : Promise.resolve(meta.ready)
        probe
          .then((isReachable) => {
            probing = false
            if (!isReachable || settled) {
              if (!settled) scheduleReadyRetry()
              return
            }
            settle({
              exitCode: 0,
              output: outputBuf,
              sessionId: id,
              persistent: true,
              ready: true,
              url: meta.url,
              port: meta.port,
              cwd,
              diagnostics: meta.diagnostics,
            })
          })
          .catch(() => {
            probing = false
            scheduleReadyRetry()
          })
      }

      const ptyProcess = this.ptyImpl.spawn(shell, args, {
        name: 'xterm-color',
        cols: 120,
        rows: 30,
        // cwd is always pre-validated by callers via resolveSafeCwd — never falls back to
        // process.cwd() (which would be the Electron app dir, an escape from the workspace).
        cwd,
        env: process.env as Record<string, string>,
      })

      const session: TerminalSession = {
        id, command, cwd, pty: ptyProcess, outputBuf, exitCode: null, persistent, stopping: false,
      }
      this.sessions.set(id, session)

      this.webContents?.send('kova:terminal-started', { id, command, cwd })
      if (persistent) {
        readyTimer = setTimeout(() => {
          const meta = analyzePersistentOutput(outputBuf)
          settle({
            exitCode: 0,
            output: outputBuf || `Persistent command started in Kova terminal: ${command}`,
            sessionId: id,
            persistent: true,
            ready: false,
            url: meta.url,
            port: meta.port,
            cwd,
            diagnostics: meta.url ? [...meta.diagnostics, 'readiness_probe_failed'] : meta.diagnostics,
          })
        }, PERSISTENT_START_GRACE_MS)
        if (typeof readyTimer.unref === 'function') readyTimer.unref()
      }

      ptyProcess.onData((data) => {
        outputBuf += data
        if (outputBuf.length > 100_000) outputBuf = outputBuf.slice(-100_000)
        session.outputBuf = outputBuf
        this.webContents?.send('kova:terminal-data', { id, data })
        trySettlePersistentReady()
      })

      ptyProcess.onExit(({ exitCode }) => {
        session.exitCode = exitCode
        this.webContents?.send('kova:terminal-exit', { id, exitCode })
        this.sessions.delete(id)
        const meta = analyzePersistentOutput(outputBuf)
        settle(persistent
          ? { exitCode, output: outputBuf, sessionId: id, persistent: true, ready: false, url: meta.url, port: meta.port, cwd, diagnostics: meta.diagnostics }
          : { exitCode, output: outputBuf })
      })
    })
  }

  private killProcessTree(session: TerminalSession): void {
    const pid = typeof session.pty.pid === 'number' ? session.pty.pid : null
    if (process.platform === 'win32' && pid) {
      try {
        execFile('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }, () => {})
        try { session.pty.kill() } catch { /* ignore */ }
      } catch {
        try { session.pty.kill() } catch { /* ignore */ }
      }
      return
    }
    try { session.pty.kill() } catch { /* ignore */ }
  }

  private stopSession(session: TerminalSession, reason: 'interrupt' | 'batch-confirm' | 'user'): void {
    if (session.stopping) return
    session.stopping = true
    const label = reason === 'interrupt'
      ? 'interrupt received'
      : reason === 'batch-confirm'
        ? 'Windows batch termination confirmed'
        : 'stop requested'
    this.webContents?.send('kova:terminal-data', {
      id: session.id,
      data: `\r\n[Kova] ${label}; stopping process tree...\r\n`,
    })
    this.killProcessTree(session)
  }
}

export const terminalManager = new TerminalManager()

async function defaultServerProbe(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1_500)
  if (typeof timeout.unref === 'function') timeout.unref()
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    return response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export function analyzePersistentOutput(output: string): Omit<ServerSessionInfo, 'persistent' | 'command' | 'cwd'> {
  const url = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?[^\s]*/i)?.[0]
  const portMatch = url?.match(/:(\d+)/) ?? output.match(/\b(?:port|porta)\s+(\d{2,5})\b/i)
  const diagnostics: string[] = []
  if (/EADDRINUSE|address already in use|port .* already in use|porta .* em uso/i.test(output)) {
    diagnostics.push('port_in_use')
  }
  if (/requires Node\.js version|unsupported engine|EBADENGINE|node version/i.test(output)) {
    diagnostics.push('node_version_mismatch')
  }
  if (/missing script|script .* not found/i.test(output)) {
    diagnostics.push('missing_script')
  }
  if (/command not found|is not recognized as an internal or external command|ENOENT/i.test(output)) {
    diagnostics.push('command_not_found')
  }
  const ready = !!url || PERSISTENT_READY_PATTERNS.some(pattern => pattern.test(output))
  return {
    sessionId: undefined,
    ready,
    url,
    port: portMatch?.[1] ? Number(portMatch[1]) : undefined,
    diagnostics,
  }
}
