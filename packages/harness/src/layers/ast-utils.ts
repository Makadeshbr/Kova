import * as ts from 'typescript'
import { readFileSync } from 'node:fs'
import type { HarnessError, RuleProfile } from '@kova/shared'

export function parseTsFile(filePath: string): ts.SourceFile | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
  } catch {
    return null
  }
}

export function getFunctionViolations(
  sourceFile: ts.SourceFile,
  relPath: string,
  profile: RuleProfile,
): HarnessError[] {
  const errors: HarnessError[] = []

  const visit = (node: ts.Node) => {
    if (isFunctionLike(node) && hasFunctionBody(node)) {
      const body = (node as ts.FunctionLikeDeclaration).body as ts.Block
      const name = getFnName(node, sourceFile)
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
      const complexity = calcComplexity(node)
      const nesting = calcNesting(body, 0)

      if (complexity > profile.cyclomaticLimit) {
        errors.push(makeError(relPath, line,
          `Complexidade ciclomática ${complexity} excede ${profile.cyclomaticLimit} na função '${name}'`,
          'high'))
      }
      if (nesting > profile.nestingLimit) {
        errors.push(makeError(relPath, line,
          `Nesting ${nesting} excede ${profile.nestingLimit} na função '${name}' (Object Calisthenics)`,
          'medium'))
      }
    }
    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return errors
}

function isFunctionLike(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node)
}

function hasFunctionBody(node: ts.Node): boolean {
  const body = (node as ts.FunctionLikeDeclaration).body
  return !!body && ts.isBlock(body)
}

function getFnName(node: ts.Node, sf: ts.SourceFile): string {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return (node as ts.FunctionDeclaration).name?.getText(sf) ?? 'anonymous'
  }
  const parent = (node as ts.Node).parent
  if (ts.isVariableDeclaration(parent)) return parent.name.getText(sf)
  return 'anonymous'
}

function calcComplexity(node: ts.Node): number {
  let count = 1
  const DECISION = new Set([
    ts.SyntaxKind.IfStatement, ts.SyntaxKind.ConditionalExpression,
    ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.CaseClause,
    ts.SyntaxKind.CatchClause,
  ])
  const visit = (n: ts.Node) => {
    if (DECISION.has(n.kind)) count++
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind
      if (op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken) count++
    }
    ts.forEachChild(n, visit)
  }
  ts.forEachChild(node, visit)
  return count
}

function calcNesting(node: ts.Node, depth: number): number {
  const NESTING = new Set([
    ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForInStatement, ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.TryStatement, ts.SyntaxKind.SwitchStatement,
  ])
  const next = NESTING.has(node.kind) ? depth + 1 : depth
  let max = next
  ts.forEachChild(node, child => { max = Math.max(max, calcNesting(child, next)) })
  return max
}

function makeError(file: string, line: number, message: string, severity: HarnessError['severity']): HarnessError {
  return { layer: 'rules', type: 'architecture', severity, fixable: false, message, humanMessage: message, file, line }
}
