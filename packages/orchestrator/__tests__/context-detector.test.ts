import { describe, it, expect } from 'vitest'
import { detectContext } from '../src/context-detector'

describe('detectContext — UI', () => {
  it('deve retornar perfil UI para .tsx', () => {
    const p = detectContext('src/components/Button.tsx')
    expect(p.fileType).toBe('ui')
    expect(p.nestingLimit).toBe(4)
    expect(p.cyclomaticLimit).toBe(15)
  })

  it('deve retornar perfil UI para .vue', () => {
    expect(detectContext('src/views/Home.vue').fileType).toBe('ui')
  })

  it('deve retornar perfil UI para .css', () => {
    expect(detectContext('src/styles/main.css').fileType).toBe('ui')
  })
})

describe('detectContext — test', () => {
  it('deve retornar perfil test para .test.ts', () => {
    expect(detectContext('src/utils/math.test.ts').fileType).toBe('test')
  })

  it('deve retornar perfil test para .spec.ts', () => {
    expect(detectContext('src/engine.spec.ts').fileType).toBe('test')
  })

  it('deve retornar perfil test para arquivos em __tests__/', () => {
    expect(detectContext('__tests__/layers/build.test.ts').fileType).toBe('test')
  })
})

describe('detectContext — config', () => {
  it('deve retornar perfil config para tsconfig.json', () => {
    expect(detectContext('tsconfig.json').fileType).toBe('config')
  })

  it('deve retornar perfil config para package.json', () => {
    expect(detectContext('package.json').fileType).toBe('config')
  })

  it('deve retornar perfil config para .env', () => {
    expect(detectContext('.env.production').fileType).toBe('config')
  })

  it('deve retornar perfil config para vite.config.ts', () => {
    expect(detectContext('vite.config.ts').fileType).toBe('config')
  })
})

describe('detectContext — logic', () => {
  it('deve retornar perfil logic para .ts', () => {
    const p = detectContext('src/utils/math.ts')
    expect(p.fileType).toBe('logic')
    expect(p.nestingLimit).toBe(2)
    expect(p.cyclomaticLimit).toBe(10)
  })

  it('deve ter limites mais rígidos que UI', () => {
    const logic = detectContext('src/engine.ts')
    const ui = detectContext('src/Component.tsx')
    expect(logic.cyclomaticLimit).toBeLessThan(ui.cyclomaticLimit)
    expect(logic.nestingLimit).toBeLessThan(ui.nestingLimit)
    expect(logic.functionSizeLimit).toBeLessThan(ui.functionSizeLimit)
  })
})
