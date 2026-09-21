import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dynamic-logo-dev-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/logo.png') {
            res.writeHead(302, { Location: 'http://localhost:5000/api/public/logo' });
            return res.end();
          }
          if (req.url === '/favicon.ico') {
            res.writeHead(302, { Location: 'http://localhost:5000/api/public/favicon' });
            return res.end();
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (id.includes('react-icons') || id.includes('lucide-react')) {
              return 'icons-vendor';
            }
          }
        }
      }
    }
  }
});
