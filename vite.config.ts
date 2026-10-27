import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/kaspa-org': {
          target: 'https://api.kaspa.org',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/kaspa-org/, ''),
        },
        '/api/kaspa-tn10': {
          target: 'https://api-tn10.kaspa.org',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/kaspa-tn10/, ''),
        },
        '/api/kasparocket-proxy': {
          target: 'https://kasparocket.fun',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/kasparocket-proxy/, ''),
        },
      },
    },
  };
});
