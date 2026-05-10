import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the SignUp Form React app.
// Exposes the dev server on 0.0.0.0 so it works inside Docker,
// and proxies /api requests to the Express backend during development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      // Polling is required for reliable HMR inside Docker on some platforms.
      usePolling: true,
    },
    // GitHub Codespaces forwards over HTTPS on port 443, so the HMR client
    // must be told to use 443 / wss instead of the default same-port ws.
    // When CODESPACES is set, GitHub also exposes CODESPACE_NAME which we
    // use to build the public host. Outside Codespaces this is a no-op.
    hmr: process.env.CODESPACES === 'true'
      ? {
          host: `${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`,
          protocol: 'wss',
          clientPort: 443,
        }
      : undefined,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
