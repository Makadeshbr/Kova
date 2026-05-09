# @kova/application — Apply, Checkpoint e Safe Zones

## O que é
Aplica mudanças de arquivo em disco com segurança: verifica safe zones, cria checkpoint antes de escrever, e permite rollback se algo falhar.

## API pública

```typescript
new CodeApplicationEngine(projectRoot: string, safeZoneConfig?: Partial<SafeZoneConfig>)

engine.preview(changes: FileChange[]): string
engine.apply(changes: FileChange[], taskId: string, harnessScore?: number): Promise<ApplyResult>
engine.rollback(checkpointId: string): Promise<void>
```

## apply() — fluxo interno
1. Verifica safe zones — bloqueia modificação/deleção sem permissão
2. Detecta alteração externa (arquivo mudou desde o snapshot)
3. Cria checkpoint (snapshot dos arquivos atuais)
4. Escreve mudanças em disco
5. Retorna `ApplyResult`

```typescript
interface ApplyResult {
  applied: boolean
  patches: PatchRecord[]
  checkpointId: string
  reason?: string  // por que não foi aplicado, se applied = false
}
```

## Safe zones padrão (bloqueiam modify e delete)
```
.env*
package-lock.json, pnpm-lock.yaml, yarn.lock, Cargo.lock, go.sum
package.json
docker-compose*.yml, docker-compose*.yaml
.github/**
config/**
```
`create` em safe zones é permitido (criar arquivo novo). `modify` e `delete` são bloqueados.

## Checkpoints
```typescript
createCheckpoint(projectRoot, changes)  → CheckpointMeta
restoreCheckpoint(projectRoot, checkpointId) → void
listCheckpoints(projectRoot) → CheckpointMeta[]
deleteCheckpoint(projectRoot, checkpointId) → void
```
Checkpoints ficam em `.kova/checkpoints/` dentro do projeto.

## Invariantes
- `rollback()` só funciona com `checkpointId` retornado por `apply()`
- `preview()` não escreve nada em disco — só retorna representação textual
- Se `apply()` retornar `applied: false`, nada foi escrito — não há o que reverter
- O `ExecutionEngine.abort()` chama `rollback()` automaticamente com o último `checkpointId`

## O que NÃO fazer
- Não chamar `apply()` diretamente sem verificar `ApplyResult.applied`
- Não assumir que safe zone pode ser bypassada sem modificar `safeZoneConfig`
- Não remover o `try/finally` em volta de `apply()` — é a garantia de rollback

## Dependências
Importa de: `@kova/shared`
