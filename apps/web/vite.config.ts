import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Forward API calls to the local Worker (`npm run dev:api`); E2E tests point it elsewhere.
const proxy = { '/api': process.env.API_URL ?? 'http://localhost:8787' };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
  // The map worker (lib/baseLayer.worker.ts) uses top-level await and dynamic imports.
  worker: { format: 'es' },
  // Two pages: the game, and the beta feedback form served at /feedback.
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        feedback: fileURLToPath(new URL('feedback.html', import.meta.url)),
      },
    },
  },
});
