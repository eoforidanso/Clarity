import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    assetsDir: 'static',
    // Raise the warning threshold — Sentry + React are legitimately large
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Vendor: Sentry (large, rarely changes)
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }
          // Keep the heavy pages in their own chunks (already lazy-loaded)
          if (id.includes('src/pages/ChartPage')) return 'page-chart';
          if (id.includes('src/pages/Schedule')) return 'page-schedule';
          if (id.includes('src/pages/EPrescribe')) return 'page-eprescribe';
          if (id.includes('src/pages/Billing') || id.includes('src/pages/Claims') || id.includes('src/pages/Charge')) return 'pages-billing';
        },
      },
    },
  },
})

