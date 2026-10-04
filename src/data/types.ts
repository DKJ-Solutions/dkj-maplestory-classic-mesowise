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

/** Throwing stars: de weapon attack, wat het herladen per star kost en het level dat ze vragen. */
export interface ThrowingStar {
  name: string
  watk: number
  rechargePerStar: number
  level: number
  source: Source
}

/** Een bekende trainingsplek: een map (naam en pagina) en zijn monsters. */
export interface KnownSpot {
  id: string
  name: string
  source: Source
  monsters: readonly Monster[]
}

/**
 * Het deel van je lichaam waar een stuk armor hoort. Een overall (issue #50) is één stuk voor top en bottom
 * samen: wie er een draagt, heeft in top en bottom niets. Handschoenen en schilden zitten er niet in.
 */
export type ArmorSlot = 'hat' | 'top' | 'bottom' | 'overall' | 'shoes'

/** Wat elk ding uit een NPC-winkel heeft: een naam, het level om het te dragen, de prijs in meso en de bron. */
export interface ShopItem {
  name: string
  /** Het level dat je nodig hebt om het te dragen. */
  level: number
  price: number
  source: Source
}

/** De stat-eisen van een item: `Requires<'luk' | 'dex'>` is { luk: number; dex: number }. Een eis die de pagina niet noemt staat als 0. */
export type Requires<Stat extends 'str' | 'dex' | 'int' | 'luk'> = Record<Stat, number>

/** Een stuk armor uit een NPC-winkel zonder de stat-eisen (slot en WDEF); die komen per klas erbij. */
export interface ShopArmor extends ShopItem {
  slot: ArmorSlot
  wdef: number
}

/** Een stuk Thief-armor: wat hij vraagt (level, LUK, DEX), wat hij aan WDEF geeft en wat hij kost. */
export interface Armor extends ShopArmor, Requires<'luk' | 'dex'> {}

/** Een stuk armor dat je kunt dragen maar niet in een winkel koopt: geen eisen of prijs, alleen wat de app nodig heeft om je WDEF te kennen. */
export type WornArmor = Pick<Armor, 'name' | 'slot' | 'level' | 'wdef' | 'source'>

/** Een claw die je kunt dragen maar niet in een winkel koopt: wat hij geeft en hoe snel hij slaat, zonder prijs. */
export type WornClaw = Pick<Claw, 'name' | 'level' | 'watk' | 'speed' | 'source'>

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
export interface WarriorWeapon extends ShopItem, Requires<'str' | 'dex'> {
  kind: WarriorWeaponKind
  watk: number
  /**
   * De aanvalssnelheid zoals het spel hem noemt en de "Attack cycle" van de pagina, zonder Booster.
   * Zwaard, bijl en stomp hebben een cyclus voor alles (`attackMs`). Spear en polearm hebben er twee:
   * `attackMs` is dan de cyclus van de zwaai (Swing) en `stabMs` die van de steek (Stab).
   */
  speed: { label: string; attackMs: number; stabMs?: number }
  /** De weapon multipliers van de basisaanval (zwaaien en steken). */
  mult: { swing: number; stab: number }
}

/** Een stuk Warrior-armor uit een NPC-winkel: wat het vraagt (level, STR, DEX), wat het aan WDEF geeft en wat het kost. */
export interface WarriorArmor extends ShopArmor, Requires<'str' | 'dex'> {}

/** De soort Magician-wapen. */
export type MagicianWeaponKind = 'wand' | 'staff'

/**
 * Een wand of staff uit een NPC-winkel: wat hij vraagt (level, INT, LUK), wat hij geeft (weapon attack en
 * magic attack) en wat hij kost. Een eis die de pagina niet noemt staat als 0. Spreuken gebruiken `matk`, niet `watk`.
 */
export interface MagicianWeapon extends ShopItem, Requires<'int' | 'luk'> {
  kind: MagicianWeaponKind
  watk: number
  matk: number
  /** De aanvalssnelheid zoals de itempagina hem geeft: het label en de "Attack cycle" in ms. */
  speed: { label: string; attackMs: number }
}

/** Een stuk Magician-armor uit een NPC-winkel: wat het vraagt (level, INT, LUK), wat het aan WDEF en MDEF geeft en wat het kost. */
export interface MagicianArmor extends ShopArmor, Requires<'int' | 'luk'> {
  mdef: number
}

/** De soort Bowman-wapen: een boog of een kruisboog (de pijlen verschillen per soort). */
export type BowmanWeaponKind = 'bow' | 'crossbow'

/**
 * Een boog of kruisboog uit een NPC-winkel: wat hij vraagt (level, DEX, STR), wat hij geeft en wat hij kost.
 * Een eis die de pagina niet noemt staat als 0. De snelheid is het label en de "Attack cycle" van de itempagina.
 */
export interface BowmanWeapon extends ShopItem, Requires<'dex' | 'str'> {
  kind: BowmanWeaponKind
  watk: number
  speed: { label: string; attackMs: number }
}

/** Een stuk Bowman-armor uit een NPC-winkel: wat het vraagt (level, DEX, STR), wat het aan WDEF geeft en wat het kost. Geen MDEF: de pagina's tonen er geen. */
export interface BowmanArmor extends ShopArmor, Requires<'dex' | 'str'> {}

/** Pijlen: de weapon attack die ze bijdragen en wat ze per pijl kosten. Pijlen worden gekocht, niet herladen (anders dan ThrowingStar). */
export interface Arrow {
  name: string
  watk: number
  pricePerArrow: number
  /** Voor welke soort wapen: pijlen voor bogen of voor kruisbogen. */
  for: BowmanWeaponKind
  source: Source
}

/** Focus per skill-level: de extra accuracy en evasion, wat de buff aan MP kost en hoe lang hij duurt. */
export interface FocusLevel {
  level: number
  accuracy: number
  evasion: number
  mp: number
  seconds: number
}

/** Een spreuk per skill-level (Energy Bolt, Magic Claw): zoals Lucky Seven, plus de spell mastery in procent-stappen van de pagina. */
export interface SpellLevel extends SkillLevel {
  mastery: number
}

/** Magic Armor per skill-level: de vaste extra WDEF en MDEF (hetzelfde getal), wat de buff aan MP kost en hoe lang hij duurt. */
export interface MagicArmorLevel {
  level: number
  def: number
  mp: number
  seconds: number
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
export interface Claw extends ShopItem, Requires<'luk' | 'dex'> {
  watk: number
  /** De aanvalssnelheid zoals het spel hem noemt, en de tijd per aanval met Lucky Seven. */
  speed: { label: string; attackMs: number }
}
