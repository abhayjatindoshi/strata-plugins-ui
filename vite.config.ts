import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: '**/*.svg?react',
      svgrOptions: {
        svgProps: {
          width: '1em',
          height: '1em',
          focusable: 'false',
          'aria-hidden': 'true',
        },
      },
    }),
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
        'react/index': resolve(__dirname, 'src/react/index.ts'),
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
        'react-router',
        /^@radix-ui\//,
        /^strata-adapters($|\/)/,
        /^strata-data-sync($|\/)/,
        /^strata-plugins-ui($|\/)/,
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
