// De factuur van een level (Dave, 6 oktober 2026): hoeveel potions (en munitie en reizen) je nodig hebt om je huidige level
// vol te maken, en wat dat samen kost. Puur, zonder UI-import. Rekent met precies de plek, de kills per uur en de potions
// waarmee de kosten van het level (levelCost) rekenen, zodat de factuur op hetzelfde bedrag uitkomt, op de afronding na: je
// koopt hele potions, dus elk aantal is naar boven afgerond.
import { bestVerdict } from './best'
import { spotOf } from './data/spots'
import type { DamageFormula } from './calc/mobModel'
import type { Job } from './job'
import { levelCost, type LevelCost } from './levelCost'
import type { Profile } from './profile'
import type { SpotDraft } from './spotDraft'
import { potionRestore, resolvePlan } from './suggest'
import { writeOff } from './writeOff'

/** De soort kost van equipment uit de winkel (Cheapest koopt, #192): de rij in Difference waarin alle gekochte stukken samen staan. */
export const SHOP_LABEL = 'Shop'

/**
 * Een stuk dat de setup in de winkel koopt: zijn naam, prijs en de levels waarover het zich terugverdient (Purchase in cheapestEquip.ts).
 * Zonder levels telt alleen dit level en staat de volle prijs op de factuur.
 */
export interface ShopPiece {
  name: string
  price: number
  from?: number
  to?: number
  truncated?: boolean
}

/**
 * Hoe de app op het bedrag van een gekocht stuk komt (Dave, 6 oktober 2026, #192): je draagt het meerdere levels, dus dit level betaalt zijn
 * deel van de prijs: prijs × (EXP van dit level / EXP van alle levels tot je volgende upgrade), naar boven afgerond (writeOff.ts).
 */
export interface ShopWhy {
  kind: 'shop'
  name: string
  price: number
  /** Dit level, en de levels (van tot en met) waarover je het stuk draagt tot je volgende upgrade. */
  level: number
  from: number
  to: number
  /** True als de upgrade pas na de EXP-tabel komt: de app rekent tot het laatste level van de tabel. */
  truncated: boolean
  thisExp: number
  sumExp: number
  share: number
}

/**
 * Hoe de app op het aantal potions komt (Dave, 6 oktober 2026): de stappen van de berekening, met de getallen die ze gebruikt.
 * HP: wat je per kill verliest (`hits` keer `touch` schade); MP: wat je aanval per kill kost, plus je buffs per uur. Dan maal je
 * kills per uur en de duur van het level, gedeeld door wat één potion herstelt (hoogstens wat er mist als je drinkt), naar
 * boven afgerond.
 */
export interface PotionWhy {
  kind: 'hp' | 'mp'
  mob: string
  /** De EXP die je nog nodig hebt, en wat één kill van deze mob geeft (#192): het aantal kills dat het level kost is `kills`, zonder dat de uren ertussen hoeven. */
  expToNext: number
  expPerKill: number
  /** Hoeveel kills het level kost, voor het afronden: expToNext / expPerKill. */
  kills: number
  /** HP: hoe vaak de mob je per kill raakt (aanrakingen maal zijn raakkans) en de schade per aanraking. */
  hits?: number
  touch?: number
  /** HP of MP die je per kill kwijt bent. */
  perKill: number
  killsPerHour: number
  /** MP per uur voor je buffs, los van je kills (0 bij HP). */
  buffPerHour: number
  hours: number
  /** Wat je in het hele level kwijt bent: (perKill × killsPerHour + buffPerHour) × hours. */
  need: number
  /** Wat één potion telt als herstel: wat hij herstelt, met Improved HP of MP Recovery, hoogstens wat er mist als je drinkt (effectiveRestore). */
  restores: number
  /** Wat de potion herstelt zonder dat plafond (met Improved HP of MP Recovery); groter dan `restores` als er herstel verspild wordt (#181). */
  full: number
  /** Hoeveel potions dat precies is, voor het afronden: het getal dat de factuur naar boven afrondt (`need / restores`). */
  exact: number
}

/**
 * Hoe de app op het aantal stars of pijlen komt (Dave, 6 oktober 2026, #192): hoeveel aanvallen een kill kost (de HP van de mob
 * gedeeld door wat één aanval gemiddeld doet, naar boven afgerond) maal de stars per aanval, dan maal kills per uur en de duur van
 * het level, naar boven afgerond. Elk getal komt uit dezelfde schatting (estimateMob) als de kosten van het level.
 */
export interface AmmoWhy {
  kind: 'ammo'
  mob: string
  /** De EXP die je nog nodig hebt, wat één kill geeft, en hoeveel kills het level dus kost (#192), net als bij PotionWhy. */
  expToNext: number
  expPerKill: number
  kills: number
  /** De HP van de mob. */
  mobHp: number
  /** De gemiddelde schade van één star na de WDEF van de mob, vóór de raakkans: het midden van minHit en maxHit. */
  avgHit: number
  /** De laagste en hoogste schade van één star: elke worp valt daartussen, de app rekent met het gemiddelde. */
  minHit: number
  maxHit: number
  /** Hoe min en max ontstaan (Dave, 6 oktober 2026, #192): de ruwe min en max uit de damage-formule, de levels die de mob hoger is, zijn WDEF en de getallen van de formule. */
  rawMin: number
  rawMax: number
  levelsUp: number
  mobWdef: number
  formula?: DamageFormula
  /** Je raakkans op de mob (0 tot 1). */
  hitChance: number
  /** Stars per aanval: 2 met Lucky Seven, anders 1. */
  starsPerAttack: number
  attacksToKill: number
  /** attacksToKill × starsPerAttack. */
  perKill: number
  killsPerHour: number
  hours: number
  /** Wat het herladen van één star kost (bij een Bowman de prijs van één pijl). */
  pricePerStar: number
  /** Hoeveel stars dat precies is, voor het afronden: perKill × killsPerHour × hours. */
  exact: number
}

/** Eén regel van de factuur: wat, hoeveel stuks (null bij een bedrag zonder stuks, zoals reizen), wat het kost, en bij een potion of munitie hoe. */
export interface InvoiceLine {
  label: string
  qty: number | null
  meso: number
  why?: PotionWhy | AmmoWhy | ShopWhy
  /** Een stuk equipment uit de winkel (#192): één regel per stuk, met × 1. */
  shop?: true
}

export type LevelInvoice =
  /** Geen factuur: de kosten van het level zijn niet uit te rekenen (zie `cost` voor waarom), of het level is niet haalbaar. */
  | { kind: 'none'; cost: LevelCost }
  /**
   * De factuur: de regels (je HP- en MP-potion altijd, de rest alleen als het iets kost) en het totaal. `level`, `expToNext`,
   * `mob` en `hours` staan niet op de kaart (Dave, 6 oktober 2026); ze komen uit de kosten van het level, en de uitleg achter
   * een aantal (PotionWhy) rekent met dezelfde mob en duur.
   */
  | { kind: 'invoice'; level: number; expToNext: number; mob: string; hours: number; lines: readonly InvoiceLine[]; total: number }

/**
 * Naar boven afronden tot hele stuks, zonder dat rekenruis een stuk erbij geeft: 3,0000000000000004 is 3, geen 4. Een echte rest
 * (3,0016) rondt wel naar boven af.
 */
// Nooit onder 0: Math.ceil(0 - 1e-9) is -0, en dat zou als "× -0" op de factuur staan.
const wholeUp = (x: number): number => Math.max(0, Math.ceil(x - 1e-9))

/** Hoe de munitie van een job heet: een Thief herlaadt stars, een Bowman koopt pijlen; een andere job gooit niets ("Ammo"). */
export const ammoLabel = (job: Job): string => (job === 'bowman' ? 'Arrows' : job === 'thief' ? 'Throwing stars' : 'Ammo')

/**
 * De factuur van je huidige level op de plek waarmee de kosten van het level rekenen. Potions en munitie per stuk, naar boven
 * afgerond; reizen als bedrag. Koopt de setup equipment (de factuur van Cheapest, Dave, 6 oktober 2026, #192), dan
 * staat elk gekocht stuk bovenaan als eigen regel, met zijn naam, × 1 en zijn winkelprijs (Dave, 6 oktober 2026); zonder aankopen, zoals bij je
 * character, staan die regels er niet.
 */
export function levelInvoice(drafts: readonly SpotDraft[], profile: Profile | null, shop: readonly ShopPiece[] = []): LevelInvoice {
  const verdict = bestVerdict(drafts, profile)
  const cost = levelCost(profile, verdict)
  if (!profile || cost.kind !== 'cost' || cost.meso === null) return { kind: 'none', cost }
  const ranked = verdict.ranked.find((r) => r.spot.id === verdict.bestId)
  const draft = drafts.find((d) => d.id === verdict.bestId)
  if (!ranked || !draft || !('expPerMeso' in ranked)) return { kind: 'none', cost }
  const spot = ranked.spot
  const hours = cost.expToNext / spot.expPerHour
  const known = spotOf(draft)
  const resolved = known ? resolvePlan(draft, known, profile) : undefined
  const plan = resolved?.plan
  // Zonder berekend plan zijn de EXP per uur of de potionkosten NaN (resolveSpot) en rangschikt de plek ongeldig, dus tot hier komt ze niet; dit is er voor het type.
  if (!resolved || !plan) return { kind: 'none', cost }
  // Wat één kill geeft: de EXP per uur van de plek gedeeld door je kills per uur, dus wat de uren eruit laat vallen (#192). Zonder kills per uur geen kills.
  const expPerKill = plan.killsPerHour > 0 ? spot.expPerHour / plan.killsPerHour : NaN
  const kills = cost.expToNext / expPerKill
  const lines: InvoiceLine[] = []
  // Alleen wat iets kost, behalve je HP- en MP-potion: die staan er altijd, ook met × 0 (Dave, 6 oktober 2026).
  const add = (label: string, qty: number | null, meso: number, why?: PotionWhy | AmmoWhy) => {
    // De munitie staat er alleen als ze iets kost; HP- en MP-potion altijd (zie boven).
    if (meso > 0 || (why && why.kind !== 'ammo')) lines.push(why ? { label, qty, meso, why } : { label, qty, meso })
  }
  // Een gekocht stuk betaalt alleen het deel van dit level (#192): de rest van de prijs is voor de levels erna.
  for (const p of shop) {
    const from = p.from ?? cost.level
    const to = p.to ?? cost.level
    const w = writeOff(p.price, cost.level, from, to)
    lines.push({
      label: p.name,
      qty: 1,
      meso: w.meso,
      shop: true,
      why: { kind: 'shop', name: p.name, price: p.price, level: cost.level, from, to, truncated: p.truncated ?? false, thisExp: w.thisExp, sumExp: w.sumExp, share: w.share },
    })
  }
  const { hpPotion, mpPotion, estimate, buffMpPerHour } = resolved.suggestion
  const hpExact = plan.hpPotionsPerHour * hours
  const mpExact = plan.mpPotionsPerHour * hours
  const hp = wholeUp(hpExact)
  const mp = wholeUp(mpExact)
  const base = { mob: spot.name, killsPerHour: plan.killsPerHour, hours, expToNext: cost.expToNext, expPerKill, kills }
  add(hpPotion.name, hp, hp * hpPotion.price, {
    ...base,
    kind: 'hp',
    hits: estimate.touchTaken > 0 ? estimate.hpLossPerKill / estimate.touchTaken : 0,
    touch: estimate.touchTaken,
    perKill: estimate.hpLossPerKill,
    buffPerHour: 0,
    need: estimate.hpLossPerKill * plan.killsPerHour * hours,
    restores: potionRestore(resolved.suggestion, 'hp').used,
    full: potionRestore(resolved.suggestion, 'hp').full,
    exact: hpExact,
  })
  add(mpPotion.name, mp, mp * mpPotion.price, {
    ...base,
    kind: 'mp',
    perKill: estimate.mpPerKill,
    buffPerHour: buffMpPerHour,
    need: (estimate.mpPerKill * plan.killsPerHour + buffMpPerHour) * hours,
    restores: potionRestore(resolved.suggestion, 'mp').used,
    full: potionRestore(resolved.suggestion, 'mp').full,
    exact: mpExact,
  })
  if (resolved.suggestion.rechargePerStar > 0) {
    const { estimate, rechargePerStar, monster } = resolved.suggestion
    const exact = plan.killsPerHour * estimate.starsPerKill * hours
    const stars = wholeUp(exact)
    add(ammoLabel(profile.job), stars, Math.ceil(stars * rechargePerStar), {
      kind: 'ammo',
      mob: spot.name,
      expToNext: cost.expToNext,
      expPerKill,
      kills,
      mobHp: monster.hp,
      avgHit: estimate.avgHit,
      minHit: estimate.minHit,
      maxHit: estimate.maxHit,
      rawMin: estimate.rawMin,
      rawMax: estimate.rawMax,
      levelsUp: estimate.levelsUp,
      mobWdef: estimate.mobWdef,
      formula: estimate.formula,
      hitChance: estimate.hitChance,
      starsPerAttack: estimate.starsPerAttack,
      attacksToKill: estimate.attacksToKill,
      perKill: estimate.starsPerKill,
      killsPerHour: plan.killsPerHour,
      hours,
      pricePerStar: rechargePerStar,
      exact,
    })
  }
  add('Travel', null, Math.ceil(spot.cost.travel * hours))
  return {
    kind: 'invoice',
    level: cost.level,
    expToNext: cost.expToNext,
    mob: spot.name,
    hours,
    lines,
    total: lines.reduce((sum, l) => sum + l.meso, 0),
  }
}
