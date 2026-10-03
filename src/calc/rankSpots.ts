// Plekken rangschikken op EXP per meso: puur, zonder UI-import.
import { expPerMeso, type CostPerHour } from './expPerMeso'

/** Een trainingsplek met wat hij per uur oplevert en kost. */
export interface Spot {
  id: string
  name: string
  expPerHour: number
  cost: CostPerHour
}

/** Een plek met een geldige uitkomst (kan Infinity zijn: EXP die niets kost). */
export interface RankedSpot {
  spot: Spot
  expPerMeso: number
}

/** Een plek met ongeldige invoer: er wordt geen fout gegooid, maar een melding teruggegeven. */
export interface InvalidSpot {
  spot: Spot
  error: string
}

export type RankResult = RankedSpot | InvalidSpot

/** Onderscheid de twee uitkomsten (discriminant: alleen InvalidSpot heeft `error`). */
export function isInvalid(result: RankResult): result is InvalidSpot {
  return 'error' in result
}

const byName = (a: Spot, b: Spot) => a.name.localeCompare(b.name, 'nl')

/** Per veld: wat de gebruiker moet invullen en hoe de meldingen luiden. */
const FIELDS: { value: (s: Spot) => number; fill: string; negative: string; tooBig: string }[] = [
  { value: (s) => s.expPerHour, fill: 'Vul EXP per uur in.', negative: 'EXP per uur kan niet negatief zijn.', tooBig: 'EXP per uur is te groot.' },
  {
    value: (s) => s.cost.potions,
    fill: 'Vul de potionkosten in (0 als er geen zijn).',
    negative: 'De potionkosten kunnen niet negatief zijn.',
    tooBig: 'De potionkosten zijn te groot.',
  },
  {
    value: (s) => s.cost.ammo,
    fill: 'Vul de ammokosten in (0 als er geen zijn).',
    negative: 'De ammokosten kunnen niet negatief zijn.',
    tooBig: 'De ammokosten zijn te groot.',
  },
  {
    value: (s) => s.cost.travel,
    fill: 'Vul de reiskosten in (0 als er geen zijn).',
    negative: 'De reiskosten kunnen niet negatief zijn.',
    tooBig: 'De reiskosten zijn te groot.',
  },
]

/** De eerste fout van een plek in gewoon Nederlands, of null als de invoer klopt. */
export function spotError(spot: Spot): string | null {
  for (const f of FIELDS) {
    const v = f.value(spot)
    if (Number.isNaN(v)) return f.fill
    if (v < 0) return f.negative
    if (!Number.isFinite(v)) return f.tooBig
  }
  return null
}

function evaluate(spot: Spot): RankResult {
  const error = spotError(spot)
  if (error) return { spot, error }
  try {
    return { spot, expPerMeso: expPerMeso(spot.expPerHour, spot.cost) }
  } catch {
    return { spot, error: 'Deze invoer klopt niet.' }
  }
}

/**
 * Van hoogste naar laagste EXP per meso (Infinity bovenaan). Gelijke uitkomst: op naam.
 * Plekken met ongeldige invoer komen onderaan, onderling op naam. Wijzigt de invoer niet.
 */
export function rankSpots(spots: readonly Spot[]): RankResult[] {
  const valid: RankedSpot[] = []
  const invalid: InvalidSpot[] = []
  for (const result of spots.map(evaluate)) {
    if (isInvalid(result)) invalid.push(result)
    else valid.push(result)
  }
  // a - b geeft NaN bij Infinity - Infinity, dus expliciet vergelijken.
  valid.sort((a, b) =>
    a.expPerMeso === b.expPerMeso ? byName(a.spot, b.spot) : a.expPerMeso < b.expPerMeso ? 1 : -1,
  )
  invalid.sort((a, b) => byName(a.spot, b.spot))
  return [...valid, ...invalid]
}
