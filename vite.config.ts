import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves this app at a subpath (username.github.io/Trader-Dashboard/),
    // so assets need that prefix there. Render (and any other host serving from its own
    // domain root) needs plain '/' instead — otherwise every asset 404s and the page is
    // blank. GH_PAGES_BUILD is set only by the GitHub Actions Pages workflow, never by
    // Render's build command, so this correctly resolves per platform automatically.
    base: process.env.GH_PAGES_BUILD === 'true' ? '/Trader-Dashboard/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
