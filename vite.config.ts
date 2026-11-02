import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { HOME, TOOLS } from './src/tools.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Writes dist/<tool>/index.html for every tool with its own <title> and meta
 * description, so each tool URL is a real static page (SEO landing pages).
 * Also writes /board and a 404.html fallback for static hosts.
 */
function toolPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'tide-tool-pages',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const html = readFileSync(resolve(outDir, 'index.html'), 'utf8');
      const page = (title: string, description: string, extraHead = '') =>
        html
          .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
          .replace('</head>', `${extraHead}</head>`);
      const write = (dir: string, content: string) => {
        mkdirSync(resolve(outDir, dir), { recursive: true });
        writeFileSync(resolve(outDir, dir, 'index.html'), content);
      };
      for (const t of TOOLS) write(t.id, page(t.title, t.description));
      write('board', page('Tide Board', 'All Tide states, phone and desktop.', '<meta name="robots" content="noindex" />'));
      writeFileSync(resolve(outDir, '404.html'), page(HOME.title, HOME.description));
    }
  };
}

export default defineConfig({
  // Set BASE_PATH=/converters/ when deploying to a sub-path (e.g. GitHub Pages).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), toolPages()],
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  build: { chunkSizeWarningLimit: 600 }
});
