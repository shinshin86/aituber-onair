import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const fishAudioProxy = {
  target: 'https://api.fish.audio',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/fish-audio/, ''),
};

// https://vite.dev/config/
export default defineConfig({
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
  plugins: [react()],
});
