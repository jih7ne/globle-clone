import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward API calls to the local Worker (`npm run dev:api`).
    proxy: { '/api': 'http://localhost:8787' },
  },
});
