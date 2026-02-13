export default defineConfig({
  root: '.',  // . = dossier où se trouve vite.config.js (frontend/)
  base: './', // chemins relatifs
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: 'index.html', // Important pour que Vite sache quoi builder
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          crypto: ['tweetnacl', 'bs58', 'buffer'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    outDir: 'dist', // dossier final pour Railway
  },
})
