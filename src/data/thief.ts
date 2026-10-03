// De Thief-gegevens waar het mob-model mee rekent: Lucky Seven, Nimble Body, de Subi-stars en de
// aanvalstijd.
// Opgehaald bij NiaMeowDB (meowdb.com) op de datum hieronder, COT2-waarden.
import type { SkillLevel, Source, ThrowingStar } from './types'

const R = '2026-10-03'

/** De Lucky Seven-pagina: MP en schade per level, de vaste multiplier en mastery, en de aanvalstijd. */
export const LUCKY_SEVEN_SOURCE: Source = { url: 'https://meowdb.com/msclassic/skills/thief/lucky-seven', retrieved: R }

/** Lucky Seven per skill-level (1 tot 20), zoals de skillpagina ze noemt. */
export const LUCKY_SEVEN_LEVELS: readonly SkillLevel[] = [
  [8, 60], [8, 64], [8, 68], [8, 72], [9, 76], [9, 80], [9, 84], [10, 88], [10, 92], [11, 96],
  [11, 100], [12, 104], [12, 108], [13, 112], [13, 116], [14, 120], [14, 124], [15, 128], [15, 132], [16, 140],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct }))

/** Lucky Seven gooit 2 stars, met een vaste multiplier van 3.0 en een vaste mastery van 50%. */
export const LUCKY_SEVEN = { stars: 2, weaponMult: 3.0, mastery: 0.5 } as const

/**
 * Milliseconden per aanval met Lucky Seven, zonder Claw Booster, per claw-snelheid (de skillpagina).
 * Welke snelheid jouw claw heeft, staat in het spel; het profiel begint bij "Fast (5)".
 */
export const ATTACK_MS = { faster3: 660, fast4: 720, fast5: 750 } as const

/**
 * Nimble Body (passief): +1 accuracy en +1 avoid per skill-level, tot en met level 15. De skillpagina
 * noemt de waarden voor COT2, ongewijzigd overgenomen uit de eerste gesloten testfase.
 */
export const NIMBLE_BODY = {
  maxLevel: 15,
  accuracyPerLevel: 1,
  avoidPerLevel: 1,
  source: { url: 'https://meowdb.com/msclassic/skills/thief/nimble-body', retrieved: R } satisfies Source,
} as const

/** De goedkoopste stars, die je laat herladen in plaats van nieuwe te kopen (het levelplan). */
export const SUBI: ThrowingStar = {
  name: 'Subi Throwing Stars',
  watk: 15,
  rechargePerStar: 0.3,
  source: { url: 'https://meowdb.com/msclassic/item-db/294', retrieved: R },
}

/** De damage-formule (min en max van een aanval) en de mastery-regel van de gewone aanval. */
export const DAMAGE_FORMULA_SOURCE: Source = {
  url: 'https://meowdb.com/msclassic/guides/explaining-the-damage-formula',
  retrieved: R,
}

/** Max HP per level-up is vast ("zero variance" in de steekproef): de Beginner +16, de Thief +22. */
export const HP_PER_LEVEL = {
  beginner: 16,
  thief: 22,
  /** De Thief-job begint op level 10: een level-up vanaf een lager level geeft de Beginner-waarde. */
  thiefFromLevel: 10,
  source: { url: 'https://meowdb.com/msclassic/guides/hp-mp-gain-explained', retrieved: R } satisfies Source,
} as const

/** De Max HP die een level-up geeft, vanaf dit level. (De eenmalige +250 HP van de job-advancement zit er niet in.) */
export const hpPerLevelFrom = (level: number): number =>
  level >= HP_PER_LEVEL.thiefFromLevel ? HP_PER_LEVEL.thief : HP_PER_LEVEL.beginner

/** AP per level voor STR, DEX, INT en LUK. */
export const AP_PER_LEVEL = {
  amount: 5,
  source: { url: 'https://meowdb.com/msclassic/guides/beginners-guide-first-steps-in-maple-world', retrieved: R } satisfies Source,
} as const

/** De Thief-gids: de accuracy-formule en het advies om de rest van de AP in LUK te zetten. */
export const ACCURACY_SOURCE: Source = { url: 'https://meowdb.com/msclassic/guides/thief-class-guide', retrieved: R }

/**
 * Het stat-deel van de accuracy: floor((1.2 x DEX + 2 x level + 0.6 x LUK) x 0.25 + 15), met de totale
 * DEX en LUK. Accuracy uit skills en items komt er los bij (+1 per punt, buiten de floor).
 * Geschreven in gehele getallen (alles x 40): in drijvende komma kan 1,2 x dex + 0,6 x luk net onder een
 * heel getal uitkomen, en dan geeft de floor een te laag getal.
 */
export const baseAccuracy = (dex: number, level: number, luk: number): number =>
  Math.floor((12 * dex + 20 * level + 6 * luk + 600) / 40)
