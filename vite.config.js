import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  base: '/StudIPCalendarRenamerWeb/', // your repo name
  plugins: [
    // Add these plugins so Rollup can resolve CommonJS modules
    nodeResolve({ browser: true }),
    commonjs()
  ],
  build: {
    rollupOptions: {
      // ensure ical.js is bundled, not external
      external: [],
    }
  }
});