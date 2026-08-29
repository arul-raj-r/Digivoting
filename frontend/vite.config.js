import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables from the current working directory.
  // Passing '' as the third parameter loads all variables (no VITE_ prefix required).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL || 'http://localhost:8000/api/v1'),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || ''),
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
