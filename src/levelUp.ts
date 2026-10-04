// De level-up-flow: wat er gebeurt als je in het spel een level omhoog gaat. Puur, zonder UI-import;
// het scherm toont alleen wat hier uitkomt. De app past het level aan (+1), Max HP (vaste waarde per
// level), de 5 AP (standaard in LUK) en de accuracy die daaruit volgt; alles met bron in data/thief.ts.
// Evasion en een andere AP-verdeling (DEX voor je claw) laat de app aan de speler. Een Warrior of Bowman krijgt level +1,
// zijn Max HP (data/warrior.ts, data/bowman.ts) en de accuracy die het nieuwe level geeft; zijn AP verdeelt hij zelf.
import type { BestVerdict } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { isInvalid } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { AP_PER_LEVEL, baseAccuracy, hpPerLevelFrom } from './data/thief'
import { bowmanAccuracy, bowmanHpPerLevelFrom } from './data/bowman'
import { warriorAccuracy, warriorHpPerLevelFrom } from './data/warrior'
import { isComputed, type Job } from './job'
import { expPerMesoOf } from './mesoCostAt'
import { DRAFT_FIELDS, parseProfile, PROFILE_FIELDS, profileFieldsFor, STAT_FIELDS, statFieldsFor, type Profile, type ProfileDraft, type ProfileKey } from './profile'
import { skillsOf, type SkillId } from './skillPoint'

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
 * Wat een level-up bijwerkt voor een job die zijn AP zelf verdeelt (Warrior en Bowman): zijn eigen Max HP per level en het
 * stat-deel van zijn accuracy (dat van het level afhangt). De Thief heeft zijn eigen regels in applyLevelUp.
 */
const OWN_AP = {
  warrior: { hpFrom: warriorHpPerLevelFrom, accuracy: warriorAccuracy },
  bowman: { hpFrom: bowmanHpPerLevelFrom, accuracy: bowmanAccuracy },
} as const

/**
 * Het profiel na een level-up: level +1, Max HP + de vaste waarde van die job, de 5 AP in LUK en de
 * accuracy die daarbij hoort (alleen het verschil van het stat-deel, want de accuracy in het profiel is
 * het totaal uit het statvenster). Een veld dat geen geheel getal is, blijft zoals getypt. Is het level geen
 * heel getal of al het hoogste, dan blijft het profiel zoals het was (de speler ziet de melding van
 * parseProfile). HP per level en AP in LUK zijn van de Thief: een Warrior of Bowman krijgt zijn eigen HP per level en geen AP,
 * een andere job krijgt alleen level +1 en de speler vult de rest zelf in.
 */
export function applyLevelUp(draft: ProfileDraft, job: Job): ProfileDraft {
  const level = numberOf(draft.level)
  if (level === null || !Number.isInteger(level) || level >= LEVEL_MAX) return draft
  const next: ProfileDraft = { ...draft, level: String(level + 1) }
  if (!isComputed(job)) return next
  const hp = wholeOf(draft.hp)
  const dex = wholeOf(draft.dex)
  const luk = wholeOf(draft.luk)
  const accuracy = wholeOf(draft.accuracy)
  if (job === 'warrior' || job === 'bowman') {
    // De AP laat de app aan de speler (de hoofdstat voor schade, DEX voor accuracy en wapen-eisen); alleen het level telt in de accuracy.
    const own = OWN_AP[job]
    if (hp !== null) next.hp = String(hp + own.hpFrom(level))
    if (dex !== null && luk !== null && accuracy !== null) {
      next.accuracy = String(accuracy + own.accuracy(dex, level + 1, luk) - own.accuracy(dex, level, luk))
    }
    return next
  }
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

/** De stats in de volgorde voor het controlescherm (de velden die alleen ter info zijn, staan er niet in); je skills staan in hun eigen kaart. */
export const CHECK_FIELDS = [
  ...AFTER_LEVEL_UP.map((k) => PROFILE_FIELDS.find((f) => f.key === k)!),
  ...STAT_FIELDS.filter((f) => !AFTER_LEVEL_UP.includes(f.key) && !f.informative),
]

/** Bij een Warrior staat STR (zijn hoofdstat) vóór LUK, en de weapon multiplier staat bij de rest; bij een Bowman staat DEX (zijn hoofdstat) voor STR. */
const OWN_AFTER_LEVEL_UP: Partial<Record<Job, readonly ProfileKey[]>> = {
  warrior: ['level', 'hp', 'str', 'dex', 'accuracy', 'avoid'],
  bowman: ['level', 'hp', 'dex', 'str', 'accuracy', 'avoid'],
}

/** De velden van het controlescherm voor deze job (zonder de Thief-skills bij een andere job). */
export const checkFieldsFor = (job: Job) => {
  const order = OWN_AFTER_LEVEL_UP[job]
  if (order) {
    const first = order.map((k) => DRAFT_FIELDS.find((f) => f.key === k)!)
    return [...first, ...statFieldsFor(job).filter((f) => !order.includes(f.key) && !f.informative)]
  }
  const shown = profileFieldsFor(job)
  return CHECK_FIELDS.filter((f) => shown.includes(f))
}

/**
 * Het profiel met één punt erbij in deze skill (dezelfde stap als het skillpuntadvies rekent). Is het
 * profiel niet volledig, of staat de skill al op het maximum, dan blijft het zoals het was.
 */
export function applySkillPoint(draft: ProfileDraft, id: SkillId, job: Job = 'thief'): ProfileDraft {
  const parsed = parseProfile(draft, job)
  const skill = skillsOf(job).find((s) => s.id === id)
  if (!('profile' in parsed) || !skill || skill.level(parsed.profile) >= skill.max) return draft
  // Alleen de velden die het punt raakt gaan terug in het concept; al het andere (ook wat de speler voor een
  // andere job typte) blijft zoals getypt.
  const after = skill.plusOne(parsed.profile)
  const touched = DRAFT_FIELDS.filter((f) => after[f.key] !== parsed.profile[f.key])
  return { ...draft, ...Object.fromEntries(touched.map((f) => [f.key, String(after[f.key])])) }
}

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
