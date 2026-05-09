import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@kova/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@kova/agent': resolve(__dirname, '../../packages/agent/src/index.ts'),
      '@kova/adapters': resolve(__dirname, '../../packages/adapters/src/index.ts'),
      '@kova/orchestrator': resolve(__dirname, '../../packages/orchestrator/src/index.ts'),
      '@kova/project': resolve(__dirname, '../../packages/project/src/index.ts'),
      '@kova/context': resolve(__dirname, '../../packages/context/src/index.ts'),
      '@kova/memory': resolve(__dirname, '../../packages/memory/src/index.ts'),
      '@kova/application': resolve(__dirname, '../../packages/application/src/index.ts'),
      '@kova/decision': resolve(__dirname, '../../packages/decision/src/index.ts'),
      '@kova/execution': resolve(__dirname, '../../packages/execution/src/index.ts'),
    },
  },
})
