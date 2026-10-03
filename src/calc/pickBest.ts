// Welke plek het label "Beste" krijgt: puur, zonder UI-import. De volgorde blijft die van
// rankSpots (EXP per meso); dit bepaalt alleen welke plek in die volgorde het label mag dragen
// (Dave, 3 oktober 2026, issue #21).
import { isInvalid, type RankResult } from './rankSpots'

/**
 * Een plek met minder dan dit deel van de hoogste EXP per uur levert te weinig op voor "Beste". De
 * hoogste telt alleen onder de veilige plekken: een gevaarlijke plek krijgt het label toch niet, en
 * mag dan ook de lat voor de andere niet leggen.
 */
export const MIN_EXP_SHARE = 0.5

/** Waarom een geldige plek het label niet krijgt. */
export type NotBestReason = 'lowExp' | 'dangerous'

export interface BestPick {
  /** De id van de beste plek, of null als er niets te kiezen valt. */
  bestId: string | null
  /** Per uitgesloten plek de reden; gevaar gaat voor lage EXP. */
  excluded: Map<string, NotBestReason>
}

/**
 * De eerste plek in de rangschikking die genoeg EXP per uur oplevert en niet gevaarlijk is.
 * Bij minder dan twee plekken, of als de bovenste ongeldig is, valt er niets te vergelijken.
 */
export function pickBest(ranked: readonly RankResult[], isDangerous: (id: string) => boolean): BestPick {
  const excluded = new Map<string, NotBestReason>()
  if (ranked.length < 2 || isInvalid(ranked[0])) return { bestId: null, excluded }
  const valid = ranked.filter((r) => !isInvalid(r))
  const safe = valid.filter((r) => !isDangerous(r.spot.id))
  const floor = MIN_EXP_SHARE * Math.max(0, ...safe.map((r) => r.spot.expPerHour))
  let bestId: string | null = null
  for (const r of valid) {
    const reason: NotBestReason | null = isDangerous(r.spot.id) ? 'dangerous' : r.spot.expPerHour < floor ? 'lowExp' : null
    if (reason) excluded.set(r.spot.id, reason)
    else bestId ??= r.spot.id
  }
  return { bestId, excluded }
}
