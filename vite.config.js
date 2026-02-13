import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',       // racine du projet
  base: './',      // permet les chemins relatifs
  build: {
    outDir: 'dist'
  }
})
