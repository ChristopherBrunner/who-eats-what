import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['react-simple-maps', 'prop-types'],
  },
  build: {
    rollupOptions: {
      output: {
        // The cuisine dataset is large and changes independently of app code;
        // split it into its own chunk so it caches separately across deploys.
        manualChunks(id) {
          if (id.includes('/data/cuisines.json')) return 'cuisine-data'
        },
      },
    },
  },
})
