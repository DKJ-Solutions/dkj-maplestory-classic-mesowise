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

/** Eén regel van de factuur: wat, hoeveel stuks (null bij een bedrag zonder stuks, zoals reizen) en wat het kost. */
export interface InvoiceLine {
  label: string
  qty: number | null
  meso: number
}

export type LevelInvoice =
  /** Geen factuur: de kosten van het level zijn niet uit te rekenen (zie `cost` voor waarom), of het level is niet haalbaar. */
  | { kind: 'none'; cost: LevelCost }
  /**
   * De factuur: de regels (alleen wat iets kost), het totaal, de mob, en hoeveel uur het level duurt. `level` en `expToNext`
   * komen uit de kosten van het level.
   */
  | { kind: 'invoice'; level: number; expToNext: number; mob: string; hours: number; lines: readonly InvoiceLine[]; total: number }

/** Hoe de munitie van een job heet: een Thief herlaadt stars, een Bowman koopt pijlen. */
const ammoLabel = (job: Job): string => (job === 'bowman' ? 'Arrows' : 'Throwing stars')

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
  const add = (label: string, qty: number | null, meso: number) => {
    if (meso > 0) lines.push({ label, qty, meso })
  }
  if (resolved && plan && !own(draft.potions)) {
    const { hpPotion, mpPotion } = resolved.suggestion
    const hp = Math.ceil(plan.hpPotionsPerHour * hours)
    const mp = Math.ceil(plan.mpPotionsPerHour * hours)
    add(hpPotion.name, hp, hp * hpPotion.price)
    add(mpPotion.name, mp, mp * mpPotion.price)
  } else {
    add('Potions', null, Math.ceil(spot.cost.potions * hours))
  }
  if (resolved && plan && !own(draft.ammo) && resolved.suggestion.rechargePerStar > 0) {
    const stars = Math.ceil(plan.killsPerHour * resolved.suggestion.estimate.starsPerKill * hours)
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
