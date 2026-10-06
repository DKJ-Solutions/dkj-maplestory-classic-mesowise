// Het afschrijven van equipment op de factuur van Advised (Dave, 6 oktober 2026, #192): een stuk draag je meerdere levels, dus een level
// betaalt alleen zijn deel van de prijs: prijs × (EXP van dit level / EXP van alle levels tot je volgende upgrade). Puur, zonder UI-import.
import { expToNextLevel } from './data/expTable'

/** Hoe een prijs over de levels van een horizon is verdeeld, en wat dit level ervan betaalt. */
export interface WriteOff {
  /** De EXP van dit level, en van alle levels van de horizon samen (dit level erbij). */
  thisExp: number
  sumExp: number
  /** thisExp / sumExp, 0 tot 1; 1 als de horizon alleen dit level is of niet uit de EXP-tabel te rekenen valt. */
  share: number
  /** De prijs maal het deel, naar boven afgerond op hele meso (zonder rekenruis: 7000 blijft 7000). */
  meso: number
}

/**
 * Het deel van `price` dat het level `level` betaalt als het stuk gedragen wordt van level `from` tot en met `to`. Een horizon van één
 * level, een level buiten de EXP-tabel of een horizon zonder EXP geeft de volle prijs: er is dan niets om over te verdelen.
 */
export function writeOff(price: number, level: number, from: number, to: number): WriteOff {
  const thisExp = expToNextLevel(level)
  let sumExp = 0
  for (let l = from; l <= to; l++) sumExp += expToNextLevel(l) ?? 0
  if (thisExp === undefined || sumExp <= 0 || from > level || to < level) return { thisExp: thisExp ?? 0, sumExp: thisExp ?? 0, share: 1, meso: price }
  const share = thisExp / sumExp
  return { thisExp, sumExp, share, meso: Math.max(0, Math.ceil(price * share - 1e-9)) }
}
