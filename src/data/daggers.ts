// De daggers die een NPC aan een Thief verkoopt, level 10 tot en met 30 (issue #170): wie met een dagger speelt, kiest hieruit en
// het wapen-advies vergelijkt ze. Opgehaald bij NiaMeowDB (meowdb.com) op de datum hieronder, per dagger de itempagina (eisen,
// W.ATK, snelheid en prijs), en de winkel van Cutthroat Manny (npcs/408, Kerning City) voor de prijzen; de Cass verkoopt Manny niet,
// wel River (Perion) en Neri the Fairy (Orbis), voor dezelfde 22.000 meso.
// Daggers met "Warrior/Thief" als job staan alleen hier, niet bij de Warrior: zijn model rekent met STR als hoofdstat, en een
// dagger rekent met LUK (zie data/beginnerWeapons.ts).
// Niet opgenomen: Beginner's Triangular Zamadar (561, geen NPC-prijs), en de daggers boven level 30.
import { SPEED } from './attackSpeed'
import { DAGGER } from './beginnerWeapons'
import type { Source, Weapon } from './types'
import { effectiveMultiplier } from './warrior'

const R = '2026-10-06'
const src = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })

/** De winkel van Cutthroat Manny in Kerning City, die acht van de negen daggers hieronder verkoopt. */
export const DAGGER_SHOP_SOURCE: Source = { url: 'https://meowdb.com/msclassic/npcs/408', retrieved: R }

/** De verwachte multiplier van de gewone aanval met een dagger (60% zwaai, 40% steek): 1,4. */
const MULT = effectiveMultiplier(DAGGER.mult)

const { fast4: FAST4, faster3: FASTER3 } = SPEED

/** De NPC-daggers voor een Thief, van laag naar hoog level. Een eis die de pagina niet noemt, staat er niet. */
export const NPC_DAGGERS: readonly Weapon[] = [
  { name: 'Triangular Zamadar', level: 10, watk: 28, speed: FAST4, mult: MULT, luk: 20, price: 3_000, source: src(560) },
  { name: 'Field Dagger', level: 15, watk: 30, speed: FASTER3, mult: MULT, dex: 10, luk: 20, price: 5_000, source: src(562) },
  { name: 'Triple-Tipped Zamadar', level: 17, watk: 35, speed: FAST4, mult: MULT, dex: 11, luk: 31, price: 5_800, source: src(563) },
  { name: 'Coconut Knife', level: 20, watk: 35, speed: FASTER3, mult: MULT, dex: 15, luk: 30, price: 10_500, source: src(564) },
  { name: 'Stinger', level: 22, watk: 40, speed: FAST4, mult: MULT, str: 17, luk: 44, price: 11_700, source: src(565) },
  { name: 'Iron Dagger', level: 25, watk: 40, speed: FASTER3, mult: MULT, str: 20, luk: 40, price: 13_500, source: src(566) },
  { name: 'Forked Dagger', level: 27, watk: 45, speed: FAST4, mult: MULT, dex: 22, luk: 54, price: 14_700, source: src(567) },
  { name: 'Cass', level: 30, watk: 45, speed: FASTER3, mult: MULT, str: 25, luk: 60, price: 22_000, source: src(568) },
  { name: 'Reef Claw', level: 30, watk: 48, speed: FAST4, mult: MULT, dex: 25, luk: 60, price: 22_000, source: src(569) },
]

/** Of dit de naam van een NPC-dagger is: dan slaat een Thief met de dagger (Double Stab) in plaats van met stars te gooien. */
export const isNpcDagger = (name: string): boolean => NPC_DAGGERS.some((d) => d.name === name)
