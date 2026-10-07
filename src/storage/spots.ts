// Plekken bewaren in localStorage. Alles uit de opslag is onbetrouwbaar: bij het laden
// wordt elke rij gecontroleerd en wat ongeldig is valt weg. De Storage komt als parameter
// binnen (test-seam); null betekent "geen opslag beschikbaar".
import { MAX_KNOWN_LENGTH, MAX_NAME_LENGTH, MAX_SPOTS, MOB_KEYS, type SpotDraft } from '../spotDraft'

export const STORAGE_KEY = 'mesowise.spots.v1'
const VERSION = 1

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Mild: alleen een id en tekstvelden van het juiste type zijn nodig; getallen mogen nog fout zijn. Oude rijen met potions en ammo (tot #222) blijven geldig: die velden worden genegeerd. */
export function isDraftRow(v: unknown): v is SpotDraft {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    v.id !== '' &&
    typeof v.name === 'string' &&
    typeof v.expPerHour === 'string' &&
    typeof v.travel === 'string'
  )
}

/** De optionele velden van een bekende plek: alleen een niet-lege tekst blijft staan. */
const OPTIONAL = ['known', 'monster', 'kills', ...MOB_KEYS] as const

/**
 * Alleen de bekende velden overnemen, met een begrensde naam. Een optioneel veld dat geen niet-lege
 * tekst is, valt stil weg (zonder `known` wordt de plek dan een eigen plek).
 */
function clean(d: SpotDraft): SpotDraft {
  const row: SpotDraft = {
    id: d.id,
    name: d.name.slice(0, MAX_NAME_LENGTH),
    expPerHour: d.expPerHour,
    travel: d.travel,
  }
  for (const key of OPTIONAL) {
    const v: unknown = d[key]
    if (typeof v === 'string' && v !== '') row[key] = v.slice(0, MAX_KNOWN_LENGTH)
  }
  return row
}

/**
 * De bewaarde plekken (als invulvelden), of null als er niets bruikbaars staat (nog nooit bewaard,
 * kapotte JSON, onbekende versie, geblokkeerde opslag). Een bewust lege lijst komt terug als []
 * en blijft leeg. Rijen zonder id of met een verkeerd type vallen weg, dubbele id's ook (de eerste
 * wint), en er komen er hoogstens MAX_SPOTS. Een rij met een ongeldig getal blijft staan.
 */
export function loadSpots(storage: Storage | null | undefined): SpotDraft[] | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== VERSION || !Array.isArray(data.spots)) return null
    const seen = new Set<string>()
    const rows: SpotDraft[] = []
    for (const row of data.spots) {
      if (rows.length >= MAX_SPOTS) break
      if (!isDraftRow(row) || seen.has(row.id)) continue
      seen.add(row.id)
      rows.push(clean(row))
    }
    return rows
  } catch {
    return null
  }
}

/** Bewaar de plekken zoals ingevuld; true als het gelukt is. Mislukken breekt de app niet. */
export function saveSpots(storage: Storage | null | undefined, drafts: readonly SpotDraft[]): boolean {
  try {
    if (!storage) return false
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: VERSION, spots: drafts.slice(0, MAX_SPOTS).map(clean) }),
    )
    return true
  } catch {
    return false
  }
}

/** De opslag van de browser, of null als alleen al de toegang ertoe een fout geeft. */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
