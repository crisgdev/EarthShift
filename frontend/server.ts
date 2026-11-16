import app from './app.js';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT)||3000;

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--preview');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : {
          port: Number(process.env.EARTHSHIFT_HMR_PORT) || PORT + 21678,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Piura Watch NASA Observatory server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
