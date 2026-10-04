// De bekende trainingsplekken: alleen de maps achter het levelplan voor lv 10–20, per plek
// opgehaald bij NiaMeowDB (meowdb.com), met per rij de pagina en de datum. Geen hele tabellen.
// De getallen zijn die van de tweede gesloten testfase (COT2, closed operations test 2) en
// kunnen bij de lancering nog veranderen.
// Prijzen: de NPC-winkel van Dr. Faymus in Kerning City (COT2-prijzen volgens de itempagina).
import type { SpotDraft } from '../spotDraft'
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

export const KNOWN_SPOTS: readonly KnownSpot[] = [
  {
    id: 'henesys-rain-forest-east',
    name: 'The Rain-Forest East of Henesys',
    source: { url: 'https://meowdb.com/msclassic/maps/010001070', retrieved: R },
    monsters: [MONSTERS.pig, MONSTERS.ribbonPig],
  },
  {
    id: 'kerning-subway-line-1-area-1',
    name: 'Line 1 <Area 1>',
    source: { url: 'https://meowdb.com/msclassic/maps/010003061', retrieved: R },
    monsters: [MONSTERS.bubbling],
  },
  {
    id: 'kerning-middle-forest-3',
    name: 'Kerning City Middle Forest III',
    source: { url: 'https://meowdb.com/msclassic/maps/010003052', retrieved: R },
    monsters: [MONSTERS.snail, MONSTERS.blueSnail, MONSTERS.redSnail, MONSTERS.slime, MONSTERS.pig, MONSTERS.orangeMushroom, MONSTERS.ribbonPig, MONSTERS.greenMushroom],
  },
  {
    id: 'perion-west-domain',
    name: 'West Domain of Perion',
    source: { url: 'https://meowdb.com/msclassic/maps/010004030', retrieved: R },
    monsters: [MONSTERS.snail, MONSTERS.blueSnail, MONSTERS.redSnail, MONSTERS.stump, MONSTERS.darkStump, MONSTERS.greenMushroom],
  },
  {
    id: 'perion-east-domain',
    name: 'East Domain of Perion',
    source: { url: 'https://meowdb.com/msclassic/maps/010004090', retrieved: R },
    monsters: [MONSTERS.snail, MONSTERS.blueSnail, MONSTERS.redSnail, MONSTERS.stump, MONSTERS.darkStump, MONSTERS.greenMushroom, MONSTERS.axeStump, MONSTERS.darkAxeStump],
  },
]

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

const byId = new Map([...KNOWN_SPOTS, ...MOB_SPOTS].map((k) => [k.id, k]))

/** Het laagste en hoogste level van de monsters op een plek. */
export function monsterLevels(spot: KnownSpot): { min: number; max: number } {
  const levels = spot.monsters.map((m) => m.level)
  return { min: Math.min(...levels), max: Math.max(...levels) }
}

/** De bekende plek met deze id, of undefined (leeg, onbekend of uit een oudere versie). */
export function findKnownSpot(id: string | undefined): KnownSpot | undefined {
  return id ? byId.get(id) : undefined
}

/**
 * Wat er in een plek verandert als je een bekende plek kiest: de naam en de verwijzing, en de velden
 * die de app dan zelf voorstelt worden leeg (leeg = het voorstel). Een lege of onbekende id maakt er
 * weer een eigen plek van; de naam en de ingevulde getallen blijven dan staan.
 */
export function knownSpotPatch(id: string): Partial<SpotDraft> {
  const spot = findKnownSpot(id)
  if (!spot) return { known: undefined, monster: undefined, kills: undefined }
  return { known: spot.id, name: spot.name, monster: undefined, kills: '', expPerHour: '', potions: '', ammo: '' }
}

/** De plek voor een mob: alleen dat monster, en de velden die de app zelf voorstelt leeg. Undefined bij een onbekende naam. */
export function mobDraft(name: string): SpotDraft | undefined {
  const spot = findKnownSpot(`mob:${name}`)
  if (!spot) return undefined
  return { id: spot.id, name: spot.name, known: spot.id, monster: name, kills: '', expPerHour: '', potions: '', ammo: '', travel: '0' }
}

/** De mob waarop je jaagt, uit een bewaarde plek; undefined als het geen mob is (een map of een eigen plek van vroeger). */
export function huntedMob(d: SpotDraft | undefined): Monster | undefined {
  const spot = d?.known?.startsWith('mob:') ? findKnownSpot(d.known) : undefined
  return spot?.monsters[0]
}
