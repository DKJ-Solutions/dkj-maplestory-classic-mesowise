// De level-up-flow: wat er gebeurt als je in het spel een level omhoog gaat. Puur, zonder UI-import;
// het scherm toont alleen wat hier uitkomt. De app past het level aan (+1), Max HP (vaste waarde per
// level), de 5 AP (standaard in LUK) en de accuracy die daaruit volgt; alles met bron in data/thief.ts.
// Avoid en een andere AP-verdeling (DEX voor je claw) laat de app aan de speler. Een Warrior krijgt level +1,
// zijn Max HP (data/warrior.ts) en de accuracy die het nieuwe level geeft; zijn AP verdeelt hij zelf. Een Magician idem:
// level +1, zijn Max HP (data/magician.ts) en de accuracy die het nieuwe level geeft; zijn AP (INT voor schade en accuracy) verdeelt hij zelf.
import type { BestVerdict } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { isInvalid } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { magicianAccuracy, magicianHpPerLevelFrom } from './data/magician'
import { AP_PER_LEVEL, baseAccuracy, hpPerLevelFrom } from './data/thief'
import { warriorAccuracy, warriorHpPerLevelFrom } from './data/warrior'
import { isComputed, type Job } from './job'
import { expPerMesoOf } from './mesoCostAt'
import { DRAFT_FIELDS, parseProfile, PROFILE_FIELDS, profileFieldsFor, STAT_FIELDS, statFieldsFor, type Profile, type ProfileDraft, type ProfileKey } from './profile'
import { skillsOf, type SkillId } from './skillPoint'
import { energyBoltAt, luckySevenAt, magicClawAt, powerStrikeAt } from './suggest'

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
 * parseProfile). HP per level en AP in LUK zijn van de Thief: een Warrior krijgt zijn eigen HP per level en geen AP,
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
  const int = wholeOf(draft.int)
  const accuracy = wholeOf(draft.accuracy)
  if (job === 'magician') {
    // De AP laat de app aan de speler (INT voor schade en accuracy, LUK voor wapen-eisen); alleen het level telt in de accuracy.
    if (hp !== null) next.hp = String(hp + magicianHpPerLevelFrom(level))
    if (int !== null && luk !== null && accuracy !== null) {
      next.accuracy = String(accuracy + magicianAccuracy(int, level + 1, luk) - magicianAccuracy(int, level, luk))
    }
    return next
  }
  if (job === 'warrior') {
    // De AP laat de app aan de speler (STR voor schade, DEX voor accuracy en wapen-eisen); alleen het level telt in de accuracy.
    if (hp !== null) next.hp = String(hp + warriorHpPerLevelFrom(level))
    if (dex !== null && luk !== null && accuracy !== null) {
      next.accuracy = String(accuracy + warriorAccuracy(dex, level + 1, luk) - warriorAccuracy(dex, level, luk))
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

/** De stats in de volgorde voor het controlescherm; je skills staan in hun eigen kaart. */
export const CHECK_FIELDS = [
  ...AFTER_LEVEL_UP.map((k) => PROFILE_FIELDS.find((f) => f.key === k)!),
  ...STAT_FIELDS.filter((f) => !AFTER_LEVEL_UP.includes(f.key)),
]

/** Bij een Warrior staat STR (zijn hoofdstat) vóór LUK, en de weapon multiplier staat bij de rest. */
const WARRIOR_AFTER_LEVEL_UP: readonly ProfileKey[] = ['level', 'hp', 'str', 'dex', 'accuracy', 'avoid']

/** Bij een Magician staat INT (zijn hoofdstat) vóór LUK; zijn M.ATT en WDEF volgen uit de equipment; de overige velden staan erachter. */
const MAGICIAN_AFTER_LEVEL_UP: readonly ProfileKey[] = ['level', 'hp', 'int', 'luk', 'dex', 'accuracy', 'avoid']

/** De velden van het controlescherm voor deze job (zonder de Thief-skills bij een andere job). */
export const checkFieldsFor = (job: Job) => {
  if (job === 'magician') {
    const fields = statFieldsFor(job)
    return [...MAGICIAN_AFTER_LEVEL_UP.map((k) => fields.find((f) => f.key === k)!), ...fields.filter((f) => !MAGICIAN_AFTER_LEVEL_UP.includes(f.key))]
  }
  if (job === 'warrior') {
    const first = WARRIOR_AFTER_LEVEL_UP.map((k) => DRAFT_FIELDS.find((f) => f.key === k)!)
    return [...first, ...statFieldsFor(job).filter((f) => !WARRIOR_AFTER_LEVEL_UP.includes(f.key))]
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

/** De MP per worp van Lucky Seven op dit skill-level (0 als hij nog niet geleerd is). */
export const luckySevenMp = (level: number): number => luckySevenAt(level)?.mp ?? 0

/** De MP per aanval van Power Strike op dit skill-level (0 als hij nog niet geleerd is). */
export const powerStrikeMp = (level: number): number => powerStrikeAt(level)?.mp ?? 0

/** De MP per cast van Energy Bolt op dit skill-level (0 als hij nog niet geleerd is). */
export const energyBoltMp = (level: number): number => energyBoltAt(level)?.mp ?? 0

/** De MP per cast van Magic Claw op dit skill-level (0 als hij nog niet geleerd is). */
export const magicClawMp = (level: number): number => magicClawAt(level)?.mp ?? 0

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
