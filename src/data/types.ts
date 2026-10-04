// De vorm van de spelgegevens. Elk feit draagt zijn bron: de pagina waar het staat en de dag
// waarop het is opgehaald. Alleen de plekken die echt gebruikt worden, nooit een hele tabel
// (zie .claude/rules/this-repo.md).

/** Waar een feit vandaan komt: een MeowDB-pagina en de datum (JJJJ-MM-DD) van ophalen. */
export interface Source {
  url: string
  retrieved: string
}

/**
 * Een monster op een plek, met wat je nodig hebt om EXP per uur te schatten. WDEF is "P.DEF" op
 * MeowDB; een streep daar (geen waarde) staat hier als 0, net als bij avoid.
 */
export interface Monster {
  name: string
  level: number
  hp: number
  expPerKill: number
  wdef: number
  avoid: number
  accuracy: number
  /** De schade als het monster je aanraakt ("Touch DMG"), van laag tot hoog. */
  touch: { min: number; max: number }
  source: Source
}

/** Een potion uit een NPC-winkel: hoeveel HP en MP hij herstelt en de winkelprijs in meso. */
export interface Potion {
  name: string
  hp: number
  mp: number
  price: number
  source: Source
}

/** Lucky Seven per skill-level: de MP per aanval en de schade in procent. */
export interface SkillLevel {
  level: number
  mp: number
  damagePct: number
}

/** Throwing stars: de weapon attack en wat het herladen per ster kost. */
export interface ThrowingStar {
  name: string
  watk: number
  rechargePerStar: number
  source: Source
}

/** Een bekende trainingsplek: een map (naam en pagina) en zijn monsters. */
export interface KnownSpot {
  id: string
  name: string
  source: Source
  monsters: readonly Monster[]
}

/** Het deel van je lichaam waar een stuk armor hoort. Handschoenen, overalls en schilden zitten er niet in. */
export type ArmorSlot = 'hat' | 'top' | 'bottom' | 'shoes'

/** Een stuk armor uit een NPC-winkel: wat hij vraagt (level, LUK, DEX), wat hij aan WDEF geeft en wat hij kost. */
export interface Armor {
  name: string
  slot: ArmorSlot
  /** Het level dat je nodig hebt om hem te dragen. */
  level: number
  wdef: number
  luk: number
  dex: number
  price: number
  source: Source
}

/** De soort Warrior-wapen; de soort bepaalt de multipliers voor zwaaien en steken. */
export type WarriorWeaponKind =
  | '1h-sword'
  | '2h-sword'
  | '1h-axe'
  | '2h-axe'
  | '1h-blunt'
  | '2h-blunt'
  | 'spear'
  | 'polearm'

/**
 * Een wapen uit een NPC-winkel dat een Warrior kan dragen: wat het vraagt (level, STR, DEX), wat het geeft
 * en wat het kost. Een eis die de pagina niet noemt staat als 0.
 */
export interface WarriorWeapon {
  name: string
  kind: WarriorWeaponKind
  /** Het level dat je nodig hebt om het te dragen. */
  level: number
  watk: number
  str: number
  dex: number
  /**
   * De aanvalssnelheid zoals het spel hem noemt en de "Attack cycle" van de pagina, zonder Booster.
   * Zwaard, bijl en stomp hebben een cyclus voor alles (`attackMs`). Spear en polearm hebben er twee:
   * `attackMs` is dan de cyclus van de zwaai (Swing) en `stabMs` die van de steek (Stab).
   */
  speed: { label: string; attackMs: number; stabMs?: number }
  /** De weapon multipliers van de basisaanval (zwaaien en steken). */
  mult: { swing: number; stab: number }
  price: number
  source: Source
}

/** Een stuk Warrior-armor uit een NPC-winkel: wat het vraagt (level, STR, DEX), wat het aan WDEF geeft en wat het kost. */
export interface WarriorArmor {
  name: string
  slot: ArmorSlot
  /** Het level dat je nodig hebt om het te dragen. */
  level: number
  wdef: number
  str: number
  dex: number
  price: number
  source: Source
}

/** Slash Blast per skill-level: zoals Lucky Seven (MP en schade in procent), plus de HP die elke aanval kost. */
export interface SlashBlastLevel extends SkillLevel {
  hp: number
}

/** Iron Body per skill-level: de extra Weapon Defense in procent, wat de buff aan MP kost en hoe lang hij duurt. */
export interface IronBodyLevel {
  level: number
  wdefPct: number
  mp: number
  seconds: number
}

/** Precise Strikes per skill-level: de extra accuracy en de extra kans op een critical hit, in procent. */
export interface PreciseStrikesLevel {
  level: number
  accuracy: number
  critPct: number
}

/** Een claw uit een NPC-winkel: wat hij vraagt (level, LUK, DEX), wat hij geeft en wat hij kost. */
export interface Claw {
  name: string
  /** Het level dat je nodig hebt om hem te dragen. */
  level: number
  watk: number
  /** De aanvalssnelheid zoals het spel hem noemt, en de tijd per aanval met Lucky Seven. */
  speed: { label: string; attackMs: number }
  luk: number
  dex: number
  price: number
  source: Source
}
