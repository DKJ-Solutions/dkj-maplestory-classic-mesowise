// De bekende trainingsplekken: alleen de maps achter het levelplan voor lv 10–20, per plek
// opgehaald bij NiaMeowDB (meowdb.com), met per rij de pagina en de datum. Geen hele tabellen.
// De getallen zijn die van de tweede gesloten testfase (COT2, closed operations test 2) en
// kunnen bij de lancering nog veranderen.
// Prijzen: de NPC-winkel van Dr. Faymus in Kerning City (COT2-prijzen volgens de itempagina).
import type { SpotDraft } from '../spotDraft'
import type { KnownSpot, Monster, Potion } from './types'

const R = '2026-10-03'

/** Elk monster één keer, met zijn eigen pagina; de plekken hieronder verwijzen ernaar. */
const m = (name: string, level: number, hp: number, expPerKill: number, id: number): Monster => ({
  name,
  level,
  hp,
  expPerKill,
  source: { url: `https://meowdb.com/msclassic/monsters/${id}`, retrieved: R },
})

const MONSTERS = {
  snail: m('Snail', 1, 45, 2, 2),
  blueSnail: m('Blue Snail', 2, 51, 4, 3),
  redSnail: m('Red Snail', 4, 68, 8, 5),
  stump: m('Stump', 5, 133, 10, 6),
  slime: m('Slime', 6, 115, 12, 7),
  pig: m('Pig', 7, 128, 13, 8),
  orangeMushroom: m('Orange Mushroom', 8, 142, 15, 9),
  ribbonPig: m('Ribbon Pig', 10, 172, 19, 10),
  darkStump: m('Dark Stump', 11, 236, 21, 11),
  greenMushroom: m('Green Mushroom', 14, 233, 26, 13),
  bubbling: m('Bubbling', 15, 259, 28, 14),
  axeStump: m('Axe Stump', 17, 371, 32, 15),
  darkAxeStump: m('Dark Axe Stump', 23, 547, 43, 20),
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

/** De goedkope potions uit het levelplan, met de NPC-prijs. Nog niet op het scherm: #15 rekent ermee. */
export const POTIONS: readonly Potion[] = [
  { name: 'Orange Potion', price: 150, source: { url: 'https://meowdb.com/msclassic/item-db/271', retrieved: R } },
  { name: 'White Potion', price: 350, source: { url: 'https://meowdb.com/msclassic/item-db/272', retrieved: R } },
]

const byId = new Map(KNOWN_SPOTS.map((k) => [k.id, k]))

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
 * Wat er in een plek verandert als je een bekende plek kiest: de naam en de verwijzing.
 * Een lege of onbekende id maakt er weer een eigen plek van; de naam blijft dan staan.
 */
export function knownSpotPatch(id: string): Partial<SpotDraft> {
  const spot = findKnownSpot(id)
  return spot ? { known: spot.id, name: spot.name } : { known: undefined }
}
