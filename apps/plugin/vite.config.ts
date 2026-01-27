import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@figma-vex/shared': resolve(__dirname, '../../packages/shared/src'),
      '@plugin': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    target: 'es2015',
    lib: {
      entry: 'src/main.ts',
      fileName: () => 'plugin.js',
      formats: ['iife'],
      name: 'FigmaVexPlugin'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'plugin.js'
      }
    }
  }
})
