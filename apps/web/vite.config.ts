import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const port = process.env.PORT || env.PORT || '3000';
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, strictPort: true, proxy: { '/api': `http://localhost:${port}` } },
  };
});
