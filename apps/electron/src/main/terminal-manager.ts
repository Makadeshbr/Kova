import { join, resolve, relative } from 'node:path'
import type { WebContents } from 'electron'

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
}

export interface InteractiveResult {
  exitCode: number
  output: string
}

const INTERACTIVE_ALLOWLIST = new Set([
  'gh', 'git', 'npm', 'npx', 'pnpm', 'yarn', 'bun',
  'node', 'python', 'python3', 'pip', 'pip3', 'uv',
  'cargo', 'rustup', 'go', 'mvn', 'gradle',
  'dotnet', 'docker', 'kubectl', 'aws', 'gcloud', 'az',
  'heroku', 'vercel', 'fly', 'railway', 'ssh', 'sftp',
])

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>()
  private webContents: WebContents | null = null
  private projectRoot: string | null = null
  private pendingApprovals = new Map<string, {
    resolve: (approved: boolean) => void
    reject: (err: Error) => void
  }>()

  constructor(private readonly ptyImpl = pty) {}

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
        output: 'Terminal interativo nao disponivel. O modulo node-pty nao esta compilado para esta versao do Electron. Execute: npx @electron/rebuild',
      }
    }

    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const exe = command.trim().split(/\s+/)[0]

    if (!INTERACTIVE_ALLOWLIST.has(exe)) {
      return {
        exitCode: 1,
        output: `Comando "${exe}" nao esta na allowlist de comandos interativos. Comandos permitidos: ${[...INTERACTIVE_ALLOWLIST].join(', ')}`,
      }
    }

    const safeCwd = this.resolveSafeCwd(cwd)
    if (!safeCwd) {
      return {
        exitCode: 1,
        output: this.projectRoot
          ? `cwd "${cwd}" esta fora do projeto "${this.projectRoot}" — execucao bloqueada.`
          : 'Nenhum projeto aberto — terminal nao pode ser executado.',
      }
    }

    const approved = await this.requestApproval(id, command, reason)
    if (!approved) {
      return { exitCode: 1, output: 'Usuario negou a execucao do comando interativo.' }
    }

    return this.startSession(id, command, safeCwd)
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
    this.sessions.get(id)?.pty.write(data)
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
      try { session.pty.kill() } catch { /* ignore */ }
      this.sessions.delete(id)
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

  private startSession(id: string, command: string, cwd: string): Promise<InteractiveResult> {
    return new Promise((resolve) => {
      if (!this.ptyImpl) {
        resolve({ exitCode: 1, output: 'node-pty not available' })
        return
      }

      const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL ?? '/bin/bash'
      const args = process.platform === 'win32' ? ['/c', command] : ['-c', command]

      let outputBuf = ''

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
        id, command, cwd, pty: ptyProcess, outputBuf, exitCode: null,
      }
      this.sessions.set(id, session)

      this.webContents?.send('kova:terminal-started', { id, command, cwd })

      ptyProcess.onData((data) => {
        outputBuf += data
        session.outputBuf = outputBuf
        this.webContents?.send('kova:terminal-data', { id, data })
      })

      ptyProcess.onExit(({ exitCode }) => {
        session.exitCode = exitCode
        this.webContents?.send('kova:terminal-exit', { id, exitCode })
        this.sessions.delete(id)
        resolve({ exitCode, output: outputBuf })
      })
    })
  }
}

export const terminalManager = new TerminalManager()
