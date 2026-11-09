import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: './src/presentation/astro',
  publicDir: './public',
  output: 'static',
  integrations: [react()],
  server: {
    port: 4321,
    strictPort: true,
    host: '127.0.0.1',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  build: {
    assets: 'assets',
    format: 'directory',
  },
});
