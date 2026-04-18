import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src'],
      tsconfigPath: 'tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'google/index': resolve(__dirname, 'src/google/index.ts'),
      },
      formats: ['es'],
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^@radix-ui\//,
        /^strata-adapters($|\/)/,
        /^strata-data-sync($|\/)/,
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
  },
});
