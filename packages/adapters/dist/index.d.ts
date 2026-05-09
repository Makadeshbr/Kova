import { StackAdapter, ProjectProfile } from '@kova/shared';

declare const TypeScriptAdapter: StackAdapter;
declare function detectStructure(projectRoot: string): {
    hasSrc: boolean;
    hasTests: boolean;
    entryPoint: string | null;
};

declare const PythonAdapter: StackAdapter;

declare const GoAdapter: StackAdapter;

declare const RustAdapter: StackAdapter;

declare const JavaMavenAdapter: StackAdapter;
declare const GradleAdapter: StackAdapter;

declare const DotNetAdapter: StackAdapter;

declare const RubyAdapter: StackAdapter;
declare const PhpAdapter: StackAdapter;

declare const SwiftAdapter: StackAdapter;
declare const FlutterAdapter: StackAdapter;

declare const CppAdapter: StackAdapter;
declare const CAdapter: StackAdapter;

/**
 * Fallback universal — funciona para qualquer linguagem/stack.
 * Comandos vazios = layer pulado (skipped: true).
 * Usado quando nenhum adapter específico reconhece o projeto.
 */
declare const GenericAdapter: StackAdapter;

declare function detectStack(projectRoot: string): StackAdapter;
declare function adapterByName(name: string): StackAdapter | null;
declare function adapterFromProjectProfile(profile: ProjectProfile): StackAdapter;
declare function detectStackFromChanges(paths: string[]): StackAdapter | null;

type Commands = {
    build: string;
    test: string;
    lint: string;
    format?: string;
};
/**
 * Descobre os comandos reais do projeto sem exigir configuração manual.
 * Prioridade: scripts do projeto > frameworks detectados > defaults do adapter.
 */
declare function resolveCommands(adapter: StackAdapter, projectRoot: string): Commands;

export { CAdapter, CppAdapter, DotNetAdapter, FlutterAdapter, GenericAdapter, GoAdapter, GradleAdapter, JavaMavenAdapter, PhpAdapter, PythonAdapter, RubyAdapter, RustAdapter, SwiftAdapter, TypeScriptAdapter, adapterByName, adapterFromProjectProfile, detectStack, detectStackFromChanges, detectStructure, resolveCommands };
