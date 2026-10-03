// De level-up-flow: wat er gebeurt als je in het spel een level omhoog gaat. Puur, zonder UI-import;
// het scherm toont alleen wat hier uitkomt. De app past alleen het level aan (+1): wat HP, AP en
// stats erbij komen, staat nergens met een bron in de repo, dus dat vult de speler zelf in.
import type { BestVerdict } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { isInvalid } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { expPerMesoOf } from './mesoCostAt'
import { parseProfile, PROFILE_FIELDS, type Profile, type ProfileDraft, type ProfileKey } from './profile'
import { SKILLS, type SkillId } from './skillPoint'
import { luckySevenAt } from './suggest'

const LEVEL_MAX = PROFILE_FIELDS.find((f) => f.key === 'level')!.max

/** Of het level in het profiel al het hoogste is. */
export const isMaxLevel = (draft: ProfileDraft): boolean => Number(draft.level.trim()) >= LEVEL_MAX

/**
 * Het profiel na een level-up: het level +1, de rest ongemoeid. Is het level geen heel getal of al het
 * hoogste, dan blijft het profiel zoals het was (de speler ziet de melding van parseProfile).
 */
export function applyLevelUp(draft: ProfileDraft): ProfileDraft {
  const text = draft.level.trim()
  const level = text === '' ? NaN : Number(text)
  if (!Number.isInteger(level) || level >= LEVEL_MAX) return draft
  return { ...draft, level: String(level + 1) }
}

/** De velden die een speler na een level-up het vaakst moet bijwerken, bovenaan; daarna de rest. */
const AFTER_LEVEL_UP: readonly ProfileKey[] = ['level', 'hp', 'luk', 'dex', 'str', 'accuracy', 'avoid']

/** De profielvelden in de volgorde voor het controlescherm. */
export const CHECK_FIELDS = [
  ...AFTER_LEVEL_UP.map((k) => PROFILE_FIELDS.find((f) => f.key === k)!),
  ...PROFILE_FIELDS.filter((f) => !AFTER_LEVEL_UP.includes(f.key)),
]

/** Een profiel als invulvelden, zoals ProfileDraft ze bewaart. */
const toDraftStrings = (p: Profile): ProfileDraft =>
  Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, String(p[f.key])])) as ProfileDraft

/**
 * Het profiel met één punt erbij in deze skill (dezelfde stap als het skillpuntadvies rekent). Is het
 * profiel niet volledig, of staat de skill al op het maximum, dan blijft het zoals het was.
 */
export function applySkillPoint(draft: ProfileDraft, id: SkillId): ProfileDraft {
  const parsed = parseProfile(draft)
  const skill = SKILLS.find((s) => s.id === id)
  if (!('profile' in parsed) || !skill || skill.level(parsed.profile) >= skill.max) return draft
  return toDraftStrings(skill.plusOne(parsed.profile))
}

/** De MP per worp van Lucky Seven op dit skill-level (0 als hij nog niet geleerd is). */
export const luckySevenMp = (level: number): number => luckySevenAt(level)?.mp ?? 0

/** De beste plek, zoals de speler hem zag: genoeg om hem later terug te vinden. */
export interface BestSpot {
  id: string
  name: string
}

/** De plek met het label "Beste", of null als er geen is (of hij geen geldig resultaat heeft). */
export function bestSpotOf(verdict: BestVerdict): BestSpot | null {
  const best = verdict.ranked.find((r) => r.spot.id === verdict.bestId)
  return best && !isInvalid(best) ? { id: best.spot.id, name: best.spot.name } : null
}

export type HuntingGroundAdvice =
  /** Er is nu geen plek met het label "Beste". */
  | { kind: 'noBest' }
  /** Dezelfde plek als voor de level-up. */
  | { kind: 'stay'; name: string }
  /**
   * Een andere plek (of er was er eerst geen). `from` is de plek van voor de level-up, of null; `fromGone` is true als die plek er niet meer is (dan is `from` null). De kosten
   * zijn die van het huidige level: undefined als ze niet uit te rekenen vallen (geen EXP-tabel, plek
   * verdwenen of ongeldig), null als de plek geen EXP oplevert, 0 als hij niets kost.
   */
  | { kind: 'move'; from: string | null; fromGone: boolean; to: string; mesoFrom: number | null | undefined; mesoTo: number | null | undefined }

/** Moet je naar een andere plek, nu je level omhoog is? Vergelijkt de beste plek van toen met die van nu. */
export function huntingGroundAdvice(before: BestSpot | null, verdict: BestVerdict, profile: Profile | null): HuntingGroundAdvice {
  const now = bestSpotOf(verdict)
  if (!now) return { kind: 'noBest' }
  if (before && before.id === now.id) return { kind: 'stay', name: now.name }
  const expToNext = profile ? expToNextLevel(profile.level) : undefined
  const costAt = (id: string | undefined) => {
    const epm = expPerMesoOf(verdict.ranked, id)
    return expToNext === undefined || epm === undefined ? undefined : mesoCostOfLevel(expToNext, epm)
  }
  // De oude plek kan intussen verwijderd zijn; dan noemen we hem niet.
  const old = verdict.ranked.find((r) => r.spot.id === before?.id)
  return { kind: 'move', from: old?.spot.name ?? null, fromGone: before !== null && !old, to: now.name, mesoFrom: costAt(old?.spot.id), mesoTo: costAt(now.id) }
}
