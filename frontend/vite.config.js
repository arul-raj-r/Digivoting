import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables from the current working directory.
  // Passing '' as the third parameter loads all variables (no VITE_ prefix required).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL || 'http://localhost:8000/api'),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || ''),
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) {
                return 'vendor-react';
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('qrcode')) {
                return 'vendor-qr';
              }
              if (id.includes('axios')) {
                return 'vendor-network';
              }
            }
          },
        },
      },
    },
  };
});
