import { describe, expect, it, vi, afterEach } from 'vitest'
import { TerminalManager } from '../src/main/terminal-manager'

type DataHandler = (data: string) => void
type ExitHandler = (event: { exitCode: number }) => void

class FakePtyProcess {
  dataHandler: DataHandler | null = null
  exitHandler: ExitHandler | null = null
  write = vi.fn()
  resize = vi.fn()
  kill = vi.fn(() => this.exitHandler?.({ exitCode: 143 }))

  onData(handler: DataHandler): void {
    this.dataHandler = handler
  }

  onExit(handler: ExitHandler): void {
    this.exitHandler = handler
  }
}

function makePty() {
  const processes: FakePtyProcess[] = []
  return {
    processes,
    pty: {
      spawn: vi.fn((_shell: string, _args: string[], _opts: unknown) => {
        const proc = new FakePtyProcess()
        processes.push(proc)
        return proc
      }),
    },
  }
}

function makeWebContents() {
  return {
    sent: [] as Array<{ channel: string; payload: any }>,
    send(channel: string, payload: any) {
      this.sent.push({ channel, payload })
    },
  }
}

describe('TerminalManager', () => {
  it('bloqueia comandos interativos fora da allowlist antes de pedir aprovacao', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)

    const result = await manager.runInteractive('powershell -nop', process.cwd(), 'unsafe shell')

    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('nao esta na allowlist')
    expect(pty.spawn).not.toHaveBeenCalled()
    expect(wc.sent.some(item => item.channel === 'kova:interactive-request')).toBe(false)
  })

  it('pede aprovacao, abre PTY aprovado e retorna output ao sair', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const promise = manager.runInteractive('npm login', process.cwd(), 'auth required')
    const approval = wc.sent.find(item => item.channel === 'kova:interactive-request')
    expect(approval?.payload.command).toBe('npm login')

    manager.approveInteractive(approval!.payload.id, true)
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())

    processes[0].dataHandler?.('hello\n')
    processes[0].exitHandler?.({ exitCode: 0 })

    await expect(promise).resolves.toEqual({ exitCode: 0, output: 'hello\n' })
    expect(wc.sent.map(item => item.channel)).toContain('kova:terminal-started')
    expect(wc.sent.map(item => item.channel)).toContain('kova:terminal-data')
    expect(wc.sent.map(item => item.channel)).toContain('kova:terminal-exit')
  })

  it('nao abre PTY quando usuario nega aprovacao', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const promise = manager.runInteractive('gh auth login', process.cwd(), 'auth')
    const approval = wc.sent.find(item => item.channel === 'kova:interactive-request')
    manager.approveInteractive(approval!.payload.id, false)

    await expect(promise).resolves.toMatchObject({ exitCode: 1 })
    expect(pty.spawn).not.toHaveBeenCalled()
  })

  it('writeInput, resize e kill encaminham para a sessao correta', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)

    manager.setProjectRoot(process.cwd())
    manager.openTerminal('term-1', 'npm --version', process.cwd())
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())

    manager.writeInput('term-1', 'abc')
    manager.resize('term-1', 90, 24)
    manager.kill('term-1')

    expect(processes[0].write).toHaveBeenCalledWith('abc')
    expect(processes[0].resize).toHaveBeenCalledWith(90, 24)
    expect(processes[0].kill).toHaveBeenCalledOnce()
  })
})

describe('TerminalManager — workspace path containment', () => {
  it('runInteractive bloqueia cwd fora do projectRoot', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot('/home/user/project')

    const result = await manager.runInteractive('npm test', '/etc/passwd', 'test')

    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('fora do projeto')
    expect(pty.spawn).not.toHaveBeenCalled()
    expect(wc.sent.some(item => item.channel === 'kova:interactive-request')).toBe(false)
  })

  it('runInteractive bloqueia path traversal via cwd', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const result = await manager.runInteractive('npm test', '../../../etc', 'test')
    expect(result.exitCode).toBe(1)
    expect(pty.spawn).not.toHaveBeenCalled()
  })

  it('runInteractive permite cwd dentro do projectRoot', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const promise = manager.runInteractive('npm test', process.cwd(), 'test')
    const approval = wc.sent.find(item => item.channel === 'kova:interactive-request')
    manager.approveInteractive(approval!.payload.id, true)
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
    processes[0].exitHandler?.({ exitCode: 0 })
    await promise

    expect(pty.spawn).toHaveBeenCalled()
  })

  it('runInteractive bloqueia execucao quando projectRoot nao foi configurado', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    // No setProjectRoot call

    const result = await manager.runInteractive('npm test', '/tmp', 'test')

    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('projeto')
    expect(pty.spawn).not.toHaveBeenCalled()
  })

  it('openTerminal nao abre PTY com cwd fora do projectRoot', () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot('/home/user/project')

    manager.openTerminal('rogue-1', 'cat /etc/passwd', '/etc')

    expect(pty.spawn).not.toHaveBeenCalled()
    expect(wc.sent.some(item => item.channel === 'kova:terminal-exit')).toBe(true)
  })

  it('openTerminal abre PTY com cwd igual ao projectRoot', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    manager.openTerminal('valid-1', 'node --version', process.cwd())
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
  })

  it('openTerminal cwd vazio fallback para projectRoot — nunca process.cwd()', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    const root = process.cwd()
    manager.setProjectRoot(root)

    manager.openTerminal('empty-cwd', 'node --version', '')
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
    const spawnCall = (pty.spawn as ReturnType<typeof vi.fn>).mock.calls[0]
    const opts = spawnCall[2] as { cwd: string }
    expect(opts.cwd).toBe(root)
  })
})

// ─── PTY unavailable ──────────────────────────────────────────────────────────

describe('TerminalManager — PTY unavailable (pty = null)', () => {
  it('isAvailable retorna false quando pty e null', () => {
    const manager = new TerminalManager(null as never)
    expect(manager.isAvailable).toBe(false)
  })

  it('isAvailable retorna true quando pty esta carregado', () => {
    const { pty } = makePty()
    const manager = new TerminalManager(pty as never)
    expect(manager.isAvailable).toBe(true)
  })

  it('runInteractive retorna mensagem de erro clara quando pty e null', async () => {
    const manager = new TerminalManager(null as never)
    manager.setWebContents(makeWebContents() as never)
    manager.setProjectRoot(process.cwd())

    const result = await manager.runInteractive('npm login', process.cwd(), 'auth')

    expect(result.exitCode).toBe(1)
    expect(result.output).toMatch(/node-pty|terminal|nao disponivel/i)
  })

  it('openTerminal emite terminal-exit e nao trava quando pty e null', () => {
    const wc = makeWebContents()
    const manager = new TerminalManager(null as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    manager.openTerminal('t1', 'npm --version', process.cwd())

    expect(wc.sent.some(s => s.channel === 'kova:terminal-exit')).toBe(true)
  })
})

// ─── Lifecycle de sessão ──────────────────────────────────────────────────────

describe('TerminalManager — session lifecycle', () => {
  it('sessao e removida do mapa interno apos PTY sair naturalmente', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    manager.openTerminal('sess-1', 'node --version', process.cwd())
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
    processes[0].exitHandler?.({ exitCode: 0 })

    // Após exit: writeInput no mesmo ID deve ser no-op (sessão não existe mais)
    expect(() => manager.writeInput('sess-1', 'data')).not.toThrow()
    expect(processes[0].write).not.toHaveBeenCalled()
  })

  it('sessao e removida do mapa interno apos kill()', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    manager.openTerminal('sess-2', 'npm --version', process.cwd())
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())

    manager.kill('sess-2')

    expect(processes[0].kill).toHaveBeenCalledOnce()
    // Session gone — second kill must be no-op
    expect(() => manager.kill('sess-2')).not.toThrow()
    expect(processes[0].kill).toHaveBeenCalledOnce() // still just once
  })

  it('duas sessoes concorrentes sao gerenciadas de forma independente', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    manager.openTerminal('a', 'npm --version', process.cwd())
    manager.openTerminal('b', 'node --version', process.cwd())
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledTimes(2))

    manager.writeInput('a', 'input-a')
    manager.writeInput('b', 'input-b')

    expect(processes[0].write).toHaveBeenCalledWith('input-a')
    expect(processes[1].write).toHaveBeenCalledWith('input-b')
    expect(processes[0].write).not.toHaveBeenCalledWith('input-b')
    expect(processes[1].write).not.toHaveBeenCalledWith('input-a')
  })

  it('multiples data events acumulam corretamente no output buffer', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const promise = manager.runInteractive('gh auth login', process.cwd(), 'auth')
    const req = wc.sent.find(s => s.channel === 'kova:interactive-request')
    manager.approveInteractive(req!.payload.id, true)
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())

    processes[0].dataHandler?.('chunk-1\n')
    processes[0].dataHandler?.('chunk-2\n')
    processes[0].dataHandler?.('chunk-3\n')
    processes[0].exitHandler?.({ exitCode: 0 })

    const result = await promise
    expect(result.output).toBe('chunk-1\nchunk-2\nchunk-3\n')
  })
})

// ─── Operações resilientes em sessões inexistentes ────────────────────────────

describe('TerminalManager — ops resilientes em sessoes inexistentes', () => {
  function makeManager() {
    const { pty } = makePty()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(makeWebContents() as never)
    manager.setProjectRoot(process.cwd())
    return manager
  }

  it('writeInput em ID desconhecido nao lanca excecao', () => {
    expect(() => makeManager().writeInput('ghost-id', 'data')).not.toThrow()
  })

  it('resize em ID desconhecido nao lanca excecao', () => {
    expect(() => makeManager().resize('ghost-id', 80, 24)).not.toThrow()
  })

  it('kill em ID desconhecido nao lanca excecao', () => {
    expect(() => makeManager().kill('ghost-id')).not.toThrow()
  })

  it('approveInteractive em ID desconhecido nao lanca excecao', () => {
    expect(() => makeManager().approveInteractive('ghost-id', true)).not.toThrow()
  })
})

// ─── Casos de borda de aprovação ─────────────────────────────────────────────

describe('TerminalManager — approval edge cases', () => {
  afterEach(() => vi.useRealTimers())

  it('timeout de aprovacao auto-resolve como negado apos 60 segundos', async () => {
    vi.useFakeTimers()
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const promise = manager.runInteractive('gh auth login', process.cwd(), 'test')
    // Approval request enviado — nao chamar approveInteractive
    await vi.runAllTimersAsync()

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('negou')
    expect(pty.spawn).not.toHaveBeenCalled()
  })

  it('duas aprovacoes pendentes simultaneas sao resolvidas de forma independente', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const cwd = process.cwd()
    const p1 = manager.runInteractive('gh auth login', cwd, 'auth gh')
    const p2 = manager.runInteractive('npm login', cwd, 'auth npm')

    const requests = wc.sent.filter(s => s.channel === 'kova:interactive-request')
    const id1 = requests[0]?.payload.id
    const id2 = requests[1]?.payload.id

    manager.approveInteractive(id1, false)   // gh negado
    manager.approveInteractive(id2, true)    // npm aprovado

    const r1 = await p1
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
    processes[0].exitHandler?.({ exitCode: 0 })
    const r2 = await p2

    expect(r1.exitCode).toBe(1)     // gh negado
    expect(r1.output).toContain('negou')
    expect(r2.exitCode).toBe(0)     // npm concluiu com sucesso
    expect(pty.spawn).toHaveBeenCalledOnce()  // apenas npm abriu PTY
  })

  it('approveInteractive chamado duas vezes para o mesmo ID: segunda chamada e no-op', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const promise = manager.runInteractive('gh auth login', process.cwd(), 'auth')
    const req = wc.sent.find(s => s.channel === 'kova:interactive-request')
    const id = req!.payload.id

    manager.approveInteractive(id, true)     // primera chamada: aprova
    manager.approveInteractive(id, false)    // segunda: no-op (ja removido do mapa)

    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
    processes[0].exitHandler?.({ exitCode: 0 })
    const result = await promise

    expect(result.exitCode).toBe(0)   // aprovado na primera chamada
  })

  it('runInteractive sem webContents configurado retorna negado sem travar', async () => {
    const { pty } = makePty()
    const manager = new TerminalManager(pty as never)
    manager.setProjectRoot(process.cwd())
    // Sem setWebContents

    const result = await manager.runInteractive('gh auth login', process.cwd(), 'auth')

    expect(result.exitCode).toBe(1)
    expect(pty.spawn).not.toHaveBeenCalled()
  })
})

// ─── Payloads exatos dos eventos IPC ─────────────────────────────────────────

describe('TerminalManager — payloads exatos dos eventos IPC', () => {
  it('kova:interactive-request contem {id, command, reason}', async () => {
    const { pty } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const p = manager.runInteractive('gh auth login', process.cwd(), 'need github token')
    const req = wc.sent.find(s => s.channel === 'kova:interactive-request')
    manager.approveInteractive(req!.payload.id, false)
    await p

    expect(req?.payload).toMatchObject({
      id: expect.any(String),
      command: 'gh auth login',
      reason: 'need github token',
    })
  })

  it('kova:terminal-started contem {id, command, cwd} corretos', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    const root = process.cwd()
    manager.setProjectRoot(root)

    const p = manager.runInteractive('gh auth login', root, 'auth')
    const req = wc.sent.find(s => s.channel === 'kova:interactive-request')
    manager.approveInteractive(req!.payload.id, true)
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())

    const started = wc.sent.find(s => s.channel === 'kova:terminal-started')
    expect(started?.payload).toMatchObject({
      id: req!.payload.id,
      command: 'gh auth login',
      cwd: root,
    })

    processes[0].exitHandler?.({ exitCode: 0 })
    await p
  })

  it('kova:terminal-data contem {id, data} corretos para cada chunk', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const p = manager.runInteractive('gh auth login', process.cwd(), 'auth')
    const req = wc.sent.find(s => s.channel === 'kova:interactive-request')
    manager.approveInteractive(req!.payload.id, true)
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())

    processes[0].dataHandler?.('output line 1\n')
    processes[0].dataHandler?.('output line 2\n')

    const dataEvents = wc.sent.filter(s => s.channel === 'kova:terminal-data')
    expect(dataEvents[0]?.payload).toMatchObject({ id: req!.payload.id, data: 'output line 1\n' })
    expect(dataEvents[1]?.payload).toMatchObject({ id: req!.payload.id, data: 'output line 2\n' })

    processes[0].exitHandler?.({ exitCode: 0 })
    await p
  })

  it('kova:terminal-exit contem {id, exitCode} corretos', async () => {
    const { pty, processes } = makePty()
    const wc = makeWebContents()
    const manager = new TerminalManager(pty as never)
    manager.setWebContents(wc as never)
    manager.setProjectRoot(process.cwd())

    const p = manager.runInteractive('gh auth login', process.cwd(), 'auth')
    const req = wc.sent.find(s => s.channel === 'kova:interactive-request')
    manager.approveInteractive(req!.payload.id, true)
    await vi.waitFor(() => expect(pty.spawn).toHaveBeenCalledOnce())
    processes[0].exitHandler?.({ exitCode: 42 })
    await p

    const exit = wc.sent.find(s => s.channel === 'kova:terminal-exit')
    expect(exit?.payload).toMatchObject({ id: req!.payload.id, exitCode: 42 })
  })
})
