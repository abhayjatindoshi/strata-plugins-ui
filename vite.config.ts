import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    libInjectCss(),
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
      entry: resolve(__dirname, 'src/index.ts'),
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
        /^@strata\/plugins($|\/)/,
        /^@strata\/core($|\/)/,
        /^@strata\/plugins-ui($|\/)/,
      ],
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});
