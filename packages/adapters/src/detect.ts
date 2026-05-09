import type { StackAdapter } from '@kova/shared'
import type { ProjectProfile } from '@kova/shared'
import { TypeScriptAdapter } from './typescript'
import { PythonAdapter } from './python'
import { GoAdapter } from './go'
import { RustAdapter } from './rust'
import { JavaMavenAdapter, GradleAdapter } from './jvm'
import { DotNetAdapter } from './dotnet'
import { RubyAdapter, PhpAdapter } from './scripting'
import { SwiftAdapter, FlutterAdapter } from './mobile'
import { CppAdapter, CAdapter } from './systems'
import { GenericAdapter } from './generic-adapter'

// Ordered by specificity — most specific markers first
const ADAPTERS: StackAdapter[] = [
  FlutterAdapter,     // pubspec.yaml (before generic checks)
  SwiftAdapter,       // Package.swift / Podfile
  DotNetAdapter,      // .csproj / global.json
  GradleAdapter,      // build.gradle / settings.gradle.kts
  JavaMavenAdapter,   // pom.xml
  RustAdapter,        // Cargo.toml
  GoAdapter,          // go.mod
  PythonAdapter,      // pyproject.toml / requirements.txt
  RubyAdapter,        // Gemfile / Rakefile
  PhpAdapter,         // composer.json / artisan
  CppAdapter,         // CMakeLists.txt / meson.build
  TypeScriptAdapter,  // package.json / tsconfig.json (broad — check after specifics)
  CAdapter,           // Makefile only (fallback for C projects)
]

const ADAPTER_BY_NAME = new Map<string, StackAdapter>(
  ADAPTERS.map(adapter => [adapter.name, adapter]),
)

const LANGUAGE_TO_ADAPTER: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'typescript',
  go: 'go',
  python: 'python',
  rust: 'rust',
  java: 'java',
  kotlin: 'gradle',
  csharp: 'dotnet',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  dart: 'flutter',
  cpp: 'cpp',
  c: 'c',
}

export function detectStack(projectRoot: string): StackAdapter {
  for (const adapter of ADAPTERS) {
    if (adapter.detect(projectRoot)) return adapter
  }
  return GenericAdapter
}

export function adapterByName(name: string): StackAdapter | null {
  return ADAPTER_BY_NAME.get(name) ?? null
}

export function adapterFromProjectProfile(profile: ProjectProfile): StackAdapter {
  for (const language of profile.languages) {
    const adapterName = LANGUAGE_TO_ADAPTER[language.name]
    if (!adapterName) continue
    const adapter = adapterByName(adapterName)
    if (adapter) return adapter
  }
  return GenericAdapter
}

// Infers stack from file extensions when project directory is empty (new project)
export function detectStackFromChanges(paths: string[]): StackAdapter | null {
  const exts = new Set(paths.map(p => {
    const name = p.replace(/\\/g, '/').split('/').at(-1) ?? p
    const idx = name.lastIndexOf('.')
    return idx > 0 ? name.slice(idx + 1).toLowerCase() : name.toLowerCase()
  }))

  if (exts.has('go') || paths.some(p => p.endsWith('go.mod'))) return GoAdapter
  if (exts.has('rs') || paths.some(p => p.endsWith('Cargo.toml'))) return RustAdapter
  if (exts.has('py') || paths.some(p => p.endsWith('requirements.txt'))) return PythonAdapter
  if (exts.has('ts') || exts.has('tsx')) return TypeScriptAdapter
  if (exts.has('js') || exts.has('jsx') || exts.has('mjs')) return TypeScriptAdapter
  if (exts.has('java') || paths.some(p => p.endsWith('pom.xml'))) return JavaMavenAdapter
  if (exts.has('kt') || exts.has('kts')) return GradleAdapter
  if (exts.has('cs') || exts.has('csproj')) return DotNetAdapter
  if (exts.has('rb') || paths.some(p => p.endsWith('Gemfile'))) return RubyAdapter
  if (exts.has('php') || paths.some(p => p.endsWith('composer.json'))) return PhpAdapter
  if (exts.has('swift') || paths.some(p => p.endsWith('Package.swift'))) return SwiftAdapter
  if (exts.has('dart') || paths.some(p => p.endsWith('pubspec.yaml'))) return FlutterAdapter
  if (exts.has('cpp') || exts.has('cc') || exts.has('cxx')) return CppAdapter
  if (exts.has('c') || exts.has('h')) return CAdapter
  return null
}
