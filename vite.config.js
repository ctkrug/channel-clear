import { defineConfig } from 'vite';

// Relative base so the built site works when hosted under any subpath
// (e.g. apps.charliekrug.com/channel-clear), not just the domain root.
export default defineConfig({
  base: './',
  build: {
    // Built static site is committed as site/ and deployed under a subpath.
    outDir: 'site',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/main.js'],
    },
  },
});
