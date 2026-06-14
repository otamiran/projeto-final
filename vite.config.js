// Configuração do Vite com suporte a React (JSX)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react()],       // habilita JSX e hot-reload do React
  server:  { port: 5173 },  // porta local de desenvolvimento
  base: '/',                // ✅ Vercel usa raiz — não precisa de subpasta
  build: {
    outDir: 'dist',
  },
})

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.icon.png"],
      manifest: {
        name: "Passagem de Turno",
        short_name: "Passagem",
        description: "Aplicativo de passagem de turno",
        theme_color: "#f0a500",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});