// Configuração do Vite com suporte a React (JSX)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],        // habilita JSX e hot-reload do React
  server:  { port: 5173 },   // porta local de desenvolvimento
  base: '/passagem-turno/',  // ⚠️ nome do repositório no GitHub Pages
  build: {
    outDir: 'dist',          // pasta gerada pelo npm run build
  },
})
