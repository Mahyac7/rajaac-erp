import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api ke backend Express (port 4000) saat development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
