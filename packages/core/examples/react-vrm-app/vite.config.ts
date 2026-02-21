import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceThreeRoot = path.resolve(__dirname, '../../../../node_modules/three');

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement: path.resolve(workspaceThreeRoot, 'build/three.module.js'),
      },
      {
        find: /^three\/examples\/jsm\/(.*)$/,
        replacement: `${path.resolve(workspaceThreeRoot, 'examples/jsm')}/$1`,
      },
    ],
  },
  plugins: [react()],
});
