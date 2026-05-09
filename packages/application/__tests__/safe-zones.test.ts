import { describe, it, expect } from 'vitest'
import { isSafeZone } from '../src/safe-zones'

describe('isSafeZone', () => {
  describe('padrões default — secrets', () => {
    it('deve proteger .env', () => {
      expect(isSafeZone('.env')).toBe(true)
    })

    it('deve proteger .env.production', () => {
      expect(isSafeZone('.env.production')).toBe(true)
    })

    it('deve proteger .env.local', () => {
      expect(isSafeZone('.env.local')).toBe(true)
    })

    it('deve proteger arquivos .pem, .key, .cert', () => {
      expect(isSafeZone('server.pem')).toBe(true)
      expect(isSafeZone('private.key')).toBe(true)
      expect(isSafeZone('ssl.cert')).toBe(true)
      expect(isSafeZone('keystore.p12')).toBe(true)
      expect(isSafeZone('cert.pfx')).toBe(true)
    })
  })

  describe('padrões default — lockfiles', () => {
    it('deve proteger pnpm-lock.yaml', () => {
      expect(isSafeZone('pnpm-lock.yaml')).toBe(true)
    })

    it('deve proteger package-lock.json', () => {
      expect(isSafeZone('package-lock.json')).toBe(true)
    })

    it('deve proteger yarn.lock', () => {
      expect(isSafeZone('yarn.lock')).toBe(true)
    })

    it('deve proteger Cargo.lock', () => {
      expect(isSafeZone('Cargo.lock')).toBe(true)
    })

    it('deve proteger go.sum', () => {
      expect(isSafeZone('go.sum')).toBe(true)
    })
  })

  describe('padrões default — CI/CD', () => {
    it('deve proteger arquivos em .github/', () => {
      expect(isSafeZone('.github/workflows/ci.yml')).toBe(true)
    })
  })

  describe('arquivos seguros (não safe zone)', () => {
    it('não deve bloquear src/index.ts', () => {
      expect(isSafeZone('src/index.ts')).toBe(false)
    })

    it('não deve bloquear src/config.ts', () => {
      expect(isSafeZone('src/config.ts')).toBe(false)
    })

    it('não deve bloquear README.md', () => {
      expect(isSafeZone('README.md')).toBe(false)
    })

    // package.json was intentionally removed from safe zones so the agent
    // can add dependencies via npm/pnpm install and run setup scripts.
    it('não deve bloquear package.json (permite agente instalar deps)', () => {
      expect(isSafeZone('package.json')).toBe(false)
    })

    it('não deve bloquear package.ts', () => {
      expect(isSafeZone('package.ts')).toBe(false)
    })
  })

  describe('config customizado', () => {
    it('deve usar padrões customizados quando fornecidos', () => {
      const config = { patterns: ['secrets/**', 'private.key'] }
      expect(isSafeZone('secrets/token.txt', config)).toBe(true)
      expect(isSafeZone('private.key', config)).toBe(true)
      expect(isSafeZone('.env', config)).toBe(false)
    })
  })

  describe('separador de path Windows', () => {
    it('deve normalizar backslashes', () => {
      // .github/workflows/ci.yml com backslash
      expect(isSafeZone('.github\\workflows\\ci.yml')).toBe(true)
    })
  })
})
