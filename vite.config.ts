import { resolve } from 'path';
import { defineConfig } from 'vite';

// Plugin backend build configuration
// Figma provides __html__ at runtime from manifest.json's "ui" field
export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/plugin/main.ts'),
      formats: ['es'],
      fileName: () => 'plugin.js',
    },
    outDir: 'dist',
    emptyDirOnBuildStart: false,
    minify: mode === 'production',
    sourcemap: mode !== 'production' ? 'inline' : false,
    target: 'es2017',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@plugin': resolve(__dirname, 'src/plugin'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
}));
