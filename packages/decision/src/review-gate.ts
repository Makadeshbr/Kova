import type { ExecutionContract, FileChange, HarnessResult, ReviewFinding, ReviewGateResult } from '@kova/shared'
import ts from 'typescript'

const GENERATED_PATHS = ['dist/**', 'out/**', 'node_modules/**']
const DEPENDENCY_FILES = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb']
const CREDENTIAL_PATHS = ['.env', '.env.*']

export interface ReviewGateInput {
  changes: FileChange[]
  contract?: ExecutionContract
  harnessResult: HarnessResult
}

type ReviewGateLayer = (input: ReviewGateInput) => ReviewFinding[]

const REVIEW_GATE_LAYERS: ReviewGateLayer[] = [
  universalPolicyLayer,
  semanticAdapterLayer,
  riskPolicyLayer,
  harnessCriticalLayer,
]

export function runReviewGate(input: ReviewGateInput): ReviewGateResult {
  const findings = dedupeFindings(REVIEW_GATE_LAYERS.flatMap(layer => layer(input)))
  return { passed: !findings.some(finding => finding.blocking), findings }
}

function universalPolicyLayer(input: ReviewGateInput): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  // Claude Code parity for scaffolding: when every change creates a brand-new
  // file, drop the scope/safe-zone checks. The agent is materializing a
  // project that doesn't exist yet — there is no "existing scope" to honour.
  // Credential paths and generated paths are still hard-blocked because those
  // are safety invariants, not scope policy.
  const isScaffolding = input.changes.length > 0
    && input.changes.every(change => change.type === 'create' && !change.before)

  for (const change of input.changes) {
    if (matchesAny(change.path, GENERATED_PATHS)) {
      findings.push({
        category: 'generated',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} looks generated and must not be edited manually`,
      })
    }

    if (change.type !== 'create' && DEPENDENCY_FILES.includes(change.path)) {
      findings.push({
        category: 'dependency',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} changes dependencies or a lockfile; explicit approval is required`,
      })
    }

    if (matchesAny(change.path, CREDENTIAL_PATHS)) {
      findings.push({
        category: 'security',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} is a credentials file - creation and modification are blocked; edit it manually`,
      })
    }

    if (!isScaffolding && input.contract && !matchesAny(change.path, input.contract.allowedPaths)) {
      findings.push({
        category: 'scope',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} is outside the contract scope`,
      })
    }

    if (change.type !== 'create' && input.contract && matchesAny(change.path, input.contract.safeZones)) {
      findings.push({
        category: 'security',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} is a safe zone and requires human review`,
      })
    }
  }

  return findings
}

function semanticAdapterLayer(input: ReviewGateInput): ReviewFinding[] {
  return input.changes.flatMap(change => semanticApiFindings(change))
}

function riskPolicyLayer(input: ReviewGateInput): ReviewFinding[] {
  const hasOnlyCreates = input.changes.every(change => change.type === 'create')
  if (!input.contract?.requiresTests || hasTestChange(input.changes) || !changesExecutableCode(input.changes) || hasOnlyCreates) {
    return []
  }

  const findings: ReviewFinding[] = [{
    category: 'tests',
    severity: 'medium',
    blocking: false,
    message: 'The contract expects tests for behavior changes, but no test file was changed',
    suggestion: 'Add a test or record a technical justification.',
  }]

  if (input.changes.some(change => semanticApiFindings(change).some(finding => finding.blocking))) {
    findings.push({
      category: 'quality',
      severity: 'high',
      blocking: true,
      message: 'Public API changed without a detected test or migration; human review is required.',
      suggestion: 'Add a compatibility test, keep the old API, or document the migration.',
    })
  }

  return findings
}

function harnessCriticalLayer(input: ReviewGateInput): ReviewFinding[] {
  const findings: ReviewFinding[] = []

  for (const layer of input.harnessResult.layers) {
    for (const error of layer.errors) {
      if (error.severity === 'critical') {
        findings.push({
          category: error.type === 'security' ? 'security' : 'quality',
          severity: 'critical',
          blocking: true,
          file: error.file,
          message: error.humanMessage || error.message,
        })
      }
    }
  }

  return findings
}

function semanticApiFindings(change: FileChange): ReviewFinding[] {
  if (change.type === 'create' || !change.before || !isSemanticSourcePath(change.path) || !change.diff) return []

  const beforeApi = extractPublicApi(change.before, change.path)
  const afterApi = extractPublicApi(change.diff, change.path)
  const findings: ReviewFinding[] = []

  for (const symbol of beforeApi.symbols) {
    if (!afterApi.symbols.has(symbol)) {
      findings.push({
        category: 'quality',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `Public API removed: ${symbol}. Breaking changes require explicit human review.`,
        suggestion: 'Keep compatibility, add an adapter/deprecation path, or record a clear migration.',
      })
    }
  }

  for (const [name, beforeFn] of beforeApi.functions) {
    const afterFn = afterApi.functions.get(name)
    if (!afterFn) continue
    if (afterFn.requiredParams > beforeFn.requiredParams) {
      findings.push({
        category: 'quality',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `Public signature changed: ${name} went from ${beforeFn.requiredParams} to ${afterFn.requiredParams} required parameter(s).`,
        suggestion: 'Preserve the old signature or make new parameters optional.',
      })
    }
    if (beforeFn.returnType && afterFn.returnType && beforeFn.returnType !== afterFn.returnType) {
      findings.push({
        category: 'quality',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `Public return type changed: ${name} changed from ${beforeFn.returnType} to ${afterFn.returnType}.`,
        suggestion: 'Preserve the return type or record a migration.',
      })
    }
  }

  for (const [iface, beforeProps] of beforeApi.interfaces) {
    const afterProps = afterApi.interfaces.get(iface)
    if (!afterProps) continue
    for (const prop of beforeProps) {
      if (!afterProps.has(prop)) {
        findings.push({
          category: 'quality',
          severity: 'high',
          blocking: true,
          file: change.path,
          message: `Public property removed: ${iface}.${prop}.`,
          suggestion: 'Keep the field optional/deprecated or document the migration.',
        })
      }
    }
  }

  return dedupeFindings(findings)
}

interface FunctionApi {
  requiredParams: number
  returnType?: string
}

interface PublicApi {
  symbols: Set<string>
  functions: Map<string, FunctionApi>
  interfaces: Map<string, Set<string>>
}

function extractPublicApi(content: string, path: string): PublicApi {
  if (isTsJsPath(path)) return extractTypeScriptPublicApi(content, path)
  if (/\.go$/.test(path)) return extractGoPublicApi(content)
  if (/\.py$/.test(path)) return extractPythonPublicApi(content)
  if (/\.rs$/.test(path)) return extractRustPublicApi(content)
  if (/\.java$/.test(path)) return extractJavaPublicApi(content)
  if (/\.kts?$/.test(path)) return extractKotlinPublicApi(content)
  if (/\.rb$/.test(path)) return extractRubyPublicApi(content)
  if (/\.php$/.test(path)) return extractPhpPublicApi(content)
  if (/\.swift$/.test(path)) return extractSwiftPublicApi(content)
  if (/\.dart$/.test(path)) return extractDartPublicApi(content)
  if (/\.cs$/.test(path)) return extractCSharpPublicApi(content)
  if (/\.(cpp|cc|cxx|hpp|h|c)$/.test(path)) return extractCCppPublicApi(content)
  return emptyApi()
}

function extractTypeScriptPublicApi(content: string, path: string): PublicApi {
  const scriptKind = path.endsWith('.tsx') || path.endsWith('.jsx') ? ts.ScriptKind.TSX
    : path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.mjs') || path.endsWith('.cjs') ? ts.ScriptKind.JS
    : ts.ScriptKind.TS
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, scriptKind)
  const api = emptyApi()
  const declarations = new Map<string, ts.Node>()

  for (const statement of source.statements) {
    collectLocalDeclaration(statement, declarations)
    if (hasExportModifier(statement)) collectExportedDeclaration(statement, api)
    if (ts.isExportDeclaration(statement)) collectExportDeclaration(statement, declarations, api)
  }

  return api
}

function collectLocalDeclaration(node: ts.Statement, declarations: Map<string, ts.Node>): void {
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) {
    declarations.set(node.name.text, node)
  }
  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) declarations.set(declaration.name.text, declaration)
    }
  }
}

function collectExportedDeclaration(node: ts.Statement, api: PublicApi): void {
  if (ts.isFunctionDeclaration(node) && node.name) {
    addFunction(api, node.name.text, node.parameters, node.type)
    return
  }
  if ((ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) {
    api.symbols.add(node.name.text)
    return
  }
  if (ts.isInterfaceDeclaration(node) && node.name) {
    api.symbols.add(node.name.text)
    api.interfaces.set(node.name.text, interfaceProperties(node))
    return
  }
  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) api.symbols.add(declaration.name.text)
    }
  }
}

function collectExportDeclaration(node: ts.ExportDeclaration, declarations: Map<string, ts.Node>, api: PublicApi): void {
  const clause = node.exportClause
  if (!clause || !ts.isNamedExports(clause)) return
  for (const element of clause.elements) {
    const local = (element.propertyName ?? element.name).text
    const exported = element.name.text
    api.symbols.add(exported)
    const declaration = declarations.get(local)
    if (!declaration) continue
    if (ts.isFunctionDeclaration(declaration)) addFunction(api, exported, declaration.parameters, declaration.type)
    if (ts.isInterfaceDeclaration(declaration)) api.interfaces.set(exported, interfaceProperties(declaration))
  }
}

function addFunction(api: PublicApi, name: string, params: ts.NodeArray<ts.ParameterDeclaration>, returnType?: ts.TypeNode): void {
  api.symbols.add(name)
  api.functions.set(name, {
    requiredParams: params.filter(param => !param.questionToken && !param.initializer && !param.dotDotDotToken).length,
    returnType: returnType ? compactType(returnType.getText()) : undefined,
  })
}

function interfaceProperties(node: ts.InterfaceDeclaration): Set<string> {
  const props = new Set<string>()
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) props.add(member.name.getText().replace(/^['"]|['"]$/g, ''))
  }
  return props
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
}

function compactType(typeText: string): string {
  return typeText.replace(/\s+/g, ' ').trim()
}

function extractGoPublicApi(content: string): PublicApi {
  const api = emptyApi()
  const goRe = /^\s*(func|type|var|const)\s+([A-Z][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?/gm
  for (const match of content.matchAll(goRe)) {
    const kind = match[1]
    const name = match[2]
    api.symbols.add(name)
    if (kind === 'func') api.functions.set(name, { requiredParams: countGoParams(match[3] ?? '') })
  }
  return api
}

// Python

function extractPythonPublicApi(content: string): PublicApi {
  const api = emptyApi()
  for (const match of content.matchAll(/^(?:async\s+)?def\s+([A-Za-z][A-Za-z0-9_]*)\s*\(([^)]*)\)/gm)) {
    const name = match[1]
    if (name.startsWith('_')) continue
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countPythonParams(match[2] ?? '') })
  }
  for (const match of content.matchAll(/^class\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    if (!match[1].startsWith('_')) api.symbols.add(match[1])
  }
  return api
}

function countPythonParams(raw: string): number {
  return splitParams(raw)
    .map(p => p.trim())
    .filter(p => p && p !== 'self' && p !== 'cls' && !p.startsWith('*') && !p.includes('='))
    .length
}

// Rust

function extractRustPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // pub fn only (bare pub - pub(crate)/pub(super) are module-scoped, not truly public)
  for (const match of content.matchAll(/^pub\s+(?:async\s+)?fn\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:<[^(]*>)?\s*\(([^)]*)\)/gm)) {
    const name = match[1]
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countRustParams(match[2] ?? '') })
  }
  for (const match of content.matchAll(/^pub\s+(?:struct|enum|trait|type|const|static)\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  return api
}

function countRustParams(raw: string): number {
  return splitParams(raw)
    .map(p => p.trim())
    .filter(p => {
      if (!p) return false
      const norm = p.replace(/^mut\s+/, '').replace(/^&\s*(?:mut\s+)?/, '')
      return norm !== 'self'
    })
    .length
}

// Java

function extractJavaPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // public class/interface/enum/record
  for (const match of content.matchAll(/^\s*public\s+(?:\w+\s+)*(?:class|interface|enum|record)\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  // public methods: heuristic - detect name for removal tracking
  // Matches: public [modifiers]* ReturnType methodName(
  for (const match of content.matchAll(/^\s*public\s+(?:(?:static|final|abstract|synchronized|default|native)\s+)*(?!class\b|interface\b|enum\b|record\b)\S+\s+([a-z][A-Za-z0-9_]*)\s*\(/gm)) {
    api.symbols.add(match[1])
  }
  return api
}

// Kotlin

function extractKotlinPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // fun declarations without private/protected/internal on the same line
  for (const match of content.matchAll(/^(?!.*\b(?:private|protected|internal)\b)(?:public\s+)?(?:\w+\s+)*fun\s+([A-Za-z][A-Za-z0-9_]*)\s*\(/gm)) {
    api.symbols.add(match[1])
  }
  // class declarations without private/protected/internal
  for (const match of content.matchAll(/^(?!.*\b(?:private|protected|internal)\b)(?:\w+\s+)*class\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  return api
}

// Ruby

function extractRubyPublicApi(content: string): PublicApi {
  const api = emptyApi()
  let isPublic = true
  for (const line of content.split('\n')) {
    const t = line.trim()
    // Visibility switches (bare keyword on its own line, not `private def`)
    if (/^private\b/.test(t) && !/private\s+def\b/.test(t)) { isPublic = false; continue }
    if (/^protected\b/.test(t) && !/protected\s+def\b/.test(t)) { isPublic = false; continue }
    if (/^public\b/.test(t) && !/public\s+def\b/.test(t)) { isPublic = true; continue }
    // Class/module definitions are always public namespaces
    const cm = t.match(/^(?:class|module)\s+([A-Z][A-Za-z0-9_:]*)/)
    if (cm) { api.symbols.add(cm[1]); isPublic = true; continue }
    if (!isPublic) continue
    const dm = t.match(/^def\s+(?:self\.)?([A-Za-z][A-Za-z0-9_?!]*)\s*(?:\(([^)]*)\))?/)
    if (dm && !dm[1].startsWith('_')) {
      api.symbols.add(dm[1])
      api.functions.set(dm[1], { requiredParams: countRubyParams(dm[2] ?? '') })
    }
  }
  return api
}

function countRubyParams(raw: string): number {
  return splitParams(raw).map(p => p.trim())
    .filter(p => p && !p.startsWith('*') && !p.startsWith('**') && !p.startsWith('&') && !p.includes('='))
    .length
}

// PHP

function extractPhpPublicApi(content: string): PublicApi {
  const api = emptyApi()
  for (const match of content.matchAll(/^\s*(?:abstract\s+|final\s+|readonly\s+)*(?:class|interface|trait|enum)\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  // Public class methods
  for (const match of content.matchAll(/^\s*public\s+(?:static\s+|abstract\s+|final\s+|readonly\s+)*function\s+([A-Za-z][A-Za-z0-9_]*)\s*\(([^)]*)\)/gm)) {
    const name = match[1]
    if (name.startsWith('__')) continue // PHP magic methods are structural, not external API
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countPhpParams(match[2] ?? '') })
  }
  // Top-level functions (outside class body)
  for (const match of content.matchAll(/^function\s+([A-Za-z][A-Za-z0-9_]*)\s*\(([^)]*)\)/gm)) {
    api.symbols.add(match[1])
    api.functions.set(match[1], { requiredParams: countPhpParams(match[2] ?? '') })
  }
  return api
}

function countPhpParams(raw: string): number {
  return splitParams(raw).map(p => p.trim())
    .filter(p => p && !p.startsWith('...') && !p.includes('='))
    .length
}

// Swift

function extractSwiftPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // Public/open types
  for (const match of content.matchAll(/^(?:public|open)\s+(?:final\s+)?(?:class|struct|enum|protocol|actor)\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  // Public/open functions (class, static, mutating, override, required are modifiers)
  for (const match of content.matchAll(/^(?:public|open)\s+(?:(?:class|static|mutating|override|required|convenience|final|nonisolated)\s+)*func\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:<[^(]*>)?\s*\(([^)]*)\)/gm)) {
    const name = match[1]
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countSwiftParams(match[2] ?? '') })
  }
  return api
}

function countSwiftParams(raw: string): number {
  // Swift params: "label name: Type = default" - optional if has "= default"
  return splitParams(raw).map(p => p.trim()).filter(p => p && !p.includes('=')).length
}

// Dart

function extractDartPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // Public classes/mixins/enums (no _ prefix = public by convention)
  for (const match of content.matchAll(/^(?:abstract\s+|sealed\s+|base\s+|interface\s+|final\s+|mixin\s+)*(?:class|mixin|enum|extension type)\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    if (!match[1].startsWith('_')) api.symbols.add(match[1])
  }
  // Top-level public functions - start at column 0 with return type + name
  for (const match of content.matchAll(/^(?!_)(?:[A-Za-z][A-Za-z0-9_<>?,\s]*)\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:<[^(]*>)?\s*\(([^)]*)\)\s*(?:async\s*)?\{/gm)) {
    const name = match[1]
    if (name.startsWith('_') || /^(?:class|abstract|sealed|void|if|for|while|return|import|export)$/.test(name)) continue
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countDartParams(match[2] ?? '') })
  }
  return api
}

function countDartParams(raw: string): number {
  // Remove named optional block {} and positional optional block []
  const withoutOptional = raw.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]*\]/g, '')
  return splitParams(withoutOptional).map(p => p.trim()).filter(p => p && !p.includes('=')).length
}

// C#

function extractCSharpPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // Public types
  for (const match of content.matchAll(/^\s*public\s+(?:\w+\s+)*(?:class|interface|struct|enum|record)\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  // Public methods and properties - detect by name before '(' or '{'
  for (const match of content.matchAll(/^\s*public\s+(?:(?:static|virtual|abstract|override|sealed|async|new|extern|readonly|partial)\s+)*(?!class\b|interface\b|struct\b|enum\b|record\b)\S[\w<>\[\],\s]*\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:<[^(]*>)?\s*\(([^)]*)\)/gm)) {
    const name = match[1]
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countCSharpParams(match[2] ?? '') })
  }
  return api
}

function countCSharpParams(raw: string): number {
  return splitParams(raw).map(p => p.trim())
    .filter(p => p && !p.startsWith('params ') && !p.includes('='))
    .length
}

// C / C++

function extractCCppPublicApi(content: string): PublicApi {
  const api = emptyApi()
  // Class/struct declarations at file level
  for (const match of content.matchAll(/^(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
    api.symbols.add(match[1])
  }
  // Global-scope function definitions/declarations (lines not starting with static/inline space/#/comment)
  // Matches: ReturnType functionName( at start of line
  const SKIP_WORDS = new Set(['if', 'while', 'for', 'switch', 'return', 'case', 'else', 'do', 'typedef', 'namespace', 'using', 'class', 'struct', 'template'])
  for (const match of content.matchAll(/^(?!(?:static|\/\/|\/\*|#|\s))(?:(?:inline|extern|constexpr|const)\s+)*[A-Za-z_][A-Za-z0-9_\s*&:<>]*?\s([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/gm)) {
    const name = match[1]
    if (SKIP_WORDS.has(name) || name.startsWith('_')) continue
    api.symbols.add(name)
    api.functions.set(name, { requiredParams: countCParams(match[2] ?? '') })
  }
  return api
}

function countCParams(raw: string): number {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === 'void') return 0
  return splitParams(trimmed).filter(p => p.trim() && p.trim() !== '...').length
}

// Helpers

function emptyApi(): PublicApi {
  return { symbols: new Set(), functions: new Map(), interfaces: new Map() }
}

function countGoParams(params: string): number {
  const trimmed = params.trim()
  if (!trimmed) return 0
  return splitParams(trimmed).length
}

function splitParams(params: string): string[] {
  const result: string[] = []
  let depth = 0
  let current = ''
  for (const char of params) {
    if (char === '<' || char === '(' || char === '[' || char === '{') depth++
    if (char === '>' || char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) result.push(current)
  return result
}

function isSemanticSourcePath(path: string): boolean {
  return isTsJsPath(path) || /\.(go|py|rs|java|kts?|rb|php|swift|dart|cs|cpp|cc|cxx|hpp|h|c)$/.test(path)
}

function isTsJsPath(path: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)
}

function hasTestChange(changes: FileChange[]): boolean {
  return changes.some(c => /(^|\/)(__tests__|test|tests)\//.test(c.path) || /\.(test|spec)\.[tj]sx?$/.test(c.path))
}

function changesExecutableCode(changes: FileChange[]): boolean {
  return changes.some(c => /\.(ts|tsx|js|jsx|go|py|rs|java|cs)$/.test(c.path))
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchGlob(path.replace(/\\/g, '/'), pattern))
}

function matchGlob(path: string, pattern: string): boolean {
  if (pattern === '**') return true
  if (path === pattern) return true
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]+')
    .replace(/\x00/g, '.*')
  return new RegExp(`^${escaped}$`).test(path)
}

function dedupeFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>()
  return findings.filter(finding => {
    const key = `${finding.category}:${finding.file ?? ''}:${finding.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
