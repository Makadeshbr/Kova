import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { GoAdapter } from '../src/go'

let tmpDir: string

function makeTmpDir(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-go-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('GoAdapter.detect', () => {
  it('deve retornar true para pasta com go.mod', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'go.mod'), 'module example.com/demo')
    expect(GoAdapter.detect(dir)).toBe(true)
  })

  it('deve retornar false para pasta sem go.mod', () => {
    const dir = makeTmpDir()
    expect(GoAdapter.detect(dir)).toBe(false)
  })
})

describe('GoAdapter.parseImports', () => {
  it('deve extrair import simples', () => {
    const imports = GoAdapter.parseImports('main.go', 'package main\nimport "fmt"')
    expect(imports).toContain('fmt')
  })

  it('deve extrair import com alias', () => {
    const imports = GoAdapter.parseImports('main.go', 'package main\nimport log "github.com/acme/log"')
    expect(imports).toContain('github.com/acme/log')
  })

  it('deve extrair bloco de imports', () => {
    const content = `package main

import (
  "fmt"
  "os"
  json "encoding/json"
)
`
    const imports = GoAdapter.parseImports('main.go', content)
    expect(imports).toContain('fmt')
    expect(imports).toContain('os')
    expect(imports).toContain('encoding/json')
  })
})
