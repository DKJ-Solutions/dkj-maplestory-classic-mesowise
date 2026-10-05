// De EXP per meso op de beste plek. Gedeeld door de adviezen die een profiel naast een aangepast profiel
// leggen (skillpunt #26, claw #25); wat een horizon van levels daar kost, staat in horizonCost.ts. Puur, zonder UI-import.
import { pickUnder } from './best'
import type { Assumptions } from './calc/mobModel'
import { isInvalid, type RankResult } from './calc/rankSpots'
import type { Profile } from './profile'
import type { SpotDraft } from './spotDraft'

/** De EXP per meso van één plek uit een rangschikking; undefined als de plek ontbreekt of ongeldig is. */
export function expPerMesoOf(ranked: readonly RankResult[], id: string | null | undefined): number | undefined {
  const spot = ranked.find((r) => r.spot.id === id)
  return !spot || isInvalid(spot) ? undefined : spot.expPerMeso
}

/** De EXP per meso op de beste plek; undefined als er geen geldige "Beste" is. */
export function bestExpPerMeso(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions): number | undefined {
  const { ranked, bestId } = pickUnder(drafts, profile, a)
  return expPerMesoOf(ranked, bestId)
}

