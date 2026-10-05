/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin, type Rolldown } from 'vite'
import preact from '@preact/preset-vite'

/**
 * De offline-build (`vite build --mode offline`): één HTML-bestand met alle JS en CSS erin, dat met een dubbelklik
 * vanaf schijf (file://) werkt. Externe module-scripts laden daar niet, een inline script wel. Manifest en
 * apple-touch-icon vervallen (geen service worker, niet installeerbaar); het favicon gaat als data-URI mee.
 */
function singleFile(): Plugin {
  // Een sluitende tag of een HTML-commentaaropening in de inhoud zou het inline blok verstoren (voortijdig sluiten,
  // of de dubbel-ge-escapete scripttoestand van de HTML-parser).
  const safe = (code: string, tag: string) => code.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`).replace(/<!--/g, '<\\!--')
  return {
    name: 'mesowise-single-file',
    apply: 'build',
    // Na de html-plugin van Vite, zodat index.html al in de bundel staat met zijn script- en link-tags.
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        // Het pad komt van dit bestand, niet van de werkmap waaruit vite gestart is.
        const favicon = `data:image/svg+xml;base64,${readFileSync(fileURLToPath(new URL('./public/favicon.svg', import.meta.url))).toString('base64')}`
        const take = (path: string) => {
          const file = path.replace(/^\.\//, '')
          const item = bundle[file]
          if (!item) this.error(`offline-build: ${path} staat niet in de bundel, dus kan niet worden ingevoegd`)
          delete bundle[file]
          return item.type === 'chunk' ? item.code : String(item.source)
        }
        let scripts = 0
        const page = bundle['index.html'] as Rolldown.OutputAsset
        page.source = String(page.source)
          .replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]*>\s*/g, '')
          .replace(/(<link rel="icon"[^>]*href=")[^"]*"/, `$1${favicon}"`)
          .replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${safe(take(href), 'style')}</style>`)
          .replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
            scripts++
            return `<script type="module">${safe(take(src), 'script')}</script>`
          })
        if (scripts !== 1) this.error(`offline-build: ${scripts} inline module-scripts gemaakt, verwacht er precies 1`)
        const left = page.source.match(/(?:src|href)="\.?\/assets\/[^"]*"/)
        if (left) this.error(`offline-build: verwijzing naar een extern bestand over: ${left[0]}`)
        page.fileName = 'mesowise-offline.html'
      },
    },
  }
}

// GitHub Pages serveert de app onder /<repo-naam>/. De offline-build gebruikt relatieve paden en komt als
// los bestand naast de gewone build in dist/ (die dus eerst gebouwd wordt: zie "build" in package.json). `build:offline` schrijft naar dist-offline/.
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    base: offline ? './' : '/dkj-maplestory-classic-mesowise/',
    plugins: [preact(), ...(offline ? [singleFile()] : [])],
    // De offline-build voegt alleen zijn eigen bestand toe: niets uit public/ (sw.js, iconen) erbij.
    publicDir: offline ? false : 'public',
    build: offline
      ? {
          emptyOutDir: false,
          cssCodeSplit: false,
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          rolldownOptions: { output: { codeSplitting: false } },
        }
      : {},
    test: {
      // .test.ts = pure rekenmodules, in node. .test.tsx = componenttests; die kiezen zelf happy-dom met een
      // `// @vitest-environment happy-dom`-docblock bovenaan.
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
