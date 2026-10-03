import { describe, expect, it } from 'vitest'
import swBron from '../../public/sw.js?raw'

const ROOT = 'https://mesowise.example/'
const SUBPAD = 'https://x.github.io/dkj-maplestory-classic-mesowise/'

type Req = { method: string; mode: string; url: string }
type Strategie = 'netwerk-eerst' | 'cache-eerst' | 'verouderd-hergebruiken' | null
type Luisteraars = Record<string, (event: unknown) => void>

interface Worker {
  kiesStrategie(req: Req, scope: string): Strategie
  assetUrls(html: string, scope: string): string[]
  luisteraars: Luisteraars
}

/**
 * Laadt het echte public/sw.js met een nagebootste worker-`self`. Bewust `new Function` en niet
 * `node:vm`: de repo heeft geen @types/node, en voor dit klassieke script geeft het hetzelfde.
 */
function laadWorker(scope: string): Worker {
  const luisteraars: Luisteraars = {}
  const self = {
    registration: { scope },
    addEventListener: (naam: string, fn: (event: unknown) => void) => {
      luisteraars[naam] = fn
    },
  }
  const laad = new Function(
    'self',
    `${swBron}
return { kiesStrategie, assetUrls }`,
  ) as (self: unknown) => Pick<Worker, 'kiesStrategie' | 'assetUrls'>
  const ctx = laad(self)
  return { kiesStrategie: ctx.kiesStrategie, assetUrls: ctx.assetUrls, luisteraars }
}

const { kiesStrategie, assetUrls, luisteraars } = laadWorker(ROOT)
const get = (url: string, mode = 'no-cors'): Req => ({ method: 'GET', mode, url })

describe('sw.js laden', () => {
  it('registreert install, activate en fetch bij het laden', () => {
    expect(Object.keys(luisteraars).sort()).toEqual(['activate', 'fetch', 'install'])
  })
})

describe('kiesStrategie', () => {
  it('kiest netwerk-eerst voor een navigatie', () => {
    expect(kiesStrategie(get(ROOT, 'navigate'), ROOT)).toBe('netwerk-eerst')
  })

  it('kiest netwerk-eerst voor de start-URL met een querystring', () => {
    expect(kiesStrategie(get(ROOT + '?utm_source=pwa', 'navigate'), ROOT)).toBe('netwerk-eerst')
    expect(kiesStrategie(get(ROOT + 'index.html?x=1', 'navigate'), ROOT)).toBe('netwerk-eerst')
  })

  it('kiest cache-eerst voor gehashte bestanden onder assets/', () => {
    expect(kiesStrategie(get(ROOT + 'assets/index-a1b2c3.js'), ROOT)).toBe('cache-eerst')
    expect(kiesStrategie(get(ROOT + 'assets/index-a1b2c3.css'), ROOT)).toBe('cache-eerst')
  })

  it('kiest verouderd-hergebruiken voor manifest, favicon en iconen', () => {
    expect(kiesStrategie(get(ROOT + 'manifest.webmanifest'), ROOT)).toBe('verouderd-hergebruiken')
    expect(kiesStrategie(get(ROOT + 'favicon.svg'), ROOT)).toBe('verouderd-hergebruiken')
    expect(kiesStrategie(get(ROOT + 'icons/icon-192.png'), ROOT)).toBe('verouderd-hergebruiken')
  })

  it('onderschept geen POST of andere methode', () => {
    expect(kiesStrategie({ method: 'POST', mode: 'navigate', url: ROOT }, ROOT)).toBeNull()
    expect(kiesStrategie({ method: 'POST', mode: 'cors', url: ROOT + 'assets/a.js' }, ROOT)).toBeNull()
    expect(kiesStrategie({ method: 'HEAD', mode: 'cors', url: ROOT + 'favicon.svg' }, ROOT)).toBeNull()
  })

  it('onderschept geen ander origin', () => {
    expect(kiesStrategie(get('https://elders.example/assets/a.js'), ROOT)).toBeNull()
    expect(kiesStrategie(get('https://elders.example/', 'navigate'), ROOT)).toBeNull()
    expect(kiesStrategie(get('http://mesowise.example/assets/a.js'), ROOT)).toBeNull()
  })

  it('onderschept sw.js zelf niet, ook niet als navigatie', () => {
    expect(kiesStrategie(get(ROOT + 'sw.js'), ROOT)).toBeNull()
    expect(kiesStrategie(get(ROOT + 'sw.js', 'navigate'), ROOT)).toBeNull()
  })

  it('onderschept sw.js met een querystring ook niet', () => {
    // pathname negeert de query, dus ook sw.js?v=2 blijft ongemoeid.
    expect(kiesStrategie(get(ROOT + 'sw.js?v=2'), ROOT)).toBeNull()
  })

  describe('met een scope die niet de root is', () => {
    it('kiest per soort binnen de scope', () => {
      expect(kiesStrategie(get(SUBPAD, 'navigate'), SUBPAD)).toBe('netwerk-eerst')
      expect(kiesStrategie(get(SUBPAD + 'assets/index-1.js'), SUBPAD)).toBe('cache-eerst')
      expect(kiesStrategie(get(SUBPAD + 'manifest.webmanifest'), SUBPAD)).toBe('verouderd-hergebruiken')
    })

    it('laat een assets/-pad buiten de scope met rust', () => {
      expect(kiesStrategie(get('https://x.github.io/assets/index-1.js'), SUBPAD)).toBeNull()
      expect(kiesStrategie(get('https://x.github.io/andere-app/'), SUBPAD)).toBeNull()
      expect(kiesStrategie(get('https://x.github.io/', 'navigate'), SUBPAD)).toBeNull()
    })

    it('onderschept de sw.js in de scope niet', () => {
      expect(kiesStrategie(get(SUBPAD + 'sw.js'), SUBPAD)).toBeNull()
    })

    it('ziet een sw.js in de root van het domein niet voor de eigen worker aan', () => {
      expect(kiesStrategie(get('https://x.github.io/sw.js'), SUBPAD)).toBeNull()
    })

    it('verwart een broer-pad met dezelfde beginletters niet met de scope', () => {
      expect(
        kiesStrategie(get('https://x.github.io/dkj-maplestory-classic-mesowise-oud/assets/a.js'), SUBPAD),
      ).toBeNull()
    })
  })
})

describe('assetUrls', () => {
  const html = `<!doctype html><html><head>
    <link rel="icon" href="/favicon.svg">
    <link rel="manifest" href="/manifest.webmanifest">
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-def456.css">
  </head><body><div id="app"></div></body></html>`

  it('vindt script-src en link-href van de assets, absoluut gemaakt', () => {
    expect([...assetUrls(html, ROOT)].sort()).toEqual([
      ROOT + 'assets/index-abc123.js',
      ROOT + 'assets/index-def456.css',
    ])
  })

  it('vindt de assets ook als de base in het pad staat', () => {
    const metBase = `<script src="/dkj-maplestory-classic-mesowise/assets/index-1.js"></script>
      <link rel="stylesheet" href="/dkj-maplestory-classic-mesowise/assets/index-2.css">`
    expect([...assetUrls(metBase, SUBPAD)].sort()).toEqual([
      SUBPAD + 'assets/index-1.js',
      SUBPAD + 'assets/index-2.css',
    ])
  })

  it('leest ook een relatief pad en enkele aanhalingstekens', () => {
    const relatief = `<script src='assets/index-1.js'></script><link href="./assets/index-2.css">`
    expect([...assetUrls(relatief, ROOT)].sort()).toEqual([
      ROOT + 'assets/index-1.js',
      ROOT + 'assets/index-2.css',
    ])
  })

  it('negeert externe URLs, ook als die op assets/ eindigen', () => {
    const extern = `<script src="https://cdn.example/assets/lib.js"></script>
      <link rel="stylesheet" href="//fonts.example/assets/font.css">
      <script src="/assets/index-1.js"></script>`
    expect([...assetUrls(extern, ROOT)]).toEqual([ROOT + 'assets/index-1.js'])
  })

  it('negeert assets/ buiten de scope', () => {
    expect([...assetUrls('<script src="/assets/index-1.js"></script>', SUBPAD)]).toEqual([])
  })

  it('geeft niets terug voor lege HTML of HTML zonder assets', () => {
    expect([...assetUrls('', ROOT)]).toEqual([])
    expect([...assetUrls('<p>hallo</p>', ROOT)]).toEqual([])
  })

  it('geeft elke asset een keer, ook als de HTML hem twee keer noemt', () => {
    const dubbel = `<link rel="modulepreload" href="/assets/a.js"><script src="/assets/a.js"></script>`
    expect([...assetUrls(dubbel, ROOT)]).toEqual([ROOT + 'assets/a.js'])
  })
})
