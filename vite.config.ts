import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tripayCreate from './api/tripay/create';
import tripayStatus from './api/tripay/status';
import paydisiniCreate from './api/paydisini/create';
import paydisiniStatus from './api/paydisini/status';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'local-api-middleware',
          configureServer(server) {
            server.middlewares.use('/api/tripay/create', async (req, res) => {
              await tripayCreate(req as any, res as any);
            });
            server.middlewares.use('/api/tripay/status', async (req, res) => {
              await tripayStatus(req as any, res as any);
            });
            server.middlewares.use('/api/paydisini/create', async (req, res) => {
              await paydisiniCreate(req as any, res as any);
            });
            server.middlewares.use('/api/paydisini/status', async (req, res) => {
              await paydisiniStatus(req as any, res as any);
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
