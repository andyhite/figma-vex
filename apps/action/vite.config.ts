import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@figma-vex/shared': resolve(__dirname, '../../packages/shared/src')
    }
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    ssr: 'src/index.ts',
    rollupOptions: {
      external: [/^@actions\//],
      output: {
        entryFileNames: 'action.js'
      }
    },
    target: 'node20',
    minify: false,
    sourcemap: false
  }
})
