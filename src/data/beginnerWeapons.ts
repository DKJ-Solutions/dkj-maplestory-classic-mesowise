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
//   Fruit Knife) niet: de app kent de weapon multiplier van een dagger niet.
// - Magician: geen. Voor hem telt de M.ATT van zijn wapen, en deze wapens hebben er geen.
//
// Wat de app ermee rekent: het wapen zet je weapon attack en tijd per aanval, maar het model blijft dat van je job (een
// Thief met Lucky Seven, een Bowman met zijn boog). Een Beginner-aanval kent de app niet (#45: de Beginner is geen job in
// de app), dus onder level 10 is het getal een benadering, zie #171.
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

const isWarriorKind = (k: BeginnerWeapon['kind']): k is WarriorWeaponKind => k !== 'dagger'

/**
 * De wapens onder level 10 als items zonder prijs, met de verwachte multiplier (60% zwaai, 40% steek) voor wie er een heeft.
 * Thief, Warrior en Bowman lezen dezelfde objecten, zodat een naam bij elke job hetzelfde item is.
 */
export const BEGINNER_WORN_WEAPONS: readonly (WornClaw & { mult?: number })[] = BEGINNER_WEAPONS.map(({ kind, ...w }) =>
  isWarriorKind(kind) ? { ...w, mult: effectiveMultiplier(MULT[kind]) } : w,
)

/** Wat een Warrior ervan kan gebruiken: alleen wat een multiplier heeft (geen dagger). */
export const BEGINNER_WORN_WARRIOR_WEAPONS = BEGINNER_WORN_WEAPONS.filter((w): w is WornClaw & { mult: number } => w.mult !== undefined)
