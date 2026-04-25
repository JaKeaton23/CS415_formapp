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
