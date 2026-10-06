// Loont het om van mob te wisselen? (Dave, 4 oktober 2026, #122 en #126): de mob waarop je jaagt naast elke
// andere mob uit de data, voor je huidige level. De mob is het advies, niet de plek: de mob draagt de HP en de EXP.
// Puur, zonder UI-import.
import { bestVerdict } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { expToNextLevel } from './data/expTable'
import { huntedMob, mobDraft, MOBS } from './data/spots'
import { expPerMesoOf } from './bestExpPerMeso'
import type { Profile } from './profile'
import type { SpotDraft } from './spotDraft'

export type MobAdvice =
  /** Niet uit te rekenen: geen profiel, geen mob gekozen, of je level staat niet in de EXP-tabel. */
  | { kind: 'none' }
  /**
   * Een vergelijking. `best` is de goedkoopste veilige mob (null als geen enkele mob een getal geeft); `meso`
   * is wat dit level kost bij je eigen mob en bij de beste (undefined niet uit te rekenen, null geen EXP).
   * `robust` is false als een andere mob wint zodra één aanname naar de rand gaat.
   */
  | { kind: 'advice'; hunted: string; stay: boolean; best: string | null; mesoHunted: number | null | undefined; mesoBest: number | null | undefined; robust: boolean }

/** De goedkoopste veilige mob uit de data voor dit profiel, voor wie nog geen mob heeft gekozen (#193); null als geen enkele mob een getal geeft of het level niet in de EXP-tabel staat. */
export function cheapestMob(profile: Profile): string | null {
  if (expToNextLevel(profile.level) === undefined) return null
  return bestName(bestVerdict(MOBS.map((m) => mobDraft(m.name)!), profile))
}

const bestName = (verdict: ReturnType<typeof bestVerdict>): string | null => verdict.ranked.find((r) => r.spot.id === verdict.bestId)?.spot.name ?? null

export function mobAdvice(drafts: readonly SpotDraft[], profile: Profile | null): MobAdvice {
  const own = drafts.find((d) => huntedMob(d) !== undefined)
  const hunted = huntedMob(own)
  const expToNext = profile ? expToNextLevel(profile.level) : undefined
  if (!own || !hunted || !profile || expToNext === undefined) return { kind: 'none' }
  // Je eigen mob met je eigen correcties; de andere zoals de database ze kent.
  const others = MOBS.filter((m) => m.name !== hunted.name).map((m) => mobDraft(m.name)!)
  const verdict = bestVerdict([own, ...others], profile)
  const costOf = (id: string | null) => {
    const epm = expPerMesoOf(verdict.ranked, id)
    return epm === undefined ? undefined : mesoCostOfLevel(expToNext, epm)
  }
  const best = bestName(verdict)
  return { kind: 'advice', hunted: hunted.name, stay: verdict.bestId === own.id, best, mesoHunted: costOf(own.id), mesoBest: costOf(verdict.bestId), robust: verdict.robust }
}
