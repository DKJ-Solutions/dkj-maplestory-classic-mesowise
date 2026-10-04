// De level-up-flow: wat er gebeurt als je in het spel een level omhoog gaat. Puur, zonder UI-import;
// het scherm toont alleen wat hier uitkomt. De app past het level aan (+1), Max HP (vaste waarde per
// level), de 5 AP (standaard in LUK) en de accuracy die daaruit volgt; alles met bron in data/thief.ts.
// Evasion en een andere AP-verdeling (DEX voor je claw) laat de app aan de speler. Een Warrior, Bowman of Magician krijgt level +1,
// zijn Max HP (data/warrior.ts, data/bowman.ts, data/magician.ts) en de accuracy die het nieuwe level geeft; zijn AP verdeelt hij zelf.
import { magicianAccuracy, magicianHpPerLevelFrom } from './data/magician'
import { AP_PER_LEVEL, baseAccuracy, hpPerLevelFrom } from './data/thief'
import { bowmanAccuracy, bowmanHpPerLevelFrom } from './data/bowman'
import { warriorAccuracy, warriorHpPerLevelFrom } from './data/warrior'
import { isComputed, type Job } from './job'
import { DRAFT_FIELDS, parseProfile, PROFILE_FIELDS, profileFieldsFor, skillPointsLeft, STAT_FIELDS, statFieldsFor, type ProfileDraft, type ProfileKey } from './profile'
import { skillsOf, type SkillId } from './skillPoint'

const LEVEL_FIELD = PROFILE_FIELDS.find((f) => f.key === 'level')!
const LEVEL_MAX = LEVEL_FIELD.max
const LEVEL_MIN = LEVEL_FIELD.min

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
 * Wat een level-up bijwerkt voor een job die zijn AP zelf verdeelt (Warrior, Bowman en Magician): zijn eigen Max HP per level en het
 * stat-deel van zijn accuracy (dat van het level afhangt), met `stat` als de stat waaruit dat deel volgt (DEX; bij een Magician INT).
 * De Thief heeft zijn eigen regels in applyLevelUp.
 */
const OWN_AP: Partial<Record<Job, { stat: 'dex' | 'int'; hpFrom: (level: number) => number; accuracy: (stat: number, level: number, luk: number) => number }>> = {
  warrior: { stat: 'dex', hpFrom: warriorHpPerLevelFrom, accuracy: warriorAccuracy },
  bowman: { stat: 'dex', hpFrom: bowmanHpPerLevelFrom, accuracy: bowmanAccuracy },
  magician: { stat: 'int', hpFrom: magicianHpPerLevelFrom, accuracy: magicianAccuracy },
}

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
  const own = OWN_AP[job]
  if (own) {
    // De AP laat de app aan de speler (de hoofdstat voor schade, de accuracy-stat en wapen-eisen); alleen het level telt in de accuracy.
    const stat = wholeOf(draft[own.stat])
    if (hp !== null) next.hp = String(hp + own.hpFrom(level))
    if (stat !== null && luk !== null && accuracy !== null) {
      next.accuracy = String(accuracy + own.accuracy(stat, level + 1, luk) - own.accuracy(stat, level, luk))
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

/**
 * Het profiel een level terug (issue #130): alleen level -1. Je stats blijven staan, want de app weet niet wat je sinds de
 * level-up met je AP hebt gedaan; wie een level-up net heeft gedaan, maakt die ongedaan op het controlescherm. Is het level geen
 * heel getal of al het laagste, dan blijft het profiel zoals het was.
 */
export function applyLevelDown(draft: ProfileDraft): ProfileDraft {
  const level = numberOf(draft.level)
  if (level === null || !Number.isInteger(level) || level <= LEVEL_MIN || level > LEVEL_MAX) return draft
  return { ...draft, level: String(level - 1) }
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

/** Bij een Warrior staat STR (zijn hoofdstat) vóór LUK, en de weapon multiplier staat bij de rest; bij een Bowman staat DEX (zijn hoofdstat) voor STR; bij een Magician INT (zijn hoofdstat) vóór LUK. */
const OWN_AFTER_LEVEL_UP: Partial<Record<Job, readonly ProfileKey[]>> = {
  warrior: ['level', 'hp', 'str', 'dex', 'accuracy', 'avoid'],
  bowman: ['level', 'hp', 'dex', 'str', 'accuracy', 'avoid'],
  // Zijn M.ATT en WDEF volgen uit de equipment; de overige velden staan erachter.
  magician: ['level', 'hp', 'int', 'luk', 'dex', 'accuracy', 'avoid'],
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
  // Ook zonder punt over in de pot van de 1e job blijft het profiel zoals het was (issue #136).
  if (!('profile' in parsed) || !skill || skill.level(parsed.profile) >= skill.max || skillPointsLeft(parsed.profile, 'job') <= 0) return draft
  // Alleen de velden die het punt raakt gaan terug in het concept; al het andere (ook wat de speler voor een
  // andere job typte) blijft zoals getypt.
  const after = skill.plusOne(parsed.profile)
  const touched = DRAFT_FIELDS.filter((f) => after[f.key] !== parsed.profile[f.key])
  return { ...draft, ...Object.fromEntries(touched.map((f) => [f.key, String(after[f.key])])) }
}
