import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fishAudioProxy = {
  target: 'https://api.fish.audio',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/fish-audio/, ''),
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/fish-audio': fishAudioProxy,
    },
  },
  preview: {
    proxy: {
      '/api/fish-audio': fishAudioProxy,
    },
  },
  build: {
    outDir: 'dist',
  },
});
