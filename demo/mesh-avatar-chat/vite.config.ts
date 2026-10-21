import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_BASE_PATH is set by the GitHub Pages workflow (e.g. "/aituber-onair/mesh-avatar-chat/").
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
});
