import type { HarnessError } from '@kova/shared'

type LayerName = 'build' | 'tests' | 'lint'
type Severity = HarnessError['severity']

function makeError(layer: LayerName, msg: string, file = '', line?: number, rule?: string, sev: Severity = 'high'): HarnessError {
  return { layer, type: layer === 'lint' ? 'style' : 'syntax', severity: sev, fixable: false, message: msg.trim(), humanMessage: msg.trim(), file, line, rule }
}

// ─── Build ────────────────────────────────────────────────────────────────────

export function parseBuildErrors(output: string): HarnessError[] {
  const errors: HarnessError[] = []

  // TypeScript: src/f.ts(10,5): error TS2345: msg
  extract(errors, 'build', output,
    /^(.+?)\((\d+),\d+\):\s*error\s+(TS\d+|CS\d+):\s*(.+)$/gm,
    m => makeError('build', m[4], m[1], +m[2], m[3]))

  // Rust (multi-line): error[E0308]: msg\n  --> src/f.rs:5:14
  // Process line-by-line to handle multi-line format
  if (!errors.length) {
    const lines = output.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const arrow = lines[i].match(/^\s+-->\s+(.+?):(\d+):\d+/)
      if (!arrow) continue
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        const err = lines[j].match(/^(?:error|warning)(?:\[(\w+)\])?:\s+(.+)$/)
        if (err) { errors.push(makeError('build', err[2], arrow[1], +arrow[2], err[1])); break }
      }
    }
  }

  // GCC/Clang/Go/Python/mypy: file:line:col: error: msg
  if (!errors.length)
    extract(errors, 'build', output,
      /^(.+?):(\d+):\d+:\s+(?:error|fatal error):\s+(.+)$/gm,
      m => makeError('build', m[3], m[1], +m[2]))

  // Python (pyflakes, pylint): file.py:line: msg
  if (!errors.length)
    extract(errors, 'build', output,
      /^(.+?\.py):(\d+):\d*:?\s+(?:E\d+\s+)?(.+)$/gm,
      m => makeError('build', m[3], m[1], +m[2]))

  // Go: ./main.go:8:2: undefined: fmt (no "error:" prefix in Go build output)
  if (!errors.length)
    extract(errors, 'build', output,
      /^(?:\.\/)?(.+?\.go):(\d+):\d+:\s+(.+)$/gm,
      m => makeError('build', m[3], m[1], +m[2]))

  // Java (javac): file.java:line: error: msg
  if (!errors.length)
    extract(errors, 'build', output,
      /^(.+?\.java):(\d+):\s+error:\s+(.+)$/gm,
      m => makeError('build', m[3], m[1], +m[2]))

  // Generic: any file:line pattern with error keyword
  if (!errors.length)
    extract(errors, 'build', output,
      /^(.+?):(\d+)(?::\d+)?:\s*(?:error|ERROR|Error)[:\s]+(.+)$/gm,
      m => makeError('build', m[3], m[1], +m[2]))

  if (!errors.length && output.trim())
    errors.push(makeError('build', output.trim()))

  return errors
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function parseTestFailures(output: string): string[] {
  const names: string[] = []

  // vitest / jest unicode: ✗ or × or ✕ (not file lines)
  for (const line of output.split('\n')) {
    const t = line.trim()
    if (/^[✗×✕✘]\s+/.test(t) && !/\.test\.[tj]sx?/.test(t))
      names.push(t.replace(/^[✗×✕✘]\s+/, '').trim())
  }
  if (names.length) return names

  // pytest: FAILED tests/test_x.py::TestClass::test_method
  for (const line of output.split('\n')) {
    const m = line.match(/^FAILED\s+(.+?)(?:\s+-\s+.+)?$/)
    if (m) names.push(m[1].trim())
  }
  if (names.length) return names

  // go test: --- FAIL: TestFunctionName (0.00s)
  for (const line of output.split('\n')) {
    const m = line.match(/^--- FAIL:\s+(\S+)/)
    if (m) names.push(m[1])
  }
  if (names.length) return names

  // cargo test failures list
  const cargoBlock = output.match(/^failures:\n((?:[ \t]+\S+\n?)+)/m)
  if (cargoBlock) {
    for (const l of cargoBlock[1].split('\n'))
      if (l.trim()) names.push(l.trim())
  }
  if (names.length) return names

  // Generic: any line with FAIL/FAILED + something that looks like a test name
  for (const line of output.split('\n')) {
    const m = line.match(/\b(?:FAILED|FAIL)\b[:\s]+(.+)/)
    if (m && m[1].trim() && !m[1].includes('\n')) names.push(m[1].trim())
  }

  return names
}

// ─── Lint ─────────────────────────────────────────────────────────────────────

export function parseLintErrors(output: string): HarnessError[] {
  const errors: HarnessError[] = []

  // ESLint compact / biome: file:line:col: error msg [rule]
  extract(errors, 'lint', output,
    /^(.+?):(\d+):(?:\d+):?\s+(?:error|warning)\s+(.+?)(?:\s+\[(.+?)\])?$/gm,
    m => makeError('lint', m[3], m[1], +m[2], m[4], 'low'))

  // Ruff (Python): file.py:line:col: Exxxx msg
  if (!errors.length)
    extract(errors, 'lint', output,
      /^(.+?\.py):(\d+):(?:\d+):\s+([A-Z]\d+)\s+(.+)$/gm,
      m => makeError('lint', m[4], m[1], +m[2], m[3], 'low'))

  // golangci-lint / staticcheck: file.go:line:col: msg (rule)
  if (!errors.length)
    extract(errors, 'lint', output,
      /^(.+?\.go):(\d+):(?:\d+):\s+(.+?)(?:\s+\((.+?)\))?$/gm,
      m => makeError('lint', m[3], m[1], +m[2], m[4], 'low'))

  // clippy (Rust): warning/error[code]: msg\n --> file:line
  if (!errors.length) {
    const lines = output.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const arrow = lines[i].match(/^\s+-->\s+(.+?):(\d+):\d+/)
      if (!arrow) continue
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const w = lines[j].match(/^(?:warning|error)(?:\[(\w+)\])?:\s+(.+)$/)
        if (w) { errors.push(makeError('lint', w[2], arrow[1], +arrow[2], w[1], 'low')); break }
      }
    }
  }

  // Generic file:line format
  if (!errors.length)
    extract(errors, 'lint', output,
      /^(.+?):(\d+)(?::\d+)?:\s+(.+)$/gm,
      m => makeError('lint', m[3], m[1], +m[2], undefined, 'low'))

  if (!errors.length && output.trim())
    errors.push(makeError('lint', output.trim(), '', undefined, undefined, 'low'))

  return errors
}

// ─── Shared utility ───────────────────────────────────────────────────────────

function extract(
  out: HarnessError[],
  layer: LayerName,
  text: string,
  pattern: RegExp,
  mapper: (m: RegExpExecArray) => HarnessError,
): void {
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    const err = mapper(m)
    if (err.file && err.file.length < 200) out.push(err) // sanity check
  }
}
