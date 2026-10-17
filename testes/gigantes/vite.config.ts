// Servidor de desenvolvimento só para os testes dos processos gigantes (Firebase simulado; /api vai para o servidor real em teste).
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
const raiz = path.resolve(__dirname, '../..');
export default defineConfig({
  root: raiz,
  plugins: [react(), tailwindcss()],
  resolve: { alias: [
    { find: /^firebase\/app$/, replacement: path.resolve(__dirname, '_stubs/app.ts') },
    { find: /^firebase\/auth$/, replacement: path.resolve(__dirname, '_stubs/auth.ts') },
    { find: /^firebase\/firestore$/, replacement: path.resolve(__dirname, '_stubs/firestore.ts') },
    { find: '@', replacement: raiz },
  ] },
  server: { port: 5198, host: '127.0.0.1', hmr: false, fs: { allow: [raiz] }, proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true } } },
});
