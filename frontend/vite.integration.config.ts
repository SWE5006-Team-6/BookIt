/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    css: true,
    testTimeout: 15000,
    fileParallelism: false,
    include: ['test/integration/**/*.integration.test.{ts,tsx}'],
    coverage: {
      enabled: false,
    },
  },
});
