import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: '.',
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  define: { 'process.env': {} },
  resolve: { alias: { buffer: 'buffer' } },
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } },
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: { vendor: ['react','react-dom','react-router-dom'], crypto: ['tweetnacl','bs58','buffer'] }
      }
    },
    chunkSizeWarningLimit: 600,
    outDir: 'dist',
  },
})
