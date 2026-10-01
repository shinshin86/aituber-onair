import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fishAudioProxy = {
  target: 'https://api.fish.audio',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/fish-audio/, ''),
};

const deepgramProxy = {
  target: 'https://api.deepgram.com',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/deepgram/, ''),
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/fish-audio': fishAudioProxy,
      '/api/deepgram': deepgramProxy,
    },
  },
  preview: {
    proxy: {
      '/api/fish-audio': fishAudioProxy,
      '/api/deepgram': deepgramProxy,
    },
  },
  build: {
    outDir: 'dist',
  },
});
