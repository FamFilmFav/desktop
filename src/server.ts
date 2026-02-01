import path from 'path';
import express, { type Express, type Request, type Response } from 'express';

const rootDir = path.join(__dirname, '..');
const distPath = path.join(rootDir, 'dist');
const publicPath = path.join(rootDir, 'public');

export function startServer(app: Express, port: number): ReturnType<Express['listen']> {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/version', (_req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require(path.join(rootDir, 'package.json')) as { version: string };
    res.json({ version: packageJson.version });
  });

  app.use('/dist', express.static(distPath));
  app.use(express.static(publicPath));

  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  const server = app.listen(port, 'localhost', () => {
    console.info(`Web server listening on http://localhost:${port}`);
  });

  return server;
}
