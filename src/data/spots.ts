// De mobs om op te jagen: alleen de monsters achter het levelplan voor lv 10–20, per monster
// opgehaald bij NiaMeowDB (meowdb.com), met per rij de pagina en de datum. Geen hele tabellen.
// Maps staan er niet meer in (#123): de app rekent sinds 4 oktober 2026 alleen met de mob waarop je jaagt.
// De getallen zijn die van de tweede gesloten testfase (COT2, closed operations test 2) en
// kunnen bij de lancering nog veranderen.
// Prijzen: de NPC-winkel van Dr. Faymus in Kerning City (COT2-prijzen volgens de itempagina).
import type { MobKey, SpotDraft } from '../spotDraft'
import type { KnownSpot, Monster, Potion } from './types'

const R = '2026-10-03'

/** Elk monster één keer, met zijn eigen pagina; de plekken hieronder verwijzen ernaar. */
// Volgorde: naam, level, HP, EXP, WDEF (P.DEF), avoid, accuracy, touch laag, touch hoog, MeowDB-id.
const m = (
  name: string,
  level: number,
  hp: number,
  expPerKill: number,
  wdef: number,
  avoid: number,
  accuracy: number,
  touchMin: number,
  touchMax: number,
  id: number,
): Monster => ({
  name,
  level,
  hp,
  expPerKill,
  wdef,
  avoid,
  accuracy,
  touch: { min: touchMin, max: touchMax },
  source: { url: `https://meowdb.com/msclassic/monsters/${id}`, retrieved: R },
})

const MONSTERS = {
  snail: m('Snail', 1, 45, 2, 0, 0, 33, 3, 4, 2),
  blueSnail: m('Blue Snail', 2, 51, 4, 0, 0, 39, 5, 7, 3),
  redSnail: m('Red Snail', 4, 68, 8, 0, 0, 45, 9, 13, 5),
  stump: m('Stump', 5, 133, 10, 30, 0, 45, 12, 16, 6),
  slime: m('Slime', 6, 115, 12, 10, 0, 53, 14, 19, 7),
  pig: m('Pig', 7, 128, 13, 0, 0, 54, 16, 22, 8),
  orangeMushroom: m('Orange Mushroom', 8, 142, 15, 0, 0, 62, 18, 25, 9),
  ribbonPig: m('Ribbon Pig', 10, 172, 19, 0, 6, 64, 29, 40, 10),
  darkStump: m('Dark Stump', 11, 236, 21, 30, 5, 61, 37, 51, 11),
  greenMushroom: m('Green Mushroom', 14, 233, 26, 0, 8, 79, 59, 81, 13),
  bubbling: m('Bubbling', 15, 259, 28, 20, 9, 81, 67, 91, 14),
  axeStump: m('Axe Stump', 17, 371, 32, 30, 8, 72, 82, 112, 15),
  darkAxeStump: m('Dark Axe Stump', 23, 547, 43, 30, 11, 87, 128, 175, 20),
}

/** De goedkope potions uit het levelplan (HP) en de Blue Potion (MP), met de NPC-prijs in Kerning. */
export const POTIONS: readonly Potion[] = [
  { name: 'Orange Potion', hp: 250, mp: 0, price: 150, source: { url: 'https://meowdb.com/msclassic/item-db/271', retrieved: R } },
  { name: 'White Potion', hp: 500, mp: 0, price: 350, source: { url: 'https://meowdb.com/msclassic/item-db/272', retrieved: R } },
  { name: 'Blue Potion', hp: 0, mp: 200, price: 220, source: { url: 'https://meowdb.com/msclassic/item-db/273', retrieved: R } },
]

/** De mobs om uit te kiezen, van laag naar hoog level. */
export const MOBS: readonly Monster[] = Object.values(MONSTERS)

/**
 * Eén mob als plek met alleen dat monster (Dave, 4 oktober 2026): de app rekent met de mob waarop je het meest jaagt,
 * niet meer met maps. De bron is de pagina van het monster.
 */
const MOB_SPOTS: readonly KnownSpot[] = MOBS.map((m) => ({ id: `mob:${m.name}`, name: m.name, source: m.source, monsters: [m] }))

const byId = new Map(MOB_SPOTS.map((k) => [k.id, k]))

/** De bekende plek met deze id, of undefined (leeg, onbekend of uit een oudere versie). */
export function findKnownSpot(id: string | undefined): KnownSpot | undefined {
  return id ? byId.get(id) : undefined
}

/** De plek voor een mob: alleen dat monster, en de velden die de app zelf voorstelt leeg. Undefined bij een onbekende naam. */
export function mobDraft(name: string): SpotDraft | undefined {
  const spot = findKnownSpot(`mob:${name}`)
  if (!spot) return undefined
  return { id: spot.id, name: spot.name, known: spot.id, monster: name, kills: '', expPerHour: '', travel: '0' }
}

/** De mob waarop je jaagt, uit een bewaarde plek; undefined als het geen mob is (een map of een eigen plek van vroeger). */
export function huntedMob(d: SpotDraft | undefined): Monster | undefined {
  const spot = d?.known?.startsWith('mob:') ? findKnownSpot(d.known) : undefined
  return spot?.monsters[0]
}

/** Een eigenschap van een mob die je zelf kunt corrigeren: het veld in de plek, de naam op het scherm en de grenzen. */
export interface MobField {
  key: MobKey
  label: string
  min: number
  max: number
  get: (m: Monster) => number
  set: (m: Monster, n: number) => Monster
}

/**
 * Wat je van een mob kunt aanpassen als het spel iets anders zegt dan de database (Dave, 4 oktober 2026): dezelfde
 * eigenschappen als de app toont. Hele getallen; HP minstens 1, want een mob zonder HP valt niet te verslaan.
 */
export const MOB_FIELDS: readonly MobField[] = [
  { key: 'mobHp', label: 'HP', min: 1, max: 9_999_999, get: (m) => m.hp, set: (m, hp) => ({ ...m, hp }) },
  { key: 'mobExp', label: 'EXP', min: 0, max: 9_999_999, get: (m) => m.expPerKill, set: (m, expPerKill) => ({ ...m, expPerKill }) },
  { key: 'mobTouchMin', label: 'Dmg laag', min: 0, max: 99_999, get: (m) => m.touch.min, set: (m, min) => ({ ...m, touch: { ...m.touch, min } }) },
  { key: 'mobTouchMax', label: 'Dmg hoog', min: 0, max: 99_999, get: (m) => m.touch.max, set: (m, max) => ({ ...m, touch: { ...m.touch, max } }) },
  { key: 'mobWdef', label: 'WDEF', min: 0, max: 9_999, get: (m) => m.wdef, set: (m, wdef) => ({ ...m, wdef }) },
]

/** Een eigen getal voor een eigenschap: een heel getal binnen de grenzen, anders undefined (en dan telt de database). */
export function parseMobStat(f: MobField, text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined
  const n = Number(text)
  return Number.isInteger(n) && n >= f.min && n <= f.max ? n : undefined
}

/** De mob zoals jij hem kent: de database, met je eigen getallen erover. */
export function correctedMob(m: Monster, d: SpotDraft): Monster {
  return MOB_FIELDS.reduce((out, f) => {
    const n = parseMobStat(f, d[f.key])
    return n === undefined ? out : f.set(out, n)
  }, m)
}

/** De bekende plek van een plek, met bij een mob je eigen getallen; zo rekent de app met wat jij in het spel ziet. */
export function spotOf(d: SpotDraft): KnownSpot | undefined {
  const spot = findKnownSpot(d.known)
  const mob = huntedMob(d)
  if (!spot || !mob) return spot
  const own = correctedMob(mob, d)
  return own === mob ? spot : { ...spot, monsters: [own] }
}

/**
 * Wat een correctie in de plek verandert: je getal als het afwijkt van de database, niets meer als het gelijk is of
 * leeg (dan telt de database weer). Null als het geen geldig getal is of de plek geen mob is: dan verandert er niets.
 */
export function mobStatPatch(d: SpotDraft, f: MobField, text: string): Partial<SpotDraft> | null {
  const mob = huntedMob(d)
  if (!mob) return null
  if (text.trim() === '') return { [f.key]: undefined }
  const n = parseMobStat(f, text)
  if (n === undefined) return null
  return { [f.key]: n === f.get(mob) ? undefined : String(n) }
}
