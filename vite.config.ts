import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    // Dev only: the API is served under /api on the app's own origin, so the
    // refresh cookie (path /auth on the API) becomes /api/auth here.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (p) => p.replace(/^\/api/, ''),
        cookiePathRewrite: { '/auth': '/api/auth' },
      },
    },
  },
})
