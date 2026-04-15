/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH?.trim() || '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    css: true,
    testTimeout: 15000,
    fileParallelism: false,
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'test/integration/**'],
    coverage: {
      provider: 'v8',
      processingConcurrency: 1,
      include: [
        'src/lib/**/*.ts',
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
      ],
      thresholds: {
        statements: 90,
        branches: 86,
        functions: 90,
        lines: 92,
      },
    },
  },
})
