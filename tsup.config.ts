import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { main: 'electron/main.ts' },
    format: ['cjs'],
    outDir: 'dist-electron',
    outExtension: () => ({ js: '.cjs' }),
    external: ['electron'],
    platform: 'node',
    target: 'node22',
    sourcemap: true,
    clean: true,
    splitting: false,
  },
  {
    entry: { preload: 'electron/preload.ts' },
    format: ['cjs'],
    outDir: 'dist-electron',
    outExtension: () => ({ js: '.cjs' }),
    external: ['electron'],
    platform: 'node',
    target: 'node22',
    sourcemap: true,
    splitting: false,
  },
]);
