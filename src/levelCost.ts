// De centrale vraag (Dave, 3 oktober 2026, issue #24): wat kost je huidige level in mesos op de beste
// plek? Puur, zonder UI-import; het scherm toont alleen wat hier uitkomt.
import type { BestVerdict } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { isInvalid } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import type { Profile } from './profile'

export type LevelCost =
  /** Het karakter is niet volledig ingevuld, dus het level is onbekend. */
  | { kind: 'noProfile' }
  /** Voor dit level heeft de app de EXP-tabel niet. */
  | { kind: 'noTable'; level: number }
  /** Er is (nog) geen plek met het label "Beste". */
  | { kind: 'noBest'; level: number; expToNext: number }
  /**
   * De kosten op de beste plek: 0 als die niets kost, null als hij geen EXP oplevert. `robust` is
   * false als de winnaar wisselt zodra een aanname anders uitvalt.
   */
  | { kind: 'cost'; level: number; expToNext: number; spotName: string; meso: number | null; robust: boolean }

export function levelCost(profile: Profile | null, verdict: BestVerdict): LevelCost {
  if (!profile) return { kind: 'noProfile' }
  const { level } = profile
  const expToNext = expToNextLevel(level)
  if (expToNext === undefined) return { kind: 'noTable', level }
  const best = verdict.ranked.find((r) => r.spot.id === verdict.bestId)
  if (!best || isInvalid(best)) return { kind: 'noBest', level, expToNext }
  return {
    kind: 'cost',
    level,
    expToNext,
    spotName: best.spot.name,
    meso: mesoCostOfLevel(expToNext, best.expPerMeso),
    robust: verdict.robust,
  }
}
