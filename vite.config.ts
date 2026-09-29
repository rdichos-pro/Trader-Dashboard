import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves this app at a subpath (username.github.io/repo-name/),
    // so assets need that prefix there. Automatically extract repository name from
    // GITHUB_REPOSITORY (e.g. 'user/Trader-Dashboard') or fallback to './' relative path.
    // Render/custom domains serve from root '/', so GH_PAGES_BUILD is set only by GitHub Actions.
    base: process.env.GH_PAGES_BUILD === 'true'
      ? (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : './')
      : './',
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
