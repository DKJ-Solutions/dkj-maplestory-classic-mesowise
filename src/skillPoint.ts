// Waar je skillpunt de meeste mesos bespaart (Dave, 3 oktober 2026, issue #26). Een punt kost niets,
// dus de vraag is niet óf, maar in welke skill: per skill die het mob-model kan doorrekenen het profiel
// met één punt erbij, en de mesokosten van je level op de beste plek. Puur, zonder UI-import.
// De Warrior (issue #42) heeft er twee: Power Strike en Precise Strikes.
import { ASSUMPTION_VARIANTS } from './best'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { expToNextLevel } from './data/expTable'
import { THIEF_SKILLS, type SkillInfo, type SkillKey } from './data/skills'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { POWER_STRIKE_LEVELS, PRECISE_STRIKES_LEVELS } from './data/warrior'
import type { Job } from './job'
import { mesoCostAt } from './mesoCostAt'
import type { Profile, ProfileDraft } from './profile'
import type { SpotDraft } from './spotDraft'

/** De skills die het mob-model kan doorrekenen. */
export type SkillId = Extract<SkillKey, 'luckySeven' | 'nimbleBody' | 'powerStrike' | 'preciseStrikes'>

interface Skill {
  id: SkillId
  name: string
  max: number
  level: (p: Profile) => number
  /** Het profiel met één punt erbij in deze skill. */
  plusOne: (p: Profile) => Profile
}

/** De skills van de 1e job die het model kan doorrekenen. */
export const SKILLS: readonly Skill[] = [
  {
    id: 'luckySeven',
    name: 'Lucky Seven',
    max: LUCKY_SEVEN_LEVELS.length,
    level: (p) => p.luckySeven,
    plusOne: (p) => ({ ...p, luckySeven: p.luckySeven + 1 }),
  },
  {
    id: 'nimbleBody',
    name: 'Nimble Body',
    max: NIMBLE_BODY.maxLevel,
    level: (p) => p.nimbleBody,
    // Accuracy en avoid in het profiel zijn de totalen uit je statvenster, met Nimble Body erin.
    plusOne: (p) => ({
      ...p,
      nimbleBody: p.nimbleBody + 1,
      accuracy: p.accuracy + NIMBLE_BODY.accuracyPerLevel,
      avoid: p.avoid + NIMBLE_BODY.avoidPerLevel,
    }),
  },
]

/** De accuracy die Precise Strikes op dit level geeft (0 op level 0). */
const preciseAccuracy = (level: number): number => PRECISE_STRIKES_LEVELS[level - 1]?.accuracy ?? 0

/**
 * De skills van de 1e job van een Warrior die het model kan doorrekenen. Power Strike telt als de aanval van
 * elke klap. Van Precise Strikes telt alleen de accuracy; de extra kans op een critical hit niet, want de
 * damage-gids noemt geen schade voor een crit (de voorzichtige keuze: het punt lijkt dan minder waard dan het is).
 */
export const WARRIOR_MODELLED: readonly Skill[] = [
  {
    id: 'powerStrike',
    name: 'Power Strike',
    max: POWER_STRIKE_LEVELS.length,
    level: (p) => p.powerStrike,
    plusOne: (p) => ({ ...p, powerStrike: p.powerStrike + 1 }),
  },
  {
    id: 'preciseStrikes',
    name: 'Precise Strikes',
    max: PRECISE_STRIKES_LEVELS.length,
    level: (p) => p.preciseStrikes,
    // De accuracy in het profiel is het totaal uit je statvenster, met Precise Strikes erin.
    plusOne: (p) => ({
      ...p,
      preciseStrikes: p.preciseStrikes + 1,
      accuracy: p.accuracy + preciseAccuracy(p.preciseStrikes + 1) - preciseAccuracy(p.preciseStrikes),
    }),
  },
]

/** De skills die het model voor deze job kan doorrekenen. */
export const skillsOf = (job: Job): readonly Skill[] => (job === 'warrior' ? WARRIOR_MODELLED : SKILLS)

/** De andere skills van de 1e job: het model rekent ze niet door, dus de app noemt ze. */
export const NOT_MODELLED: readonly string[] = THIEF_SKILLS.filter((s) => s.job === 'Thief' && !SKILLS.some((m) => m.id === s.key)).map(
  (s) => s.name,
)

/**
 * Wat het model van een Warrior niet kan doorrekenen, met de reden. Slash Blast raakt tot 4 monsters, en hoeveel
 * monsters er bij je staan is nergens gemeten; op één monster is hij zwakker dan Power Strike en kost hij HP.
 * Improved HP Recovery, Max HP Increase en Iron Body werken op herstel, HP en WDEF van een buff die het profiel
 * niet kent.
 */
export const WARRIOR_NOT_MODELLED: readonly string[] = ['Improved HP Recovery', 'Max HP Increase', 'Iron Body', 'Slash Blast']

/** De skills van deze job die het model niet doorrekent. */
export const notModelled = (job: Job): readonly string[] => (job === 'warrior' ? WARRIOR_NOT_MODELLED : NOT_MODELLED)

/** Een skill zoals de speler hem nu heeft gezet; `level` is null als het veld geen geldig skill-level is. */
export interface SkillLevel extends SkillInfo {
  level: number | null
}

/**
 * De skillpunten die de speler nu heeft gezet, voor elke skill van een Thief tot de 2e job. Leest het
 * profiel zoals ingevuld, zodat de sectie ook klopt als een ander veld nog niet goed is.
 */
export function skillLevels(draft: ProfileDraft, skills: readonly SkillInfo[] = THIEF_SKILLS): SkillLevel[] {
  return skills.map((s) => {
    const text = draft[s.key].trim()
    const n = text === '' ? NaN : Number(text)
    const valid = Number.isInteger(n) && n >= 0 && n <= s.max
    return { ...s, level: valid ? n : null }
  })
}

/**
 * Een skillveld na een tik op − of +: één level lager of hoger, binnen 0 en het maximum. Een veld dat geen
 * heel getal is (leeg of half getypt), telt als 0; boven het maximum telt als het maximum.
 */
export function stepSkill(text: string, delta: -1 | 1, max: number): string {
  const n = Number(text.trim())
  const from = text.trim() !== '' && Number.isInteger(n) ? Math.min(Math.max(n, 0), max) : 0
  return String(Math.min(Math.max(from + delta, 0), max))
}

/** De mesokosten van je level op de beste plek; undefined als er niets uit te rekenen valt. */
function mesoCost(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions): number | null | undefined {
  const expToNext = expToNextLevel(profile.level)
  return expToNext === undefined ? undefined : mesoCostAt(drafts, profile, a, expToNext)
}

export interface SkillChoice {
  id: SkillId
  name: string
  /** Het skill-level na het punt. */
  to: number
  /** De mesokosten van je level met het punt erbij, of null als dat niet uit te rekenen valt. */
  meso: number | null
  /** Hoeveel meso het punt dit level bespaart (0 of negatief: niets), of null zonder kosten. */
  saving: number | null
}

export type SkillPointAdvice =
  /** De kosten van je level zijn niet uit te rekenen (geen profiel, buiten de tabel, geen "Beste"). */
  | { kind: 'none' }
  | {
      kind: 'advice'
      /** De mesokosten van je level zonder het punt. */
      base: number
      /** Per skill die nog omhoog kan, van meeste naar minste besparing. */
      choices: SkillChoice[]
      /** De namen van de skills die al op het maximum staan. */
      maxed: string[]
      /** De skill met de grootste besparing boven 0, of null als geen punt iets bespaart. */
      winner: SkillId | null
      /** False als een andere skill wint (of geen) zodra één aanname naar de rand gaat. */
      robust: boolean
    }

const bySaving = (a: SkillChoice, b: SkillChoice) => (b.saving ?? -Infinity) - (a.saving ?? -Infinity)

function adviseUnder(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions) {
  const base = mesoCost(drafts, profile, a)
  if (typeof base !== 'number') return null
  const choices = skillsOf(profile.job)
    .filter((s) => s.level(profile) < s.max)
    .map((s): SkillChoice => {
      const meso = mesoCost(drafts, s.plusOne(profile), a)
      const known = typeof meso === 'number'
      return { id: s.id, name: s.name, to: s.level(profile) + 1, meso: known ? meso : null, saving: known ? base - meso : null }
    })
    .sort(bySaving)
  const top = choices[0]
  const winner = top && top.saving !== null && top.saving > 0 ? top.id : null
  return { base, choices, winner }
}

export function skillPointAdvice(drafts: readonly SpotDraft[], profile: Profile | null): SkillPointAdvice {
  if (!profile) return { kind: 'none' }
  const main = adviseUnder(drafts, profile, ASSUMPTIONS)
  if (!main) return { kind: 'none' }
  const robust = ASSUMPTION_VARIANTS.every((a) => (adviseUnder(drafts, profile, a)?.winner ?? null) === main.winner)
  const maxed = skillsOf(profile.job).filter((s) => s.level(profile) >= s.max).map((s) => s.name)
  return { kind: 'advice', ...main, maxed, robust }
}
