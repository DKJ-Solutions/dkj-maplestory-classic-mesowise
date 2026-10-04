// "Beste" voor de lijst van plekken: de regel uit calc/pickBest, plus de vraag of de winnaar
// overeind blijft als de aannames zonder bron anders uitvallen (Dave, 3 oktober 2026, issue #21).
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { pickBest, type NotBestReason } from './calc/pickBest'
import { isInvalid, rankSpots, type RankResult } from './calc/rankSpots'
import { spotOf } from './data/spots'
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
  drafts.map((d) => resolveSpot(d, spotOf(d), profile, assumptions))

/**
 * Of het monster waarop je traint gevaarlijk is; bij een eigen plek weet de app dat niet. De aannames
 * tellen mee, omdat ze bepalen welk monster het voorstel kiest als de speler er geen koos.
 */
export function isDangerousSpot(d: SpotDraft, profile: Profile | null, assumptions: Assumptions = ASSUMPTIONS): boolean {
  const known = spotOf(d)
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

/** "Beste" onder één set aannames: de rangschikking en het label, zonder de robuustheidstoets. */
export function pickUnder(drafts: readonly SpotDraft[], profile: Profile | null, a: Assumptions = ASSUMPTIONS) {
  const ranked = rankSpots(resolveAll(drafts, profile, a))
  // Eén plek is de mob waarop je jaagt (Dave, 4 oktober 2026): daar rekent de app mee, ook als hij gevaarlijk is.
  // Er valt niets te kiezen, dus niets uit te sluiten; alleen een ongeldige plek geeft geen getal.
  if (ranked.length === 1) return { ranked, bestId: isInvalid(ranked[0]) ? null : ranked[0].spot.id, excluded: new Map<string, NotBestReason>() }
  const dangerous = new Set(drafts.filter((d) => isDangerousSpot(d, profile, a)).map((d) => d.id))
  return { ranked, ...pickBest(ranked, (id) => dangerous.has(id)) }
}

export function bestVerdict(drafts: readonly SpotDraft[], profile: Profile | null): BestVerdict {
  const { ranked, bestId, excluded } = pickUnder(drafts, profile)
  const robust = bestId === null || ASSUMPTION_VARIANTS.every((a) => pickUnder(drafts, profile, a).bestId === bestId)
  return { ranked, bestId, robust, excluded }
}
