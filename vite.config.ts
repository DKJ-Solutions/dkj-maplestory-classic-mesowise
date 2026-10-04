/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// GitHub Pages serveert de app onder /<repo-naam>/.
export default defineConfig({
  base: '/dkj-maplestory-classic-mesowise/',
  plugins: [preact()],
  test: {
    // .test.ts = pure rekenmodules, in node. .test.tsx = componenttests; die kiezen zelf happy-dom met een
    // `// @vitest-environment happy-dom`-docblock bovenaan.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
