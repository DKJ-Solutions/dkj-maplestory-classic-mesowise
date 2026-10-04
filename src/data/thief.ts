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
 * Double Stab per skill-level (1 tot 20): MP en schade per klap, 2 klappen op 1 monster, met een dagger. Opgehaald op
 * 4 oktober 2026 (issue #139). Het model rekent hem niet door (het kent de Thief met een claw), de sectie
 * "Skillpoints" toont wat hij doet.
 */
export const DOUBLE_STAB_SOURCE: Source = { url: 'https://meowdb.com/msclassic/skills/thief/double-stab', retrieved: '2026-10-04' }
export const DOUBLE_STAB_LEVELS: readonly SkillLevel[] = [
  [8, 80], [8, 84], [8, 88], [8, 92], [9, 96], [9, 100], [9, 104], [10, 108], [10, 112], [11, 116],
  [11, 120], [12, 124], [12, 128], [13, 132], [13, 136], [14, 140], [14, 144], [15, 148], [15, 152], [16, 160],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct }))
export const DOUBLE_STAB_HITS = 2

// De aanvalstijd per claw-snelheid (de Lucky Seven-pagina, zonder Claw Booster) staat in de gedeelde tabel.
export { ATTACK_MS } from './attackSpeed'

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

// De starpagina's (294 tot 300) zijn op 4 oktober 2026 alle zeven gelezen, Subi opnieuw (zijn waarden klopten).
const STARS_RETRIEVED = '2026-10-04'
const star = (id: number, name: string, watk: number, rechargePerStar: number): ThrowingStar => ({
  name,
  watk,
  rechargePerStar,
  level: 10,
  source: { url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: STARS_RETRIEVED },
})

/** De goedkoopste stars, die je laat herladen in plaats van nieuwe te kopen (het levelplan). */
export const SUBI: ThrowingStar = star(294, 'Subi Throwing Stars', 15, 0.3)

/**
 * De throwing stars die je kunt kiezen, per itempagina: weapon attack en herladen per star, elk level 10. Alleen
 * Subi (twaalf NPC's) en Wolbi (alleen Max, Kerning City Civic Center) verkoopt een NPC; de rest is een drop of
 * Free Market, maar wie ze heeft, laat ze net zo herladen. Steely Throwing Knives staan erbij: de pagina noemt
 * de waarden, alleen waar je ze krijgt nog niet ("Coming soon").
 */
export const THROWING_STARS: readonly ThrowingStar[] = [
  SUBI,
  star(295, 'Wolbi Throwing Stars', 17, 0.4),
  star(296, 'Mokbi Throwing Stars', 19, 0.5),
  star(297, 'Kumbi Throwing Stars', 21, 0.6),
  star(298, 'Tobi Throwing Stars', 23, 0.7),
  star(299, 'Steely Throwing Knives', 25, 0.8),
  star(300, 'Ilbi Throwing Stars', 27, 0.9),
]

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

/**
 * De AP die je op een level hebt, zonder equipment: elke stat begint op 4, bij het maken van je karakter zet je er 9
 * bij, en elk level-up geeft er 5 ("Every character starts with 4 in each stat. You place 9 more AP at character
 * creation, then get 5 AP per level"). Op level 1 is dat 25, en op level L dus 25 + 5 x (L - 1).
 */
export const STARTING_AP = {
  perStat: 4,
  atCreation: 9,
  source: AP_PER_LEVEL.source,
} as const

export const apAtLevel = (level: number): number =>
  4 * STARTING_AP.perStat + STARTING_AP.atCreation + AP_PER_LEVEL.amount * (level - 1)

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

/**
 * Het stat-deel van de avoid (EVA), voor elke job hetzelfde: floor(LUK / 3) + floor(DEX / 6) + 5, met de totale
 * DEX en LUK en zonder level. Avoid uit skills (Nimble Body) en items komt er los bij. Bron: de damage-formule-gids,
 * sectie "Derived combat stats" (DAMAGE_FORMULA_SOURCE); het voorbeeld daar: LUK 4 en DEX 30 geven 11.
 */
export const baseAvoid = (dex: number, luk: number): number => Math.floor(luk / 3) + Math.floor(dex / 6) + 5
