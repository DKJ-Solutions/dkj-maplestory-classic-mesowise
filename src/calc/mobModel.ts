// Het mob-model: hoeveel kills per uur een Thief (claw met Lucky Seven) of een Warrior (melee-wapen met
// Power Strike) haalt op een monster, en wat hij daarbij per kill verbruikt. Puur, zonder UI-import.
// Overgenomen uit het mob-advies-model in Daves kennisbank (issue #15) en per stap voorzien van een bron of een benoemde aanname.
//
// Een voorstel uit dit model is een SCHATTING. De formules komen uit de community voor het oude GMS
// (vóór de Big Bang) en zijn niet in MapleStory Classic World zelf nagemeten.

/** Het karakter, zoals de speler het invult. */
export interface Character {
  level: number
  /** Max HP: een monster is "gevaarlijk" als één tik er een groot deel van kost. */
  hp: number
  str: number
  dex: number
  luk: number
  /** Weapon attack van de claw plus die van de stars. */
  watk: number
  accuracy: number
  avoid: number
  wdef: number
  /** Milliseconden per aanval. */
  attackMs: number
}

/** Een skill-level: MP per aanval en schade in procent. */
export interface SkillStats {
  mp: number
  damagePct: number
}

/** Een aanval van het karakter, los van het monster. */
export interface Attack {
  min: number
  max: number
  /** Het aantal klappen per aanval: stars bij een claw, 1 bij een melee-wapen. */
  stars: number
  mpPerAttack: number
}

/** Wat het model van een monster nodig heeft. */
export interface MobStats {
  level: number
  hp: number
  wdef: number
  avoid: number
  accuracy: number
  touch: { min: number; max: number }
}

/**
 * AANNAMES ZONDER BRON. Ze bepalen het voorstel sterk, maar niemand heeft ze voor Classic World
 * gemeten. Pas ze aan zodra er een meting of bron is.
 */
export const ASSUMPTIONS = {
  /** Het deel van de tijd dat je echt aanvalt, in plaats van lopen of wachten op respawn (0 tot 1). */
  timeEfficiency: 0.6,
  /**
   * Hoe vaak een monster je gemiddeld aanraakt per kill; met een claw meestal minder dan 1. Een Warrior vecht van
   * dichtbij en wordt waarschijnlijk vaker geraakt, maar daar is geen bron voor: hij rekent met dezelfde waarde.
   */
  contactsPerKill: 0.3,
} as const

export type Assumptions = { timeEfficiency: number; contactsPerKill: number }

/**
 * Een monster is "gevaarlijk" als één tik dit deel van je max HP of meer kost. Zo'n plek krijgt het
 * label "Beste" niet (Dave, 3 oktober 2026, issue #21).
 */
export const DANGER_SHARE = 0.25

/** De mastery van een gewone aanval op mastery-level 0: (0/10 + 0.1) × 0.8 (de damage-gids; de Warrior heeft in de 1e job geen mastery-skill). */
const BASE_MASTERY = 0.08

/** De gewone claw-aanval zonder Lucky Seven: 1 ster, multiplier 2.5, basis-mastery. */
const PLAIN_CLAW = { stars: 1, weaponMult: 2.5, mastery: BASE_MASTERY } as const

/**
 * Stap 1: de schade van één ster, van min tot max. Bron: de damage-formule van MeowDB
 * (guides/explaining-the-damage-formula), met LUK als hoofdstat en STR + DEX als secundaire stat:
 * max = K·watk·(1 + (LUK·W + STR + DEX)/100), min = K·watk·(0.8 + (LUK·M·W + STR + DEX)/100).
 * Met Lucky Seven (`skill` gegeven): K = schade%/100, W = 3.0, M = 0.5 en 2 stars; dat staat op de
 * skillpagina. Zonder: de gewone claw-aanval.
 */
export function characterAttack(
  c: Pick<Character, 'str' | 'dex' | 'luk' | 'watk'>,
  skill: SkillStats | null,
  luckySeven: { stars: number; weaponMult: number; mastery: number },
): Attack {
  const { stars, weaponMult, mastery } = skill ? luckySeven : PLAIN_CLAW
  return { ...damageRange(skill, c.watk, c.luk, c.str + c.dex, weaponMult, mastery), stars, mpPerAttack: skill ? skill.mp : 0 }
}

/** De min en max van de damage-formule (stap 1), voor een hoofdstat, een secundaire stat en een skill (null = de gewone aanval, K = 1). */
function damageRange(skill: SkillStats | null, watk: number, primary: number, secondary: number, weaponMult: number, mastery: number) {
  const k = skill ? skill.damagePct / 100 : 1
  return {
    max: k * watk * (1 + (primary * weaponMult + secondary) / 100),
    min: k * watk * (0.8 + (primary * mastery * weaponMult + secondary) / 100),
  }
}

/**
 * De aanval van een Warrior met een melee-wapen: dezelfde formule als hierboven, met STR als hoofdstat en
 * DEX als secundaire stat (de damage-gids, "Sword, Axe, Blunt, Spear, Polearm"). `weaponMult` is de
 * verwachte multiplier van het wapen (0,6 × zwaai + 0,4 × steek, zie data/warrior.ts); min en max zijn lineair
 * in de multiplier, dus het gemiddelde van de twee acties geeft precies de gemiddelde schade. `skill` is Power
 * Strike op het gezette level, of null voor de gewone aanval. Eén klap per aanval, en geen munitie.
 */
export function meleeAttack(c: Pick<Character, 'str' | 'dex' | 'watk'>, weaponMult: number, skill: SkillStats | null): Attack {
  return { ...damageRange(skill, c.watk, c.str, c.dex, weaponMult, BASE_MASTERY), stars: 1, mpPerAttack: skill ? skill.mp : 0 }
}

/**
 * Stap 3 (AANNAME, de "Spadow"-formule voor het oude GMS, geen bron voor Classic): de kans dat een
 * aanval raakt, met `levelDiff` = hoeveel levels de verdediger boven de aanvaller staat (≥ 0).
 * Zonder avoid raakt alles.
 */
export function hitChance(accuracy: number, avoid: number, levelDiff: number): number {
  if (avoid === 0) return 1
  return Math.min(1, accuracy / ((1.84 + 0.07 * Math.max(0, levelDiff)) * avoid))
}

/** AANNAME: schade zakt 1% per level dat de ontvanger boven de aanvaller staat, nooit onder 1. */
export function dampedTouch(value: number, levelDiff: number): number {
  return Math.max(1, value * (1 - 0.01 * levelDiff))
}

/**
 * Stap 6: de schade die je oploopt na je WDEF. Bron: de damage-formule van MeowDB (de sectie over
 * inkomende schade), die zelf zegt dat het een voorspelling is: de server heeft het laatste woord.
 * Taken = Raw · (1 − DEF / (DEF + 5·(level + 40) + 1.2·Raw)), nooit onder 1.
 */
export function touchTaken(raw: number, wdef: number, charLevel: number): number {
  return Math.max(1, raw * (1 - wdef / (wdef + 5 * (charLevel + 40) + 1.2 * raw)))
}

/** Wat het model per monster voorspelt. De verbruiken zijn per kill, zodat ze meeschalen met kills per uur. */
export interface MobEstimate {
  /** Kans dat jouw aanval raakt (0 tot 1). */
  hitChance: number
  attacksToKill: number
  killsPerHour: number
  /** De gemiddelde schade per aanraking, na levelverschil en WDEF. */
  touchTaken: number
  hpLossPerKill: number
  mpPerKill: number
  starsPerKill: number
  /** Eén tik (de hoogste touch) kost DANGER_SHARE (25%) of meer van je max HP. */
  dangerous: boolean
  /** Je raakt minder dan 80% van je aanvallen. */
  missesOften: boolean
}

/** Stap 2 tot en met 8: één monster doorrekenen voor dit karakter en deze aanval. */
export function estimateMob(
  c: Character,
  attack: Attack,
  mob: MobStats,
  assumptions: Assumptions = ASSUMPTIONS,
): MobEstimate {
  // Stap 2 (AANNAME): het monster dempt je schade per level dat het hoger is, en trekt zijn WDEF af.
  const up = Math.max(0, mob.level - c.level)
  const maxHit = Math.max(1, attack.max * (1 - 0.01 * up) - mob.wdef * 0.5)
  const minHit = Math.max(1, attack.min * (1 - 0.01 * up) - mob.wdef * 0.6)
  const avgHit = (minHit + maxHit) / 2

  // Stap 3 en 4: raakkans, aanvallen per kill en kills per uur.
  const hit = hitChance(c.accuracy, mob.avoid, up)
  const expected = Math.max(attack.stars * avgHit * hit, 0.0001) // geen deling door 0 bij 0% raakkans
  const attacksToKill = Math.ceil(mob.hp / expected)
  const secondsPerKill = (attacksToKill * c.attackMs) / 1000 / assumptions.timeEfficiency
  const killsPerHour = 3600 / secondsPerKill

  // Stap 6: de schade die je oploopt, met de raakkans van het monster op jou.
  const down = Math.max(0, c.level - mob.level)
  const touch = touchTaken(dampedTouch((mob.touch.min + mob.touch.max) / 2, down), c.wdef, c.level)
  const mobHit = hitChance(mob.accuracy, c.avoid, up)
  const hpLossPerKill = assumptions.contactsPerKill * mobHit * touch

  // Stap 8: de waarschuwingen.
  const worstTouch = touchTaken(dampedTouch(mob.touch.max, down), c.wdef, c.level)

  return {
    hitChance: hit,
    attacksToKill,
    killsPerHour,
    touchTaken: touch,
    hpLossPerKill,
    mpPerKill: attacksToKill * attack.mpPerAttack,
    starsPerKill: attacksToKill * attack.stars,
    dangerous: worstTouch >= DANGER_SHARE * c.hp,
    missesOften: hit < 0.8,
  }
}
