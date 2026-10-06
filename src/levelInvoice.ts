// De factuur van een level (Dave, 6 oktober 2026): hoeveel potions (en munitie en reizen) je nodig hebt om je huidige level
// vol te maken, en wat dat samen kost. Puur, zonder UI-import. Rekent met precies de plek, de kills per uur en de potions
// waarmee de kosten van het level (levelCost) rekenen, zodat de factuur op hetzelfde bedrag uitkomt, op de afronding na: je
// koopt hele potions, dus elk aantal is naar boven afgerond.
import { bestVerdict } from './best'
import { spotOf } from './data/spots'
import type { Job } from './job'
import { levelCost, type LevelCost } from './levelCost'
import type { Profile } from './profile'
import type { SpotDraft } from './spotDraft'
import { resolvePlan } from './suggest'

/**
 * Hoe de app op het aantal potions komt (Dave, 6 oktober 2026): de stappen van de berekening, met de getallen die ze gebruikt.
 * HP: wat je per kill verliest (`hits` keer `touch` schade); MP: wat je aanval per kill kost, plus je buffs per uur. Dan maal je
 * kills per uur en de duur van het level, gedeeld door wat één potion herstelt, naar boven afgerond.
 */
export interface PotionWhy {
  kind: 'hp' | 'mp'
  mob: string
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
  /** Wat één potion herstelt, met Improved HP of MP Recovery. */
  restores: number
  /** Hoeveel potions dat precies is, voor het afronden: het getal dat de factuur naar boven afrondt (`need / restores`). */
  exact: number
}

/** Eén regel van de factuur: wat, hoeveel stuks (null bij een bedrag zonder stuks, zoals reizen), wat het kost, en bij een potion hoe. */
export interface InvoiceLine {
  label: string
  qty: number | null
  meso: number
  why?: PotionWhy
}

export type LevelInvoice =
  /** Geen factuur: de kosten van het level zijn niet uit te rekenen (zie `cost` voor waarom), of het level is niet haalbaar. */
  | { kind: 'none'; cost: LevelCost }
  /**
   * De factuur: de regels (alleen wat iets kost), het totaal, de mob, en hoeveel uur het level duurt. `level` en `expToNext`
   * komen uit de kosten van het level.
   */
  | { kind: 'invoice'; level: number; expToNext: number; mob: string; hours: number; lines: readonly InvoiceLine[]; total: number }

/**
 * Naar boven afronden tot hele stuks, zonder dat rekenruis een stuk erbij geeft: 3,0000000000000004 is 3, geen 4. Een echte rest
 * (3,0016) rondt wel naar boven af.
 */
const wholeUp = (x: number): number => Math.ceil(x - 1e-9)

/** Hoe de munitie van een job heet: een Thief herlaadt stars, een Bowman koopt pijlen; een andere job gooit niets ("Ammo"). */
const ammoLabel = (job: Job): string => (job === 'bowman' ? 'Arrows' : job === 'thief' ? 'Throwing stars' : 'Ammo')

/**
 * De factuur van je huidige level op de plek waarmee de kosten van het level rekenen. Potions en munitie per stuk, naar boven
 * afgerond; reizen als bedrag. Heb je de potion- of munitiekosten van je plek zelf ingevuld, dan staat dat bedrag er als één
 * regel, want de app weet dan niet om hoeveel stuks het gaat.
 */
export function levelInvoice(drafts: readonly SpotDraft[], profile: Profile | null): LevelInvoice {
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
  const plan = resolved?.plan ?? null
  const own = (text: string | undefined) => text !== undefined && text.trim() !== ''
  const lines: InvoiceLine[] = []
  const add = (label: string, qty: number | null, meso: number, why?: PotionWhy) => {
    if (meso > 0) lines.push(why ? { label, qty, meso, why } : { label, qty, meso })
  }
  if (resolved && plan && !own(draft.potions)) {
    const { hpPotion, mpPotion, estimate, buffMpPerHour, potionFactor } = resolved.suggestion
    const hpExact = plan.hpPotionsPerHour * hours
    const mpExact = plan.mpPotionsPerHour * hours
    const hp = wholeUp(hpExact)
    const mp = wholeUp(mpExact)
    const base = { mob: spot.name, killsPerHour: plan.killsPerHour, hours }
    add(hpPotion.name, hp, hp * hpPotion.price, {
      ...base,
      kind: 'hp',
      hits: estimate.touchTaken > 0 ? estimate.hpLossPerKill / estimate.touchTaken : 0,
      touch: estimate.touchTaken,
      perKill: estimate.hpLossPerKill,
      buffPerHour: 0,
      need: estimate.hpLossPerKill * plan.killsPerHour * hours,
      restores: hpPotion.hp * potionFactor.hp,
      exact: hpExact,
    })
    add(mpPotion.name, mp, mp * mpPotion.price, {
      ...base,
      kind: 'mp',
      perKill: estimate.mpPerKill,
      buffPerHour: buffMpPerHour,
      need: (estimate.mpPerKill * plan.killsPerHour + buffMpPerHour) * hours,
      restores: mpPotion.mp * potionFactor.mp,
      exact: mpExact,
    })
  } else {
    add('Potions', null, Math.ceil(spot.cost.potions * hours))
  }
  if (resolved && plan && !own(draft.ammo) && resolved.suggestion.rechargePerStar > 0) {
    const stars = wholeUp(plan.killsPerHour * resolved.suggestion.estimate.starsPerKill * hours)
    add(ammoLabel(profile.job), stars, Math.ceil(stars * resolved.suggestion.rechargePerStar))
  } else {
    add(ammoLabel(profile.job), null, Math.ceil(spot.cost.ammo * hours))
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
