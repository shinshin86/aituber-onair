import { defineConfig } from 'vite';

// Dev mode mirrors the static port the MCP server uses (3002) so OBS
// configuration stays identical between dev and production.
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: Number(process.env.TAROT_VIEWER_PORT ?? 3002)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0
  }
});
