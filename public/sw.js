// Service worker van Mesowise: de app werkt offline na de eerste keer laden en een nieuwe deploy
// komt vanzelf binnen. Bewust handgeschreven en zonder bibliotheek (bundelgrootte). Dit bestand
// staat in public/ en wordt dus niet door Vite gebundeld: het is een klassiek script zonder imports.
//
// Strategieën, per URL gekozen door kiesStrategie:
//   - navigaties (index.html): netwerk eerst, met terugval op de cache. Online komt een nieuwe
//     deploy direct binnen; offline werkt de laatst bekende versie.
//   - gehashte bestanden onder assets/: cache eerst. De hash in de naam maakt ze onveranderlijk.
//   - overige same-origin GET's (manifest, iconen): verouderd hergebruiken. Direct uit de cache,
//     en op de achtergrond vernieuwd.
//   - al het andere (andere origin, geen GET, buiten de scope, sw.js zelf): niet onderscheppen.
//
// Offline na de eerste keer laden: bij install haalt de worker zelf de index.html op, leest de
// asset-links eruit en zet die in de cache. Zo hangt het niet af van wat de pagina al had
// opgehaald vóór de worker actief was. Bij elke geslaagde navigatie gebeurt hetzelfde met de dan
// actuele HTML.
//
// Opruimen: bij elke nieuwe shell bewaart de worker zijn assetlijst (JSON-entry GENERATIES in de
// cache). Er blijven twee generaties staan: de huidige en de vorige, zodat een tabblad dat nog met
// de oude versie open staat zijn bestanden houdt. Pas een generatie later gaat weg, en dan alleen
// wat in die lijst stond en in geen van beide nieuwere voorkomt. Wat er niet in een lijst staat
// (later runtime gecachte lazy chunks) wordt dus nooit verwijderd.
//
// CACHE hoeft bij een deploy NIET te worden opgehoogd: de navigatie is netwerk eerst en haalt
// de nieuwe versie zelf binnen. Ophogen is alleen nodig als sw.js zelf verandert op een manier
// die de opbouw van de cache raakt; activate ruimt de oude cache dan op.

// Specifiek genoeg om geen cache van een andere app op hetzelfde domein aan te raken.
const CACHE_PREFIX = 'mesowise-dkj-maplestory-classic-mesowise-'
const CACHE = CACHE_PREFIX + 'v1'
const GENERATIES = '__generaties'
// Alleen van kracht als er een gecachte shell is om op terug te vallen.
const NETWERK_TIMEOUT_MS = 3000
// Naast de app-shell: kleine bestanden die de pagina nodig heeft, relatief aan de scope.
const OVERIGE_PRECACHE = ['manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png']

/**
 * Kiest de strategie voor een request. `req` is { method, mode, url }, `scope` de scope-URL
 * van de worker (eindigt op /). Geeft 'netwerk-eerst', 'cache-eerst', 'verouderd-hergebruiken'
 * of null (niet onderscheppen).
 */
function kiesStrategie(req, scope) {
  if (req.method !== 'GET') return null
  const url = new URL(req.url)
  const basis = new URL(scope)
  if (url.origin !== basis.origin || !url.pathname.startsWith(basis.pathname)) return null
  let pad
  try {
    pad = decodeURIComponent(url.pathname)
  } catch {
    return null // kapotte %-codering: niet aanraken
  }
  if (pad === basis.pathname + 'sw.js') return null
  if (req.mode === 'navigate') return 'netwerk-eerst'
  if (pad.startsWith(basis.pathname + 'assets/')) return 'cache-eerst'
  return 'verouderd-hergebruiken'
}

/** De absolute URL's van de gehashte assets die in een stuk HTML staan (src en href). */
function assetUrls(html, scope) {
  const urls = new Set()
  for (const [, ref] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(ref, scope).href
    if (kiesStrategie({ method: 'GET', mode: 'no-cors', url }, scope) === 'cache-eerst') urls.add(url)
  }
  return [...urls]
}

/** Is dit de start-URL of de index.html, als HTML? Alleen dat mag de shell vervangen. */
function isShell(url, res, scope) {
  const pad = new URL(url).pathname
  const basis = new URL(scope).pathname
  return (
    (pad === basis || pad === basis + 'index.html') &&
    (res.headers.get('content-type') || '').includes('text/html')
  )
}

/**
 * Bewaart de app-shell: eerst de assets die de HTML noemt, dan pas de HTML zelf, zodat de
 * gecachte pagina nooit naar een ontbrekend bestand verwijst. Daarna worden de generaties
 * doorgeschoven en vervalt wat in geen van de twee meer voorkomt.
 */
async function bewaarShell(cache, res) {
  const scope = self.registration.scope
  const assets = assetUrls(await res.clone().text(), scope)
  // Hashed namen: wat al in de cache staat verandert nooit, en de HTTP-cache is veilig, dus geen reload.
  await Promise.all(assets.map(async (url) => (await cache.match(url)) || cache.add(url)))
  await cache.put(scope, res)
  // Opruimen is bijzaak: een fout daarin mag de install of de navigatie niet laten falen.
  await schuifGeneraties(cache, assets, scope).catch(() => {})
}

async function schuifGeneraties(cache, assets, scope) {
  const sleutel = new Request(scope + GENERATIES)
  const bewaard = await cache.match(sleutel)
  const data = bewaard ? await bewaard.json().catch(() => null) : null
  // Een kapotte of verkeerd gevormde entry telt als leeg, zodat hij hieronder opnieuw wordt geschreven.
  const huidige = Array.isArray(data?.huidige) ? data.huidige : []
  const vorige = Array.isArray(data?.vorige) ? data.vorige : []
  if (assets.length === huidige.length && assets.every((url) => huidige.includes(url))) return
  const blijft = new Set([...assets, ...huidige])
  for (const url of vorige) if (!blijft.has(url)) await cache.delete(url)
  await cache.put(sleutel, new Response(JSON.stringify({ huidige: assets, vorige: huidige })))
}

async function precache() {
  const scope = self.registration.scope
  const cache = await caches.open(CACHE)
  const res = await fetch(scope, { cache: 'reload' })
  if (!res.ok) throw new Error('App-shell niet op te halen: ' + res.status)
  await bewaarShell(cache, res)
  // De rest is welkom maar niet noodzakelijk: een mislukte download laat de install niet falen.
  await Promise.allSettled(
    OVERIGE_PRECACHE.map((pad) => cache.add(new Request(new URL(pad, scope), { cache: 'reload' }))),
  )
}

/** Slaat een goede respons op zonder dat een quotafout de respons zelf in de weg zit. */
async function bewaar(cache, request, res) {
  if (res.status !== 200) return
  try {
    await cache.put(request, res.clone())
  } catch {
    // Cache vol of niet beschikbaar: de respons zelf is goed, dus die komt toch aan.
  }
}

async function netwerkEerst(event) {
  const scope = self.registration.scope
  const cache = await caches.open(CACHE)
  const bewaard = await cache.match(scope)
  // Zonder gecachte shell is er niets om op terug te vallen, dus dan gewoon op het netwerk wachten.
  const afbreker = bewaard ? new AbortController() : null
  const timer = afbreker ? setTimeout(() => afbreker.abort(), NETWERK_TIMEOUT_MS) : 0
  try {
    // no-cache: de browser controleert bij de server, ook als Pages de HTML een paar minuten
    // als vers meegeeft.
    const res = await fetch(event.request, { cache: 'no-cache', signal: afbreker?.signal })
    if (res.status >= 500 && bewaard) return bewaard
    if (res.ok && isShell(event.request.url, res, scope)) {
      event.waitUntil(bewaarShell(cache, res.clone()).catch(() => {}))
    }
    return res
  } catch (fout) {
    if (bewaard) return bewaard
    throw fout
  } finally {
    clearTimeout(timer)
  }
}

async function cacheEerst(event) {
  const cache = await caches.open(CACHE)
  const bewaard = await cache.match(event.request)
  if (bewaard) return bewaard
  const res = await fetch(event.request)
  event.waitUntil(bewaar(cache, event.request, res))
  return res
}

async function verouderdHergebruiken(event) {
  const cache = await caches.open(CACHE)
  const bewaard = await cache.match(event.request)
  const vers = fetch(event.request).then((res) => {
    event.waitUntil(bewaar(cache, event.request, res))
    return res
  })
  if (bewaard) {
    event.waitUntil(vers.catch(() => {}))
    return bewaard
  }
  return vers
}

self.addEventListener('install', (event) => {
  // skipWaiting: een nieuwe versie hoeft niet te wachten tot alle tabbladen dicht zijn.
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const naam of await caches.keys()) {
        if (naam.startsWith(CACHE_PREFIX) && naam !== CACHE) await caches.delete(naam)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const strategie = kiesStrategie(event.request, self.registration.scope)
  if (strategie === 'netwerk-eerst') event.respondWith(netwerkEerst(event))
  else if (strategie === 'cache-eerst') event.respondWith(cacheEerst(event))
  else if (strategie === 'verouderd-hergebruiken') event.respondWith(verouderdHergebruiken(event))
})
