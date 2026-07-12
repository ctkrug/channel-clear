import { defineConfig } from 'vite';

// Relative base so the built site works when hosted under any subpath
// (e.g. apps.charliekrug.com/channel-clear), not just the domain root.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
  },
});
