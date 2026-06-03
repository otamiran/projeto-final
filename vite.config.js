// Configuração do Vite com suporte a React (JSX)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],       // habilita JSX e hot-reload do React
  server:  { port: 5173 },  // porta local de desenvolvimento
  base: '/',                // ✅ Vercel usa raiz — não precisa de subpasta
  build: {
    outDir: 'dist',
  },
})
