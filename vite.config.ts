import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // 1. CORREGIDO: La base en GitHub Pages SIEMPRE debe llevar barras diagonales antes y después
    base: '/Docx-Merger-MultiZIP/', 
    
    plugins: [react(), tailwindcss()],
    
    build: {
      emptyOutDir: true,
      minify: false 
    }, // 2. CORREGIDO: Faltaba cerrar la llave } y poner la coma , aquí

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
