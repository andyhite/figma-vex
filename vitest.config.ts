import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const sharedConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      '@plugin': resolve(__dirname, 'src/plugin'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
};

export default defineConfig({
  ...sharedConfig,
  test: {
    globals: true,
    forceExit: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/test/', '*.config.*'],
    },
    setupFiles: ['src/test/setup.ts'],
    // Use projects to define different environments for different test files
    projects: [
      {
        ...sharedConfig,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/plugin/**/*.test.ts', 'src/shared/**/*.test.ts', 'src/action/**/*.test.ts'],
          setupFiles: ['src/test/setup.ts'],
          globals: true,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/ui/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
          globals: true,
        },
      },
    ],
  },
});
