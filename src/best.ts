// "Beste" voor de lijst van plekken: de regel uit calc/pickBest, plus de vraag of de winnaar
// overeind blijft als de aannames zonder bron anders uitvallen (Dave, 3 oktober 2026, issue #21).
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { pickBest, type NotBestReason } from './calc/pickBest'
import { rankSpots, type RankResult } from './calc/rankSpots'
import { findKnownSpot } from './data/spots'
import type { Profile } from './profile'
import type { SpotDraft } from './spotDraft'
import { pickMonster, resolveSpot, suggestMonsters } from './suggest'

/** Eén aanname tegelijk naar de rand van wat redelijk is; de andere blijft staan. */
export const ASSUMPTION_VARIANTS: readonly Assumptions[] = [
  { ...ASSUMPTIONS, contactsPerKill: 0.15 },
  { ...ASSUMPTIONS, contactsPerKill: 0.6 },
  { ...ASSUMPTIONS, timeEfficiency: 0.4 },
  { ...ASSUMPTIONS, timeEfficiency: 0.8 },
]

/** De plekken als getallen: bij een bekende plek vullen lege velden zich met het voorstel. */
export const resolveAll = (drafts: readonly SpotDraft[], profile: Profile | null, assumptions: Assumptions = ASSUMPTIONS) =>
  drafts.map((d) => resolveSpot(d, findKnownSpot(d.known), profile, assumptions))

/**
 * Of het monster waarop je traint gevaarlijk is; bij een eigen plek weet de app dat niet. De aannames
 * tellen mee, omdat ze bepalen welk monster het voorstel kiest als de speler er geen koos.
 */
export function isDangerousSpot(d: SpotDraft, profile: Profile | null, assumptions: Assumptions = ASSUMPTIONS): boolean {
  const known = findKnownSpot(d.known)
  if (!known || !profile) return false
  return pickMonster(suggestMonsters(profile, known, assumptions), d.monster)?.estimate.dangerous ?? false
}

export interface BestVerdict {
  ranked: RankResult[]
  bestId: string | null
  /** False als een andere plek wint (of niemand) zodra één aanname naar de rand gaat. */
  robust: boolean
  excluded: Map<string, NotBestReason>
}

export function bestVerdict(drafts: readonly SpotDraft[], profile: Profile | null): BestVerdict {
  const pickUnder = (a: Assumptions) => {
    const dangerous = new Set(drafts.filter((d) => isDangerousSpot(d, profile, a)).map((d) => d.id))
    const ranked = rankSpots(resolveAll(drafts, profile, a))
    return { ranked, ...pickBest(ranked, (id) => dangerous.has(id)) }
  }
  const { ranked, bestId, excluded } = pickUnder(ASSUMPTIONS)
  const robust = bestId === null || ASSUMPTION_VARIANTS.every((a) => pickUnder(a).bestId === bestId)
  return { ranked, bestId, robust, excluded }
}
