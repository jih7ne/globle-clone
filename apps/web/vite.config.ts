import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Forward API calls to the local Worker (`npm run dev:api`); E2E tests point it elsewhere.
const proxy = { '/api': process.env.API_URL ?? 'http://localhost:8787' };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
});
