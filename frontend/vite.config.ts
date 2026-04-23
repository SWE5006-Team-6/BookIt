/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

const isCiCoverageRun = process.env.VITEST_CI_COVERAGE === '1'

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
      reporter: isCiCoverageRun
        ? ['text', 'html', 'clover', 'json', 'json-summary']
        : undefined,
      include: [
        'src/lib/**/*.ts',
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
      ],
      thresholds: {
        statements: isCiCoverageRun ? 0 : 90,
        branches: isCiCoverageRun ? 0 : 86,
        functions: isCiCoverageRun ? 0 : 90,
        lines: isCiCoverageRun ? 0 : 92,
      },
    },
  },
})
