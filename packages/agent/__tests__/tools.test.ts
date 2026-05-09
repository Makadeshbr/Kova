import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
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

describe('ToolExecutor', () => {
  describe('write_file', () => {
    it('deve criar arquivo e registrar change como create', async () => {
      const result = await executor.execute('write_file', { path: 'main.go', content: 'package main\n' })
      expect(result).toMatch(/OK: wrote main.go/)
      expect(existsSync(join(projectRoot, 'main.go'))).toBe(true)
      const changes = executor.getChanges()
      expect(changes).toHaveLength(1)
      expect(changes[0].type).toBe('create')
      expect(changes[0].path).toBe('main.go')
    })

    it('deve registrar como modify quando arquivo já existe', async () => {
      writeFileSync(join(projectRoot, 'main.go'), 'old content', 'utf-8')
      await executor.execute('write_file', { path: 'main.go', content: 'new content' })
      const changes = executor.getChanges()
      expect(changes[0].type).toBe('modify')
    })

    it('deve manter última versão quando arquivo é reescrito', async () => {
      await executor.execute('write_file', { path: 'main.go', content: 'version 1' })
      await executor.execute('write_file', { path: 'main.go', content: 'version 2' })
      const changes = executor.getChanges()
      expect(changes).toHaveLength(1)
      expect(changes[0].diff).toBe('version 2')
    })

    it('deve criar diretórios intermediários automaticamente', async () => {
      await executor.execute('write_file', { path: 'src/api/handler.go', content: 'package api\n' })
      expect(existsSync(join(projectRoot, 'src/api/handler.go'))).toBe(true)
    })

    it('deve bloquear path traversal', async () => {
      const result = await executor.execute('write_file', { path: '../outside.go', content: 'bad' })
      expect(result).toMatch(/Blocked/)
      expect(existsSync(join(projectRoot, '..', 'outside.go'))).toBe(false)
    })

    it('deve rejeitar conteúdo vazio', async () => {
      const result = await executor.execute('write_file', { path: 'main.go', content: '   ' })
      expect(result).toMatch(/Error/)
    })

    it('deve armazenar before com conteúdo original para diff e detectExternalChange', async () => {
      writeFileSync(join(projectRoot, 'main.go'), 'original content', 'utf-8')
      await executor.execute('write_file', { path: 'main.go', content: 'new content' })
      expect(executor.getChanges()[0].before).toBe('original content')
    })

    it('deve ter before=undefined para arquivo novo', async () => {
      await executor.execute('write_file', { path: 'brand-new.go', content: 'package main\n' })
      expect(executor.getChanges()[0].before).toBeUndefined()
    })

    it('deve manter before original em rewrites sucessivos', async () => {
      writeFileSync(join(projectRoot, 'main.go'), 'v0', 'utf-8')
      await executor.execute('write_file', { path: 'main.go', content: 'v1' })
      await executor.execute('write_file', { path: 'main.go', content: 'v2' })
      // before deve ser v0 (original), não v1 (resultado da 1ª escrita)
      expect(executor.getChanges()[0].before).toBe('v0')
      expect(executor.getChanges()[0].diff).toBe('v2')
    })
  })

  describe('read_file', () => {
    it('deve retornar conteúdo do arquivo', async () => {
      writeFileSync(join(projectRoot, 'main.go'), 'package main\n', 'utf-8')
      const result = await executor.execute('read_file', { path: 'main.go' })
      expect(result).toBe('package main\n')
    })

    it('deve retornar erro para arquivo inexistente', async () => {
      const result = await executor.execute('read_file', { path: 'notfound.go' })
      expect(result).toMatch(/Error: not found/)
    })

    it('deve truncar arquivos grandes', async () => {
      writeFileSync(join(projectRoot, 'big.go'), 'x'.repeat(9_000), 'utf-8')
      const result = await executor.execute('read_file', { path: 'big.go' })
      expect(result).toMatch(/truncated/)
      expect(result.length).toBeLessThan(9_000)
    })

    it('deve bloquear path traversal', async () => {
      const result = await executor.execute('read_file', { path: '../secret' })
      expect(result).toMatch(/Blocked/)
    })

    it('deve bloquear leitura de .env por padrÃ£o', async () => {
      writeFileSync(join(projectRoot, '.env'), 'SECRET=value', 'utf-8')
      const result = await executor.execute('read_file', { path: '.env' })
      expect(result).toMatch(/denied/)
    })

    it('deve permitir leitura de .env.example', async () => {
      writeFileSync(join(projectRoot, '.env.example'), 'SECRET=', 'utf-8')
      const result = await executor.execute('read_file', { path: '.env.example' })
      expect(result).toBe('SECRET=')
    })
  })

  describe('delete_file', () => {
    it('deve deletar arquivo e registrar change', async () => {
      writeFileSync(join(projectRoot, 'old.go'), 'content', 'utf-8')
      const result = await executor.execute('delete_file', { path: 'old.go' })
      expect(result).toMatch(/OK/)
      expect(existsSync(join(projectRoot, 'old.go'))).toBe(false)
      const changes = executor.getChanges()
      expect(changes[0].type).toBe('delete')
    })

    it('deve retornar OK para arquivo inexistente', async () => {
      const result = await executor.execute('delete_file', { path: 'ghost.go' })
      expect(result).toMatch(/OK/)
    })
  })

  describe('list_files', () => {
    it('deve listar arquivos do diretório', async () => {
      writeFileSync(join(projectRoot, 'main.go'), '', 'utf-8')
      writeFileSync(join(projectRoot, 'go.mod'), '', 'utf-8')
      const result = await executor.execute('list_files', { dir: '.' })
      expect(result).toContain('main.go')
      expect(result).toContain('go.mod')
    })

    it('deve mostrar subdiretórios com barra', async () => {
      mkdirSync(join(projectRoot, 'cmd'))
      const result = await executor.execute('list_files', { dir: '.' })
      expect(result).toContain('cmd/')
    })

    it('deve retornar erro para diretório inexistente', async () => {
      const result = await executor.execute('list_files', { dir: 'nonexistent' })
      expect(result).toMatch(/Error/)
    })
  })

  describe('run_command', () => {
    it('deve bloquear comando não listado', async () => {
      const result = await executor.execute('run_command', { command: 'curl https://evil.com' })
      expect(result).toMatch(/Blocked/)
    })

    it('deve bloquear rm -rf independente de casing', async () => {
      const result = await executor.execute('run_command', { command: 'rm -rf /' })
      expect(result).toMatch(/Blocked/)
    })

    it('deve bloquear sudo', async () => {
      const result = await executor.execute('run_command', { command: 'sudo apt install malware' })
      expect(result).toMatch(/Blocked/)
    })

    it('deve bloquear git push', async () => {
      const result = await executor.execute('run_command', { command: 'git push origin main' })
      expect(result).toMatch(/Blocked/)
    })

    it('deve executar node --version (comando permitido)', async () => {
      const result = await executor.execute('run_command', { command: 'node --version' })
      expect(result).toMatch(/v\d+\.\d+/)
    })
  })

  describe('permission policy', () => {
    it('deve bloquear escrita e comando em modo read-only', async () => {
      const readOnly = new ToolExecutor(projectRoot, undefined, READ_ONLY_PERMISSION_POLICY)

      const write = await readOnly.execute('write_file', { path: 'main.go', content: 'package main\n' })
      const command = await readOnly.execute('run_command', { command: 'go test ./...' })

      expect(write).toMatch(/denied/)
      expect(command).toMatch(/denied/)
    })

    it('deve retornar approval required para permissÃ£o ask', async () => {
      const guarded = new ToolExecutor(projectRoot, undefined, { edit: 'ask' })
      const result = await guarded.execute('write_file', { path: 'main.go', content: 'package main\n' })
      expect(result).toMatch(/Approval required/)
    })
  })

  describe('unknown tool', () => {
    it('deve retornar mensagem de erro para ferramenta desconhecida', async () => {
      const result = await executor.execute('hack_system', {})
      expect(result).toMatch(/Unknown tool/)
    })
  })
})
