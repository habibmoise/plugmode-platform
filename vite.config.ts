// vite.config.ts - Add CSP support for PDF.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  server: {
    headers: {
      // Allow PDF.js worker in development
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  define: {
    // Ensure PDF.js can find its worker
    'process.env': {}
  },
  worker: {
    format: 'es'
  }
})