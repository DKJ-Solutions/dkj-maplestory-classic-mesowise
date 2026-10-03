// De EXP per meso op de beste plek, en wat een level daar in mesos kost. Gedeeld door de adviezen die
// een profiel naast een aangepast profiel leggen (skillpunt #26, claw #25). Puur, zonder UI-import.
import { pickUnder } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import type { Assumptions } from './calc/mobModel'
import { isInvalid } from './calc/rankSpots'
import type { Profile } from './profile'
import type { SpotDraft } from './spotDraft'

/** De EXP per meso op de beste plek; undefined als er geen geldige "Beste" is. */
export function bestExpPerMeso(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions): number | undefined {
  const { ranked, bestId } = pickUnder(drafts, profile, a)
  const best = ranked.find((r) => r.spot.id === bestId)
  return !best || isInvalid(best) ? undefined : best.expPerMeso
}

/** Wat `expToNext` EXP in mesos kost op de beste plek: undefined zonder "Beste", null zonder EXP. */
export function mesoCostAt(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions, expToNext: number): number | null | undefined {
  const epm = bestExpPerMeso(drafts, profile, a)
  return epm === undefined ? undefined : mesoCostOfLevel(expToNext, epm)
}
