/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Set VITE_BASE_PATH=/sit/ (trailing slash) to serve app at e.g. https://www.bookit.com/sit
// When using a base path, put nginx (or similar) in front so /sit serves the built dist (alias to dist/).
export default defineConfig({
  base: (process.env.VITE_BASE_PATH?.trim()) || '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    css: true,
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
})
