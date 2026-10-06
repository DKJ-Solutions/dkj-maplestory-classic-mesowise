// De level-up: een snapshot van het huidige level, waarna alles meegaat naar het volgende level (issue #154). Puur, zonder
// UI-import; het scherm toont alleen wat hier uitkomt. De app past alleen aan wat uit een bronregel volgt: level +1, Max HP
// (vaste waarde per level, data/thief.ts, data/warrior.ts, data/bowman.ts, data/magician.ts) en het level-deel van de accuracy.
// De AP en de skillpunten verdeelt de speler zelf: hoeveel er nog te verdelen zijn, staat in apToDistribute en spToDistribute.
// Evasion, equipment en mob blijven staan tot de speler ze wijzigt; het advies zegt wanneer een wissel goedkoper is.
import { magicianAccuracy, magicianHpPerLevelFrom } from './data/magician'
import { apAtLevel, baseAccuracy, hpPerLevelFrom } from './data/thief'
import { bowmanAccuracy, bowmanHpPerLevelFrom } from './data/bowman'
import { warriorAccuracy, warriorHpPerLevelFrom } from './data/warrior'
import { isComputed, type Job } from './job'
import { baseApSpent, DRAFT_FIELDS, draftStatTotal, parseProfile, PROFILE_FIELDS, skillPointsLeft, type ProfileDraft } from './profile'
import { skillPoolUsage, skillsOf, type SkillId } from './skillPoint'

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
 * Wat een level-up bijwerkt voor een Warrior, Bowman en Magician: zijn eigen Max HP per level en het stat-deel van zijn
 * accuracy (dat van het level afhangt), met `stat` als de stat waaruit dat deel volgt (DEX; bij een Magician INT).
 * De Thief heeft zijn eigen formules in applyLevelUp.
 */
const OWN_AP: Partial<Record<Job, { stat: 'dex' | 'int'; hpFrom: (level: number) => number; accuracy: (stat: number, level: number, luk: number) => number }>> = {
  warrior: { stat: 'dex', hpFrom: warriorHpPerLevelFrom, accuracy: warriorAccuracy },
  bowman: { stat: 'dex', hpFrom: bowmanHpPerLevelFrom, accuracy: bowmanAccuracy },
  magician: { stat: 'int', hpFrom: magicianHpPerLevelFrom, accuracy: magicianAccuracy },
}

/**
 * Het profiel na een level-up: level +1, Max HP + de vaste waarde van die job en de accuracy die het nieuwe level geeft
 * (alleen het verschil van het level-deel, want de accuracy in het profiel is het totaal uit het statvenster). De AP plaatst de
 * app niet (#154): de speler verdeelt ze zelf. Een veld dat geen geheel getal is, blijft zoals getypt. Is het level geen
 * heel getal of al het hoogste, dan blijft het profiel zoals het was (de speler ziet de melding van parseProfile).
 * Een job die de app niet doorrekent krijgt alleen level +1.
 */
export function applyLevelUp(draft: ProfileDraft, job: Job): ProfileDraft {
  const level = numberOf(draft.level)
  if (level === null || !Number.isInteger(level) || level >= LEVEL_MAX) return draft
  const next: ProfileDraft = { ...draft, level: String(level + 1) }
  if (!isComputed(job)) return next
  const hp = wholeOf(draft.hp)
  // De accuracy rekent met je totale stats (base AP plus items).
  const dex = draftStatTotal(draft, 'dex')
  const luk = draftStatTotal(draft, 'luk')
  const accuracy = wholeOf(draft.accuracy)
  const own = OWN_AP[job]
  if (own) {
    // Alleen het level telt in de accuracy; de AP verdeelt de speler.
    const stat = draftStatTotal(draft, own.stat)
    if (hp !== null) next.hp = String(hp + own.hpFrom(level))
    if (stat !== null && luk !== null && accuracy !== null) {
      next.accuracy = String(accuracy + own.accuracy(stat, level + 1, luk) - own.accuracy(stat, level, luk))
    }
    return next
  }
  if (hp !== null) next.hp = String(hp + hpPerLevelFrom(level))
  if (dex !== null && luk !== null && accuracy !== null) {
    next.accuracy = String(accuracy + baseAccuracy(dex, level + 1, luk) - baseAccuracy(dex, level, luk))
  }
  return next
}

/**
 * Het profiel een level terug (issue #130): alleen level -1. Je stats blijven staan, want de app weet niet wat je met je AP
 * hebt gedaan; wie net een level-up heeft gedaan, herstelt in plaats daarvan zijn snapshot (zie snapshotApplies). Is het level geen
 * heel getal of al het laagste, dan blijft het profiel zoals het was.
 */
export function applyLevelDown(draft: ProfileDraft): ProfileDraft {
  const level = numberOf(draft.level)
  if (level === null || !Number.isInteger(level) || level <= LEVEL_MIN || level > LEVEL_MAX) return draft
  return { ...draft, level: String(level - 1) }
}

/**
 * Hoeveel base AP je nog te verdelen hebt: wat je level geeft (apAtLevel) min wat in STR, DEX, INT en LUK staat. Alleen een
 * getal als er nog AP over zijn; zonder geldig level, of als er al evenveel of meer staat, is er niets te tonen (null).
 */
export function apToDistribute(draft: ProfileDraft): number | null {
  const left = apBalance(draft)
  return left !== null && left > 0 ? left : null
}

/**
 * Wat je level aan base AP geeft min wat in STR, DEX, INT en LUK staat, ook als dat 0 of minder is: de kop van Ability
 * points toont het altijd (Dave, 5 oktober 2026, #157). Onder 0 staat er meer dan je level geeft. Null zonder geldig level.
 */
export function apBalance(draft: ProfileDraft): number | null {
  const level = wholeOf(draft.level)
  if (level === null || level < LEVEL_MIN || level > LEVEL_MAX) return null
  return apAtLevel(level) - baseApSpent(draft)
}

/** Hoeveel skillpunten van de pot van je 1e job je nog te zetten hebt; null als er geen over zijn of het level niet klopt. */
export function spToDistribute(draft: ProfileDraft, job: Job): number | null {
  const { spent, cap } = skillPoolUsage(draft, job, 'job')
  return cap !== null && cap - spent > 0 ? cap - spent : null
}

/** De stand van een level-up-snapshot: het profiel en de equipment van het level eronder, met het level waarnaar je ging. */
export interface LevelUpSnapshot<E> {
  job: Job
  /** Het level van het profiel ná de level-up; Back herstelt alleen als je nog op dat level staat. */
  toLevel: string
  draft: ProfileDraft
  equipment: E
}

/** Een snapshot van vlak voor de level-up (het profiel dat er nu staat, nog op het oude level). */
export const takeSnapshot = <E>(draft: ProfileDraft, equipment: E, job: Job): LevelUpSnapshot<E> => ({
  job,
  toLevel: applyLevelUp(draft, job).level,
  draft,
  equipment,
})

/** Of Back deze snapshot mag herstellen: zelfde job en je staat nog op het level waar de level-up je bracht. */
export const snapshotApplies = <E>(snap: LevelUpSnapshot<E> | null, draft: ProfileDraft, job: Job): snap is LevelUpSnapshot<E> =>
  snap !== null && snap.job === job && snap.toLevel === draft.level.trim()

/**
 * Het profiel met één punt erbij in deze skill (dezelfde stap als het skillpuntadvies rekent). Is het
 * profiel niet volledig, of staat de skill al op het maximum, dan blijft het zoals het was.
 */
export function applySkillPoint(draft: ProfileDraft, id: SkillId, job: Job = 'thief'): ProfileDraft {
  const parsed = parseProfile(draft, job)
  // Een Thief met een dagger heeft Double Stab in plaats van Lucky Seven (#170).
  const skill = 'profile' in parsed ? skillsOf(job, parsed.profile.dagger === 1).find((s) => s.id === id) : undefined
  // Ook zonder punt over in de pot van de 1e job blijft het profiel zoals het was (issue #136).
  if (!('profile' in parsed) || !skill || skill.level(parsed.profile) >= skill.max || skillPointsLeft(parsed.profile, 'job') <= 0) return draft
  // Alleen de velden die het punt raakt gaan terug in het concept; al het andere (ook wat de speler voor een
  // andere job typte) blijft zoals getypt.
  const after = skill.plusOne(parsed.profile)
  const touched = DRAFT_FIELDS.filter((f) => after[f.key] !== parsed.profile[f.key])
  return { ...draft, ...Object.fromEntries(touched.map((f) => [f.key, String(after[f.key])])) }
}
