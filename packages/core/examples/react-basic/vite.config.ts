import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

// https://vite.dev/config/
export default defineConfig({
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
  plugins: [react()],
});
