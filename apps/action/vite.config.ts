import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@figma-vex/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  ssr: {
    // Bundle all dependencies for GitHub Actions (no node_modules at runtime)
    noExternal: true,
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    ssr: 'src/index.ts',
    rollupOptions: {
      output: {
        entryFileNames: 'action.js',
      },
    },
    target: 'node20',
    minify: false,
    sourcemap: false,
  },
});
