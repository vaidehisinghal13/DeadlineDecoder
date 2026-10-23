import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the React SPA. The serverless API in /api is served by
// `vercel dev` (and by Vercel in production), not by Vite itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
