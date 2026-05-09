import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { detectStack } from '@kova/adapters'
import { DependencyGraph } from '@kova/context'

const EXTERNAL_PREFIX = 'external:'

export interface GraphOutputNode {
  id: string
  name: string
  path: string
  type: 'module' | 'external'
  loc: number
}

export interface GraphOutputLink {
  source: string
  target: string
}

export interface GraphOutput {
  nodes: GraphOutputNode[]
  links: GraphOutputLink[]
}

export async function buildGraphOutput(projectRoot: string): Promise<GraphOutput> {
  const graph = new DependencyGraph()
  await graph.build(projectRoot, detectStack(projectRoot), { includeExternal: true })

  const modules = new Map<string, GraphOutputNode>()
  const linkKeys = new Set<string>()
  const links: GraphOutputLink[] = []

  for (const [file, deps] of graph.fullGraph()) {
    const source = ensureModule(modules, file, projectRoot)
    for (const dep of deps) {
      const target = dep.startsWith(EXTERNAL_PREFIX)
        ? ensureExternal(modules, dep)
        : ensureModule(modules, dep, projectRoot)
      addLink(links, linkKeys, source.id, target.id)
    }
  }

  return { nodes: [...modules.values()], links }
}

function ensureModule(
  modules: Map<string, GraphOutputNode>,
  filePath: string,
  projectRoot: string,
): GraphOutputNode {
  const id = moduleId(filePath)
  const existing = modules.get(id)
  if (existing) {
    existing.loc += countLoc(projectRoot, filePath)
    return existing
  }

  const node = {
    id,
    name: id.split('/').pop() ?? id,
    path: filePath,
    type: 'module' as const,
    loc: countLoc(projectRoot, filePath),
  }
  modules.set(id, node)
  return node
}

function ensureExternal(
  modules: Map<string, GraphOutputNode>,
  dep: string,
): GraphOutputNode {
  const name = dep.slice(EXTERNAL_PREFIX.length)
  const id = `${EXTERNAL_PREFIX}${name}`
  const existing = modules.get(id)
  if (existing) return existing

  const node = { id, name, path: name, type: 'external' as const, loc: 50 }
  modules.set(id, node)
  return node
}

function addLink(
  links: GraphOutputLink[],
  seen: Set<string>,
  source: string,
  target: string,
): void {
  if (source === target) return
  const key = `${source}->${target}`
  if (seen.has(key)) return
  seen.add(key)
  links.push({ source, target })
}

function moduleId(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  if (parts[0] === 'src' && parts[1]) return `src/${parts[1]}`
  if (parts.length > 1) return parts[0]
  return parts[0]
}

function countLoc(projectRoot: string, filePath: string): number {
  try {
    return readFileSync(join(projectRoot, filePath), 'utf-8')
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0).length
  } catch {
    return 1
  }
}
