import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  // Ensure proper base path for Cloudflare Pages
  base: '/',
  // Public directory - files here are copied to dist root during build
  publicDir: 'public'
})
