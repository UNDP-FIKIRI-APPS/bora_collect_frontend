import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    // Désactiver le cache pour éviter les problèmes MIME
    headers: {
      'Cache-Control': 'no-store'
    }
  },
  build: {
    // Assurer que les assets sont servis avec les bons types MIME
    assetsDir: 'assets',
    // Générer un manifest pour le cache
    manifest: true,
    rollupOptions: {
      output: {
        // Nommer les fichiers de manière prévisible
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Code splitting par route et vendor
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('react-toastify')) {
              return 'vendor-ui';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel';
            }
            // Autres node_modules
            return 'vendor';
          }
        }
      }
    },
    // Réduire la limite pour forcer l'optimisation
    chunkSizeWarningLimit: 500,
    // Utiliser esbuild (plus rapide et inclus dans Vite) au lieu de terser
    minify: 'esbuild',
    // Options esbuild pour supprimer console.log en production
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
  },
  // Configuration pour la production
  base: '/',
  // Configuration CDN pour les assets en production
  ...(process.env.VITE_CDN_URL && {
    base: process.env.VITE_CDN_URL,
  }),
  // Désactiver les Service Workers si présents
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
