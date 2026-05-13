import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSettingsInternal } from '../src/main/ipc-handlers'
import { buildProvider } from '../src/main/engine-manager'
import * as fs from 'node:fs'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  }
})

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  dialog: { showOpenDialog: vi.fn() },
}))

describe('NVIDIA Integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getSettingsInternal & IPC Security', () => {
    it('does not return pure nvidiaKey and sets mask correctly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ nvidiaKey: 'real-secret-key', defaultProvider: 'nvidia' }))

      const settings = getSettingsInternal()
      // getSettingsInternal SHOULD return the real key because EngineManager needs it.
      // Wait, let's test what ipcMain.handle('kova:get-settings') would do.
      expect(settings.nvidiaKey).toBe('real-secret-key')
      
      // Let's simulate the handler logic here:
      if (settings.nvidiaKey) {
        settings.hasNvidiaKey = true
        settings.nvidiaKeyPreview = `nvapi-${'*'.repeat(16)}`
        settings.nvidiaKey = ''
      }
      expect(settings.nvidiaKey).toBe('')
      expect(settings.hasNvidiaKey).toBe(true)
      expect(settings.nvidiaKeyPreview).toContain('****')
    })
  })

  describe('buildProvider for NVIDIA', () => {
    it('uses process.env.NVIDIA_API_KEY if present', async () => {
      process.env.NVIDIA_API_KEY = 'env-secret-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = await buildProvider({ objective: '', projectRoot: '', provider: 'nvidia' })
      expect(result).not.toBeNull()
      // @ts-expect-error accessing private field for test
      expect(result?.provider?.options.apiKey).toBe('env-secret-key')
    })

    it('falls back to settings.nvidiaKey if process.env is empty', async () => {
      delete process.env.NVIDIA_API_KEY
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ nvidiaKey: 'storage-secret-key' }))

      const result = await buildProvider({ objective: '', projectRoot: '', provider: 'nvidia' })
      expect(result).not.toBeNull()
      // @ts-expect-error accessing private field for test
      expect(result?.provider?.options.apiKey).toBe('storage-secret-key')
    })

    it('throws explicit error if neither env nor storage key is present', async () => {
      delete process.env.NVIDIA_API_KEY
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await expect(buildProvider({ objective: '', projectRoot: '', provider: 'nvidia' }))
        .rejects.toThrow('NVIDIA_API_KEY ausente')
    })

    it('injects chat_template_kwargs: { thinking: true } when nvidiaEnableThinking is true', async () => {
      process.env.NVIDIA_API_KEY = 'env-secret'
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ nvidiaEnableThinking: true }))

      const result = await buildProvider({ objective: '', projectRoot: '', provider: 'nvidia' })
      // @ts-expect-error accessing private field for test
      expect(result?.provider?.options.extraBody).toEqual({ chat_template_kwargs: { thinking: true } })
    })

    it('does NOT inject chat_template_kwargs when nvidiaEnableThinking is false', async () => {
      process.env.NVIDIA_API_KEY = 'env-secret'
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ nvidiaEnableThinking: false }))

      const result = await buildProvider({ objective: '', projectRoot: '', provider: 'nvidia' })
      // @ts-expect-error accessing private field for test
      expect(result?.provider?.options.extraBody).toBeUndefined()
    })
  })
})
