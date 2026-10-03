// De level-up-flow: wat er gebeurt als je in het spel een level omhoog gaat. Puur, zonder UI-import;
// het scherm toont alleen wat hier uitkomt. De app past het level aan (+1), Max HP (vaste waarde per
// level), de 5 AP (standaard in LUK) en de accuracy die daaruit volgt; alles met bron in data/thief.ts.
// Avoid en een andere AP-verdeling (DEX voor je claw) laat de app aan de speler.
import type { BestVerdict } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { isInvalid } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { AP_PER_LEVEL, baseAccuracy, hpPerLevelFrom } from './data/thief'
import { expPerMesoOf } from './mesoCostAt'
import { parseProfile, PROFILE_FIELDS, type Profile, type ProfileDraft, type ProfileKey } from './profile'
import { SKILLS, type SkillId } from './skillPoint'
import { luckySevenAt } from './suggest'

const LEVEL_MAX = PROFILE_FIELDS.find((f) => f.key === 'level')!.max

/** Of het level in het profiel al het hoogste is. */
export const isMaxLevel = (draft: ProfileDraft): boolean => Number(draft.level.trim()) >= LEVEL_MAX

/** Een invulveld als getal, of null als het geen eindig getal is. */
const numberOf = (text: string): number | null => {
  const t = text.trim()
  const n = t === '' ? NaN : Number(t)
  return Number.isFinite(n) ? n : null
}

/** Een invulveld als geheel getal, of null (hp, luk, dex en accuracy zijn gehele getallen in het profiel). */
const wholeOf = (text: string): number | null => {
  const n = numberOf(text)
  return n !== null && Number.isInteger(n) ? n : null
}

/**
 * Het profiel na een level-up: level +1, Max HP + de vaste waarde van die job, de 5 AP in LUK en de
 * accuracy die daarbij hoort (alleen het verschil van het stat-deel, want de accuracy in het profiel is
 * het totaal uit het statvenster). Een veld dat geen geheel getal is, blijft zoals getypt. Is het level geen
 * heel getal of al het hoogste, dan blijft het profiel zoals het was (de speler ziet de melding van
 * parseProfile).
 */
export function applyLevelUp(draft: ProfileDraft): ProfileDraft {
  const level = numberOf(draft.level)
  if (level === null || !Number.isInteger(level) || level >= LEVEL_MAX) return draft
  const next: ProfileDraft = { ...draft, level: String(level + 1) }
  const hp = wholeOf(draft.hp)
  const dex = wholeOf(draft.dex)
  const luk = wholeOf(draft.luk)
  const accuracy = wholeOf(draft.accuracy)
  if (hp !== null) next.hp = String(hp + hpPerLevelFrom(level))
  if (luk !== null) next.luk = String(luk + AP_PER_LEVEL.amount)
  if (dex !== null && luk !== null && accuracy !== null) {
    next.accuracy = String(accuracy + baseAccuracy(dex, level + 1, luk + AP_PER_LEVEL.amount) - baseAccuracy(dex, level, luk))
  }
  return next
}

/** Wat applyLevelUp werkelijk veranderde: de HP-stijging (null als HP gelijk bleef), en of LUK en accuracy zijn aangepast. */
export interface LevelUpChanges {
  hp: number | null
  luk: boolean
  accuracy: boolean
}

/** Vergelijkt het profiel van voor en na een level-up; een veld dat gelijk bleef telt niet als aangepast. */
export function levelUpChanges(before: ProfileDraft, after: ProfileDraft): LevelUpChanges {
  const hpBefore = wholeOf(before.hp)
  const hpAfter = wholeOf(after.hp)
  return {
    hp: hpBefore !== null && hpAfter !== null && hpAfter !== hpBefore ? hpAfter - hpBefore : null,
    luk: before.luk !== after.luk,
    accuracy: before.accuracy !== after.accuracy,
  }
}

/** De zin "Bijgewerkt: level +1, Max HP +22, 5 AP in LUK en je accuracy." met alleen wat werkelijk veranderde. */
export function levelUpSummary(changes: LevelUpChanges): string {
  const items = [
    'level +1',
    ...(changes.hp !== null ? [`Max HP +${changes.hp}`] : []),
    ...(changes.luk ? [`${AP_PER_LEVEL.amount} AP in LUK`] : []),
    ...(changes.accuracy ? ['je accuracy'] : []),
  ]
  const last = items.pop()!
  return `Bijgewerkt: ${items.length ? `${items.join(', ')} en ${last}` : last}.`
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
