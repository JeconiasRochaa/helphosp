import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pptxgenjs')) return 'export';
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts';
          if (id.includes('react')) return 'react';
        }
      }
    }
  }
});
