/**
 * IPC security regression tests.
 *
 * The `validateProjectPath` function is the primary defense against path traversal
 * attacks in the renderer→main IPC bridge. These tests ensure that malicious paths
 * crafted by a compromised renderer cannot read/write files outside the project.
 *
 * TDD: a new attack vector must have a test case before the fix.
 */
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { validateProjectPath, resolveTrustedProjectRoot } from '../src/main/ipc-handlers'
import { isTrustedIpcSender, mergeSettingsForSave, sanitizeStartTaskParams } from '../src/main/ipc-security'

const ROOT = '/home/user/project'  // canonical project root

describe('validateProjectPath — path traversal prevention', () => {
  it('allows a normal relative path within the root', () => {
    const result = validateProjectPath('src/app.ts', ROOT)
    expect(result).toBe(resolve(ROOT, 'src/app.ts'))
  })

  it('allows a path that is exactly the root file', () => {
    const result = validateProjectPath('README.md', ROOT)
    expect(result).toBe(resolve(ROOT, 'README.md'))
  })

  it('allows a nested path within the root', () => {
    const result = validateProjectPath('packages/shared/src/types.ts', ROOT)
    expect(result).not.toBeNull()
  })

  it('blocks path traversal with ../', () => {
    const result = validateProjectPath('../../etc/passwd', ROOT)
    expect(result).toBeNull()
  })

  it('blocks path traversal with multiple ../ segments', () => {
    const result = validateProjectPath('../../../etc/shadow', ROOT)
    expect(result).toBeNull()
  })

  it('blocks path traversal disguised with nested traversal', () => {
    const result = validateProjectPath('src/../../../etc/passwd', ROOT)
    expect(result).toBeNull()
  })

  it('blocks absolute path outside the root', () => {
    const result = validateProjectPath('/etc/passwd', ROOT)
    expect(result).toBeNull()
  })

  it('blocks absolute path that starts with a different root', () => {
    const result = validateProjectPath('/home/attacker/evil.sh', ROOT)
    expect(result).toBeNull()
  })

  it('returns null for empty filePath', () => {
    expect(validateProjectPath('', ROOT)).toBeNull()
    expect(validateProjectPath('   ', ROOT)).toBeNull()
  })

  it('returns null when allowedRoot is empty', () => {
    expect(validateProjectPath('src/app.ts', '')).toBeNull()
  })

  it('allows paths within a Windows-style root (cross-platform check)', () => {
    const winRoot = 'C:\\Users\\user\\project'
    const result = validateProjectPath('src\\app.ts', winRoot)
    // On any platform, the path should be resolved without escaping the root
    expect(result).not.toBeNull()
  })

  it('blocks a Windows path traversal attempt', () => {
    const winRoot = 'C:\\Users\\user\\project'
    const result = validateProjectPath('..\\..\\Windows\\System32', winRoot)
    expect(result).toBeNull()
  })
})

describe('IPC origin and payload validation', () => {
  it('allows file origin in production', () => {
    expect(isTrustedIpcSender({ senderFrame: { url: 'file:///app/index.html' } as any }, false)).toBe(true)
  })

  it('allows localhost origin only in dev', () => {
    const event = { senderFrame: { url: 'http://localhost:5173/' } as any }
    expect(isTrustedIpcSender(event, true)).toBe(true)
    expect(isTrustedIpcSender(event, false)).toBe(false)
  })

  it('blocks remote origin', () => {
    expect(isTrustedIpcSender({ senderFrame: { url: 'https://evil.example/app' } as any }, true)).toBe(false)
  })

  it('blocks invalid send-message payload', () => {
    expect(() => sanitizeStartTaskParams({ objective: 'x', projectRoot: '', maxIterations: 999 })).toThrow('Invalid number payload')
  })

  it('allows projectless chat payloads', () => {
    const params = sanitizeStartTaskParams({ objective: 'hello', mode: 'chat', maxIterations: 5 })
    expect(params.projectRoot).toBeUndefined()
    expect(params.mode).toBe('chat')
  })

  it('blocks projectless code modes', () => {
    expect(() => sanitizeStartTaskParams({ objective: 'build this', mode: 'patch', maxIterations: 5 }))
      .toThrow('Project folder required for this mode')
    expect(() => sanitizeStartTaskParams({ objective: 'plan this', mode: 'plan', maxIterations: 5 }))
      .toThrow('Project folder required for this mode')
    expect(() => sanitizeStartTaskParams({ objective: 'review this', mode: 'review', maxIterations: 5 }))
      .toThrow('Project folder required for this mode')
  })

  it('settings save does not overwrite masked NVIDIA secret', () => {  // anchor
    const merged = mergeSettingsForSave({
      defaultProvider: 'nvidia',
      anthropicKey: '',
      openaiKey: '',
      deepseekKey: '',
      openrouterKey: '',
      kimiKey: '',
      geminiKey: '',
      xaiKey: '',
      openaiCompatibleKey: '',
      ollamaUrl: 'http://localhost:11434/v1',
      compatibleUrl: 'http://localhost:1234/v1',
      model: 'model',
      autoApply: true,
      maxIterations: 5,
      nvidiaKey: 'nvapi-****************',
    }, { nvidiaKey: 'nvapi-real-secret' })
    expect(merged.nvidiaKey).toBe('nvapi-real-secret')
  })

  it('settings save preserves masked cloud provider secrets', () => {
    const merged = mergeSettingsForSave({
      defaultProvider: 'openai',
      anthropicKey: 'sk-ant****************',
      openaiKey: 'sk-pro****************',
      deepseekKey: '',
      openrouterKey: '',
      kimiKey: '',
      geminiKey: '',
      xaiKey: '',
      openaiCompatibleKey: '',
      ollamaUrl: 'http://localhost:11434/v1',
      compatibleUrl: 'http://localhost:1234/v1',
      model: '',
      autoApply: true,
      permissionMode: 'auto-review',
      maxIterations: 5,
    }, {
      anthropicKey: 'sk-ant-real',
      openaiKey: 'sk-proj-real',
    })
    expect(merged.anthropicKey).toBe('sk-ant-real')
    expect(merged.openaiKey).toBe('sk-proj-real')
  })
})

describe('resolveTrustedProjectRoot — memory handler path validation', () => {
  const ROOT = '/home/user/project'

  it('returns trusted root when renderer sends the matching path', () => {
    expect(resolveTrustedProjectRoot(ROOT, ROOT)).toBe(ROOT)
  })

  it('returns trusted root when renderer sends a path within the workspace', () => {
    // memory inside a subdir still resolves to the workspace root (the trusted source)
    expect(resolveTrustedProjectRoot('/home/user/project/sub', ROOT)).toBe(ROOT)
  })

  it('rejects renderer-supplied path outside the trusted workspace', () => {
    // Compromised renderer trying to read learnings from a different project
    expect(resolveTrustedProjectRoot('/home/attacker/secrets', ROOT)).toBeNull()
  })

  it('rejects path traversal attempt', () => {
    expect(resolveTrustedProjectRoot('/home/user/project/../../etc/passwd', ROOT)).toBeNull()
  })

  it('returns null when no project is open', () => {
    expect(resolveTrustedProjectRoot(ROOT, null)).toBeNull()
  })

  it('rejects non-string input', () => {
    expect(resolveTrustedProjectRoot(null, ROOT)).toBeNull()
    expect(resolveTrustedProjectRoot(undefined, ROOT)).toBeNull()
    expect(resolveTrustedProjectRoot(42, ROOT)).toBeNull()
    expect(resolveTrustedProjectRoot({}, ROOT)).toBeNull()
  })

  it('rejects empty or oversized strings', () => {
    expect(resolveTrustedProjectRoot('', ROOT)).toBeNull()
    expect(resolveTrustedProjectRoot('x'.repeat(2_001), ROOT)).toBeNull()
  })
})
