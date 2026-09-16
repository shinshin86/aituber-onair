import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.MALECNS_DATA_DIR
  ? resolve(process.env.MALECNS_DATA_DIR)
  : resolve(root, '../../data/malecns-v1');
const allowed = new Set([
  'manifest.json',
  'graph.bin',
  'metadata.json',
  'soma-positions.f32',
]);
export default defineConfig({
  root,
  server: { host: '127.0.0.1', port: 5183, strictPort: true },
  plugins: [
    {
      name: 'local-brain-data',
      configureServer(server) {
        server.middlewares.use('/brain-data', async (req, res, next) => {
          const name = (req.url ?? '').split('?')[0].slice(1);
          if (!allowed.has(name)) return next();
          try {
            const file = resolve(dataDir, name);
            const info = await stat(file);
            res.setHeader(
              'Content-Type',
              name.endsWith('.json')
                ? 'application/json'
                : 'application/octet-stream'
            );
            res.setHeader('Content-Length', info.size);
            createReadStream(file)
              .on('error', () => res.destroy())
              .pipe(res);
          } catch {
            res.statusCode = 404;
            res.end('Prepare the MaleCNS dataset or set MALECNS_DATA_DIR.');
          }
        });
      },
    },
  ],
});
