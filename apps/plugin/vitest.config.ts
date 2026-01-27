import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@figma-vex/shared': resolve(__dirname, '../../packages/shared/src'),
      '@plugin': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/test-setup.ts', '*.config.*']
    }
  }
})
