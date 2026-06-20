import { defineConfig } from 'vite';

export default defineConfig({
  base: '/potatogang/',
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      usePolling: true, // Useful for Docker environments on Windows host
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
