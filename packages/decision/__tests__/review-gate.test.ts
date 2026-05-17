import { describe, expect, it } from 'vitest'
import type { ExecutionContract, FileChange, HarnessResult } from '@kova/shared'
import { decide, runReviewGate } from '../src'

const cleanHarness: HarnessResult = {
  passed: true,
  score: 100,
  duration: 10,
  iteration: 1,
  layers: [{ name: 'build', passed: true, errors: [], warnings: [], duration: 1, skipped: false }],
}

const contract: ExecutionContract = {
  id: 'contract-1',
  taskId: 'task-1',
  objective: 'change app',
  stackAdapter: 'typescript',
  allowedPaths: ['src/**'],
  forbiddenPaths: ['dist/**', 'out/**', 'node_modules/**'],
  safeZones: ['.env', 'package.json'],
  validationCriteria: [],
  requiresTests: true,
  maxFilesChanged: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function change(path: string): FileChange {
  return { path, type: 'modify', diff: '+content', before: 'old' }
}

function codeChange(path: string, before: string, after: string): FileChange {
  return { path, type: 'modify', before, diff: after }
}

describe('runReviewGate', () => {
  it('blocks generated files', () => {
    const review = runReviewGate({ changes: [change('dist/index.js')], harnessResult: cleanHarness, contract })

    expect(review.passed).toBe(false)
    expect(review.findings[0].category).toBe('generated')
  })

  it('warns when behavior changes without tests', () => {
    const review = runReviewGate({ changes: [change('src/app.ts')], harnessResult: cleanHarness, contract })

    expect(review.passed).toBe(true)
    expect(review.findings.some(f => f.category === 'tests')).toBe(true)
  })

  it('blocks removal of exported API symbols', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/api.ts',
        'export function login(token: string) { return token }\nexport function logout() {}\n',
        'export function logout() {}\n',
      )],
      harnessResult: cleanHarness,
      contract,
    })

    expect(review.passed).toBe(false)
    expect(review.findings).toContainEqual(expect.objectContaining({
      category: 'quality',
      severity: 'high',
      blocking: true,
      file: 'src/api.ts',
    }))
    expect(review.findings.map(f => f.message).join('\n')).toContain('login')
  })

  it('blocks exported function signature breaking changes', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/client.ts',
        'export function fetchUser(id: string) { return id }\n',
        'export function fetchUser(id: string, includeDeleted: boolean) { return id }\n',
      )],
      harnessResult: cleanHarness,
      contract,
    })

    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('fetchUser')
  })

  it('blocks removal of exported interface properties', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/types.ts',
        'export interface User {\n  id: string\n  email: string\n}\n',
        'export interface User {\n  id: string\n}\n',
      )],
      harnessResult: cleanHarness,
      contract,
    })

    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('User.email')
  })

  it('uses TypeScript AST exports instead of only direct export regexes', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/auth.ts',
        'function login(token: string): string { return token }\nexport { login as authenticate }\n',
        'function login(token: string): string { return token }\nexport { }\n',
      )],
      harnessResult: cleanHarness,
      contract,
    })

    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('authenticate')
  })

  it('blocks exported return type changes with TypeScript AST', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/api.ts',
        'export function loadUser(id: string): Promise<User> { return getUser(id) }\n',
        'export function loadUser(id: string): Promise<User | null> { return getUser(id) }\n',
      )],
      harnessResult: cleanHarness,
      contract,
    })

    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('Public return type changed')
  })
})

// ─── Python semantic review ───────────────────────────────────────────────────

describe('runReviewGate — Python semantic review', () => {
  it('blocks removal of public Python function', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/auth.py',
        'def login(username, password):\n    return True\n\ndef logout():\n    pass\n',
        'def logout():\n    pass\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('login')
  })

  it('does not block removal of private Python function (underscore prefix)', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/utils.py',
        'def _internal_helper(x):\n    return x\n\ndef public_fn():\n    pass\n',
        'def public_fn():\n    pass\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(true)
    expect(review.findings.filter(f => f.blocking)).toHaveLength(0)
  })

  it('blocks adding required param to public Python function', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/db.py',
        'def connect(host):\n    pass\n',
        'def connect(host, port):\n    pass\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('connect')
  })

  it('does not block adding optional param (has default) to Python function', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/db.py',
        'def connect(host):\n    pass\n',
        'def connect(host, port=5432):\n    pass\n',
      )],
      harnessResult: cleanHarness,
    })
    const blocking = review.findings.filter(f => f.blocking && f.category === 'quality')
    expect(blocking).toHaveLength(0)
  })

  it('blocks removal of public Python class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/models.py',
        'class UserRepository:\n    pass\n',
        '# removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('UserRepository')
  })

  it('does not block changes to private class (_prefix)', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/internal.py',
        'class _Cache:\n    pass\n',
        '# removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.category === 'quality')).toHaveLength(0)
  })
})

// ─── Rust semantic review ─────────────────────────────────────────────────────

describe('runReviewGate — Rust semantic review', () => {
  it('blocks removal of pub fn', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/lib.rs',
        'pub fn connect(host: &str) -> Connection {\n    todo!()\n}\n\npub fn disconnect() {}\n',
        'pub fn disconnect() {}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('connect')
  })

  it('does not block removal of pub(crate) fn — not public API', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/lib.rs',
        'pub(crate) fn internal_helper() {}\n\npub fn public_fn() {}\n',
        'pub fn public_fn() {}\n',
      )],
      harnessResult: cleanHarness,
    })
    const blocking = review.findings.filter(f => f.blocking && f.category === 'quality')
    expect(blocking).toHaveLength(0)
  })

  it('blocks removal of pub struct', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/types.rs',
        'pub struct Config {\n    pub host: String,\n}\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('Config')
  })

  it('blocks adding required param to pub fn', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/lib.rs',
        'pub fn send(msg: &str) {}\n',
        'pub fn send(msg: &str, timeout: u64) {}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('send')
  })

  it('does not block self param changes (receiver only changes)', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/lib.rs',
        'pub fn process(&self) {}\n',
        'pub fn process(&mut self) {}\n',
      )],
      harnessResult: cleanHarness,
    })
    // self receiver change is not a required-param increase
    const paramFindings = review.findings.filter(f => f.blocking && f.message.includes('process') && f.message.includes('parametro'))
    expect(paramFindings).toHaveLength(0)
  })

  it('blocks removal of pub trait', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/traits.rs',
        'pub trait Repository {\n    fn find(&self, id: u64);\n}\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('Repository')
  })
})

// ─── Java semantic review ─────────────────────────────────────────────────────

describe('runReviewGate — Java semantic review', () => {
  it('blocks removal of public Java method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/UserService.java',
        'public class UserService {\n    public User findById(Long id) { return null; }\n    public void delete(Long id) {}\n}\n',
        'public class UserService {\n    public void delete(Long id) {}\n}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('findById')
  })

  it('blocks removal of public Java class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/Repository.java',
        'public interface Repository {\n    void save(Object entity);\n}\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('Repository')
  })
})

// ─── Kotlin semantic review ───────────────────────────────────────────────────

describe('runReviewGate — Kotlin semantic review', () => {
  it('blocks removal of public Kotlin fun', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/AuthService.kt',
        'fun login(username: String, password: String): Boolean = true\nfun logout() {}\n',
        'fun logout() {}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('login')
  })

  it('does not block removal of private Kotlin fun', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/AuthService.kt',
        'private fun hashPassword(pw: String): String = pw\nfun login(): Boolean = true\n',
        'fun login(): Boolean = true\n',
      )],
      harnessResult: cleanHarness,
    })
    const blocking = review.findings.filter(f => f.blocking && f.message.includes('hashPassword'))
    expect(blocking).toHaveLength(0)
  })

  it('blocks removal of public Kotlin class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/models.kt',
        'data class User(val id: Long, val email: String)\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('User')
  })
})

// ─── Ruby semantic review ─────────────────────────────────────────────────────

describe('runReviewGate — Ruby semantic review', () => {
  it('blocks removal of public Ruby method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'lib/auth.rb',
        'def login(username, password)\n  true\nend\n\ndef logout\nend\n',
        'def logout\nend\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('login')
  })

  it('does not block removal of private Ruby method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'lib/auth.rb',
        'def public_method\nend\n\nprivate\n\ndef _secret\nend\n',
        'def public_method\nend\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.message.includes('_secret'))).toHaveLength(0)
  })

  it('blocks removal of Ruby class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'lib/user.rb',
        'class UserRepository\n  def find(id)\n  end\nend\n',
        '# removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('UserRepository')
  })
})

// ─── PHP semantic review ──────────────────────────────────────────────────────

describe('runReviewGate — PHP semantic review', () => {
  it('blocks removal of public PHP method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/UserService.php',
        '<?php\nclass UserService {\n    public function findById(int $id): User { }\n    public function delete(int $id): void { }\n}\n',
        '<?php\nclass UserService {\n    public function delete(int $id): void { }\n}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('findById')
  })

  it('does not block removal of private PHP method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/UserService.php',
        '<?php\nclass UserService {\n    public function find(): void { }\n    private function internal(): void { }\n}\n',
        '<?php\nclass UserService {\n    public function find(): void { }\n}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.message.includes('internal'))).toHaveLength(0)
  })

  it('blocks removal of PHP class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/Repository.php',
        '<?php\ninterface Repository {\n    public function save(object $entity): void;\n}\n',
        '<?php\n// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('Repository')
  })
})

// ─── Swift semantic review ────────────────────────────────────────────────────

describe('runReviewGate — Swift semantic review', () => {
  it('blocks removal of public Swift func', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'Sources/Auth.swift',
        'public func login(username: String, password: String) -> Bool { return true }\npublic func logout() {}\n',
        'public func logout() {}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('login')
  })

  it('does not block removal of internal Swift func', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'Sources/Auth.swift',
        'public func publicFn() {}\ninternal func helperFn() {}\n',
        'public func publicFn() {}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.message.includes('helperFn'))).toHaveLength(0)
  })

  it('blocks removal of public Swift struct', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'Sources/Models.swift',
        'public struct UserConfig {\n    public let timeout: Int\n}\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('UserConfig')
  })
})

// ─── Dart semantic review ─────────────────────────────────────────────────────

describe('runReviewGate — Dart semantic review', () => {
  it('blocks removal of public Dart class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'lib/src/auth.dart',
        'class AuthService {\n  Future<bool> login(String user, String pass) async => true;\n}\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('AuthService')
  })

  it('does not block removal of private Dart class (_prefix)', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'lib/src/internal.dart',
        'class _Cache {\n  void clear() {}\n}\nclass PublicService {}\n',
        'class PublicService {}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.message.includes('_Cache'))).toHaveLength(0)
  })
})

// ─── C# semantic review ───────────────────────────────────────────────────────

describe('runReviewGate — C# semantic review', () => {
  it('blocks removal of public C# method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/UserService.cs',
        'public class UserService {\n    public User FindById(long id) { return null; }\n    public void Delete(long id) { }\n}\n',
        'public class UserService {\n    public void Delete(long id) { }\n}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('FindById')
  })

  it('does not block removal of private C# method', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/UserService.cs',
        'public class UserService {\n    public void Find() { }\n    private void InternalHelper() { }\n}\n',
        'public class UserService {\n    public void Find() { }\n}\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.message.includes('InternalHelper'))).toHaveLength(0)
  })

  it('blocks removal of public C# class', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/IRepository.cs',
        'public interface IRepository<T> {\n    T FindById(long id);\n}\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('IRepository')
  })
})

// ─── C/C++ semantic review ────────────────────────────────────────────────────

describe('runReviewGate — C/C++ semantic review', () => {
  it('blocks removal of global C function from header', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'include/auth.h',
        'int authenticate(const char* user, const char* pass);\nvoid logout(void);\n',
        'void logout(void);\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('authenticate')
  })

  it('blocks removal of C++ class from header', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'include/connection.h',
        'class Connection {\npublic:\n    void open();\n    void close();\n};\n',
        '// removed\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.passed).toBe(false)
    expect(review.findings.map(f => f.message).join('\n')).toContain('Connection')
  })

  it('does not block removal of static C function (internal linkage)', () => {
    const review = runReviewGate({
      changes: [codeChange(
        'src/utils.c',
        'static int internal_helper(int x) { return x; }\nint public_fn(int x) { return x; }\n',
        'int public_fn(int x) { return x; }\n',
      )],
      harnessResult: cleanHarness,
    })
    expect(review.findings.filter(f => f.blocking && f.message.includes('internal_helper'))).toHaveLength(0)
  })
})

describe('decide with Review Gate', () => {
  it('does not auto-apply when Review Gate blocks the diff', () => {
    const decision = decide(cleanHarness, [], { changes: [change('package.json')], contract })

    expect(decision.decision).toBe('human_required')
    expect(decision.reviewGate?.passed).toBe(false)
  })
})

describe('credential path protection', () => {
  it('blocks modifying .env', () => {
    const review = runReviewGate({ changes: [change('.env')], harnessResult: cleanHarness })
    expect(review.passed).toBe(false)
    expect(review.findings[0].category).toBe('security')
  })

  it('blocks CREATING .env (new file)', () => {
    const create: FileChange = { path: '.env', type: 'create', diff: 'DB_PASSWORD=secret' }
    const review = runReviewGate({ changes: [create], harnessResult: cleanHarness })
    expect(review.passed).toBe(false)
    expect(review.findings[0].category).toBe('security')
  })

  it('blocks creating .env.production', () => {
    const create: FileChange = { path: '.env.production', type: 'create', diff: 'API_KEY=abc' }
    const review = runReviewGate({ changes: [create], harnessResult: cleanHarness })
    expect(review.passed).toBe(false)
    expect(review.findings[0].category).toBe('security')
  })
})
