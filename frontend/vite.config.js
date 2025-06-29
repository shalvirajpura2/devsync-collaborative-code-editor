import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://devsync-backend-erdnbdbpb7azcdet.westindia-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'https://devsync-backend-erdnbdbpb7azcdet.westindia-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
  define: {
    // Ensure environment variables are available at build time
    'process.env': {}
  }
})
