import { build } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Draait de echte offline-build (vite.config.ts, mode 'offline') in het geheugen (write: false): geen dist/ nodig
// en niets op schijf. Zo is de HTML-transformatie van singleFile() getest op wat er werkelijk uitkomt.
type Item = { type: 'chunk' | 'asset'; fileName: string; code?: string; source?: string | Uint8Array }

// Vitest zet NODE_ENV op 'test'; de echte build draait als production (anders krijg je de dev-bundel van Preact).
afterEach(() => vi.unstubAllEnvs())

async function offlineBundle(): Promise<Item[]> {
  vi.stubEnv('NODE_ENV', 'production')
  const result = await build({ mode: 'offline', logLevel: 'silent', build: { write: false } })
  const outputs = (Array.isArray(result) ? result : [result]) as unknown as { output: Item[] }[]
  return outputs.flatMap((o) => o.output)
}

describe('de offline-build (singleFile)', () => {
  it('levert precies één bestand: mesowise-offline.html, met alles erin', async () => {
    const out = await offlineBundle()
    expect(out.map((o) => o.fileName)).toEqual(['mesowise-offline.html'])
    const html = String(out[0].source)

    // JS en CSS staan inline, er is niets extern meer om te laden.
    expect(html).toMatch(/<script type="module">/)
    expect(html).toMatch(/<style>/)
    expect(html).not.toMatch(/<script[^>]*\ssrc=/)
    expect(html).not.toMatch(/<link rel="stylesheet"/)

    // Geen manifest of apple-touch-icon; het favicon is een data-URI.
    expect(html).not.toMatch(/rel="manifest"/)
    expect(html).not.toMatch(/apple-touch-icon/)
    expect(html).toMatch(/<link rel="icon"[^>]*href="data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+"/)

    // Geen sluitende script-/style-tag midden in de inhoud: er is er precies één per blok, aan het eind.
    expect(html.match(/<\/script/gi)).toHaveLength(1)
    expect(html.match(/<\/style/gi)).toHaveLength(1)

    // Geen absolute basis-paden van de webversie (de offline-build gebruikt ./).
    // Geen lokaal pad van de bouwer in het bestand.
    expect(html).not.toMatch(/[A-Za-z]:[\/]Users[\/]/)
    expect(html).not.toMatch(/["'`(]\/dkj-maplestory-classic-mesowise\//)
  }, 60_000)
})
