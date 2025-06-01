import { defineConfig } from 'tsup';

// Example configuration for UI component libraries with CSS
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true, // Enable code splitting for components
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
  target: 'es2020',
  platform: 'browser',
  external: ['react', 'react-dom'],

  // Handle CSS imports
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    };
    // Enable CSS bundling
    options.loader = {
      '.css': 'css',
    };
  },

  // Alternative: inject CSS as style tags
  injectStyle: true,

  // Generate separate CSS file
  // css: true,
});
