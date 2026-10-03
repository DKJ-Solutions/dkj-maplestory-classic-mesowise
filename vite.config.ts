/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// GitHub Pages serveert de app onder /<repo-naam>/.
export default defineConfig({
  base: '/dkj-maplestory-classic-mesowise/',
  plugins: [preact()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
