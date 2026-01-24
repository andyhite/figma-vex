import { build, context } from 'esbuild';
import { readFileSync, existsSync, watch } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const isWatch = process.argv.includes('--watch');

async function buildPlugin() {
  const htmlPath = resolve(rootDir, 'dist/index.html');
  let htmlContent = '';

  if (existsSync(htmlPath)) {
    htmlContent = readFileSync(htmlPath, 'utf-8');
  }

  const buildOptions = {
    entryPoints: [resolve(rootDir, 'src/plugin/main.ts')],
    bundle: true,
    outfile: resolve(rootDir, 'dist/main.js'),
    target: 'es2015',
    format: 'esm',
    platform: 'browser',
    define: {
      __html__: JSON.stringify(htmlContent),
    },
    alias: {
      '@plugin': resolve(rootDir, 'src/plugin'),
      '@shared': resolve(rootDir, 'src/shared'),
    },
    external: [],
    minify: false,
    sourcemap: false,
    legalComments: 'none',
    plugins: [
      {
        name: 'fix-html-replacement',
        setup(build) {
          build.onEnd(async (result) => {
            if (result.errors.length > 0) return;

            const fs = await import('fs');
            let output = fs.readFileSync(resolve(rootDir, 'dist/main.js'), 'utf-8');

            // Find the figma.showUI call and replace the entire HTML argument
            // This handles cases where the string might be split across lines
            const showUIStart = output.indexOf('figma.showUI(');
            if (showUIStart === -1) return;

            // esbuild converts the string to a template literal (backtick), so look for `, {`
            // Also handle potential double-quoted string output
            let optionsStart = output.indexOf('`, {', showUIStart);
            if (optionsStart === -1) {
              optionsStart = output.indexOf('", {', showUIStart);
            }
            if (optionsStart === -1) return;

            // Extract everything before and after the HTML argument
            const before = output.substring(0, showUIStart + 'figma.showUI('.length);
            // Skip the closing quote/backtick, keep the ", {" part
            const after = output.substring(optionsStart + 1);

            // Replace the HTML argument with a properly escaped single-line JSON string
            const escapedHtml = JSON.stringify(htmlContent);
            output = before + escapedHtml + after;

            fs.writeFileSync(resolve(rootDir, 'dist/main.js'), output, 'utf-8');
          });
        },
      },
    ],
  };

  if (isWatch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('👀 Watching plugin files...');

    // Also watch the HTML file for changes
    if (existsSync(htmlPath)) {
      watch(htmlPath, { persistent: true }, () => {
        console.log('📄 HTML file changed, rebuilding plugin...');
        ctx.rebuild();
      });
    }
  } else {
    const result = await build(buildOptions);
    if (result.errors.length === 0) {
      console.log('✓ Plugin built with esbuild');
    }
  }
}

buildPlugin().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
