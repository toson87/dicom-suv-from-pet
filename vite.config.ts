import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/dcmjs')) return 'dcmjs'
          if (id.includes('node_modules/dicom-parser')) return 'dicom-parser'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor'
          return undefined
        },
      },
    },
  },
})
