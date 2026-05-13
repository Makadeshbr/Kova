import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig({
  main: {
    // @kova/* packages are bundled; all others (including native @lydell/node-pty) are externalized
    plugins: [externalizeDepsPlugin({ exclude: [/^@kova\//] as unknown as string[] })],
    build: {
      rollupOptions: {
        external: ['electron', '@lydell/node-pty'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
    define: {
      __KOVA_VERSION__: JSON.stringify(pkg.version),
    },
    optimizeDeps: {
      // xterm packages are ESM — Vite needs to process them
      include: ['@xterm/xterm', '@xterm/addon-fit'],
    },
  },
})
