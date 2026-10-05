// De wapens onder level 10 (Dave, 5 oktober 2026): wie nog Beginner is (level 1 tot 9) kan zo kiezen wat hij in de
// hand heeft. Het zijn de enige vijf wapens onder level 10, en geen ervan heeft een jobregel of een stat-eis, dus elke
// Beginner kan ze dragen. Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-05, per wapen de itempagina, twee keer
// gelezen (via een samenvatting van de pagina, met twee verschillende vragen; de waarden waren gelijk).
//
// Ze hebben wel een winkelprijs (Sid in Amherst, Silver in Lith Harbor), maar staan hier als items zonder prijs: het
// wapen-advies kijkt naar de wapens van je job vanaf level 10, en daar horen deze niet bij. Ze staan alleen in de
// zoekbalk van "Equip", zodat je kunt invullen wat je draagt. Staat de naam ook in een winkellijst, dan wint die regel.
//
// Voor welke job (een naam bij meer jobs moet hetzelfde item zijn, zie equipment.ts):
// - Thief en Bowman: alle vijf. Het getal is de W.ATK.
// - Warrior: Sword, Hand Axe en Wooden Club, met de multiplier van hun soort (MULT in warrior.ts). De daggers (Razor en
//   Fruit Knife) niet: zijn model rekent met STR als hoofdstat, en een dagger rekent met LUK (DAGGER hieronder).
// - Magician: geen. Voor hem telt de M.ATT van zijn wapen, en deze wapens hebben er geen.
//
// Wat de app ermee rekent (#171): onder level 10 slaat een Thief of Bowman als Beginner, met de gewone aanval van het wapen
// in zijn hand (beginnerAttack in calc/mobModel.ts): de multiplier van zijn soort, zonder skill, stars of pijlen. Een Warrior
// rekende al zo (meleeAttack zonder Power Strike).
//
// Niet opgenomen: Beginner's War Bow (664) en Beginner's Wooden Wand (649) zijn level 10, niet lager.
import { SPEED } from './attackSpeed'
import type { Source, WarriorWeaponKind, WornClaw } from './types'
import { effectiveMultiplier, MULT } from './warrior'

const R = '2026-10-05'
const src = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })

/** Een wapen onder level 10: zoals een claw zonder prijs, met zijn soort; een dagger heeft hier geen Warrior-soort. */
export interface BeginnerWeapon extends WornClaw {
  kind: WarriorWeaponKind | 'dagger'
}

/** De vijf wapens onder level 10, van laag naar hoog level. Geen level-eis op de pagina staat als level 0. */
export const BEGINNER_WEAPONS: readonly BeginnerWeapon[] = [
  { name: 'Sword', kind: '1h-sword', level: 0, watk: 17, speed: SPEED.fast4, source: src(541) },
  { name: 'Hand Axe', kind: '1h-axe', level: 0, watk: 17, speed: SPEED.fast4, source: src(576) },
  { name: 'Wooden Club', kind: '1h-blunt', level: 0, watk: 19, speed: SPEED.fast5, source: src(585) },
  { name: 'Razor', kind: 'dagger', level: 5, watk: 23, speed: SPEED.fast4, source: src(558) },
  { name: 'Fruit Knife', kind: 'dagger', level: 8, watk: 23, speed: SPEED.faster3, source: src(559) },
]

/**
 * De dagger in de damage-gids (guides/explaining-the-damage-formula, gecontroleerd op de pagina zelf op 2026-10-05): de
 * multipliers "Dagger 1.0 2.0" (zwaai, steek), en de stats per wapenfamilie "Dagger, Claw: LUK, STR + DEX", met de formule
 * "(LUK × W + STR + DEX) / 100". De gids geeft de stats per wapen, niet per job; dat ze ook voor een Beginner gelden, is
 * daaruit afgeleid. De verwachte multiplier (60% zwaai, 40% steek) is 1,4; de gids noemt zelf "1.40 for Dagger".
 */
export const DAGGER = {
  mult: { swing: 1.0, stab: 2.0 },
  source: { url: 'https://meowdb.com/msclassic/guides/explaining-the-damage-formula', retrieved: R } satisfies Source,
} as const

const isWarriorKind = (k: BeginnerWeapon['kind']): k is WarriorWeaponKind => k !== 'dagger'

/** Of dit de naam van een dagger onder level 10 is: dan rekent de Beginner-aanval met LUK als hoofdstat. */
export const isBeginnerDagger = (name: string): boolean => BEGINNER_WEAPONS.some((w) => w.kind === 'dagger' && w.name === name)

/**
 * De wapens onder level 10 als items zonder prijs, met de verwachte multiplier (60% zwaai, 40% steek) van hun soort.
 * Thief, Warrior en Bowman lezen dezelfde objecten, zodat een naam bij elke job hetzelfde item is.
 */
export const BEGINNER_WORN_WEAPONS: readonly (WornClaw & { mult: number })[] = BEGINNER_WEAPONS.map(({ kind, ...w }) => ({
  ...w,
  mult: effectiveMultiplier(isWarriorKind(kind) ? MULT[kind] : DAGGER.mult),
}))

/** Wat een Warrior ervan kan gebruiken: geen dagger (zie de kop van dit bestand). */
export const BEGINNER_WORN_WARRIOR_WEAPONS = BEGINNER_WORN_WEAPONS.filter((w) => !isBeginnerDagger(w.name))
