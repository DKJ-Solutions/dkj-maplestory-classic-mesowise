// Waar je skillpunt de meeste mesos bespaart (Dave, 3 oktober 2026, issue #26). Een punt kost niets,
// dus de vraag is niet óf, maar in welke skill: per skill die het mob-model kan doorrekenen het profiel
// met één punt erbij, en de mesokosten van je level op de beste plek. Puur, zonder UI-import.
// De Warrior (issue #42) heeft er twee: Power Strike en Precise Strikes; de Bowman (issue #44) één: Arrow Blow; de Magician
// (issue #43) twee: Energy Bolt en Magic Claw.
import { ASSUMPTION_VARIANTS } from './best'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { expToNextLevel } from './data/expTable'
import { THIEF_SKILLS, type SkillInfo, type SkillKey } from './data/skills'
import { ENERGY_BOLT_LEVELS, MAGIC_CLAW_LEVELS, MAGIC_CLAW_REQUIRES_ENERGY_BOLT } from './data/magician'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { ARROW_BLOW_LEVELS } from './data/bowman'
import { POWER_STRIKE_LEVELS, PRECISE_STRIKES_LEVELS } from './data/warrior'
import type { Job } from './job'
import { mesoCostAt } from './mesoCostAt'
import type { Profile, ProfileDraft } from './profile'
import type { SpotDraft } from './spotDraft'

/** De skills die het mob-model kan doorrekenen. */
export type SkillId = Extract<SkillKey, 'luckySeven' | 'nimbleBody' | 'powerStrike' | 'preciseStrikes' | 'arrowBlow' | 'energyBolt' | 'magicClaw'>

interface Skill {
  id: SkillId
  name: string
  max: number
  level: (p: Profile) => number
  /** Het profiel met één punt erbij in deze skill. */
  plusOne: (p: Profile) => Profile
  /** Of je de skill nu kunt leren (een skill die een ander skill-level vraagt); zonder dit altijd. */
  learnable?: (p: Profile) => boolean
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

/**
 * De skills van de 1e job van een Magician die het model kan doorrekenen: de twee spreuken. Elk punt verandert de schade (en de
 * spell mastery, de MP per cast) van die spreuk; het model kiest per monster de spreuk met de meeste EXP per meso (zie suggest.ts). Magic Claw vraagt Energy Bolt 1.
 */
export const MAGICIAN_MODELLED: readonly Skill[] = [
  {
    id: 'energyBolt',
    name: 'Energy Bolt',
    max: ENERGY_BOLT_LEVELS.length,
    level: (p) => p.energyBolt,
    plusOne: (p) => ({ ...p, energyBolt: p.energyBolt + 1 }),
  },
  {
    id: 'magicClaw',
    name: 'Magic Claw',
    max: MAGIC_CLAW_LEVELS.length,
    level: (p) => p.magicClaw,
    plusOne: (p) => ({ ...p, magicClaw: p.magicClaw + 1 }),
    learnable: (p) => p.magicClaw > 0 || p.energyBolt >= MAGIC_CLAW_REQUIRES_ENERGY_BOLT,
  },
]

/**
 * De skill van de 1e job van een Bowman die het model kan doorrekenen: Arrow Blow, de aanval van elk schot (1 klap, 1 pijl).
 * De andere vier tellen niet mee, zie BOWMAN_NOT_MODELLED.
 */
export const BOWMAN_MODELLED: readonly Skill[] = [
  {
    id: 'arrowBlow',
    name: 'Arrow Blow',
    max: ARROW_BLOW_LEVELS.length,
    level: (p) => p.arrowBlow,
    plusOne: (p) => ({ ...p, arrowBlow: p.arrowBlow + 1 }),
  },
]

const MODELLED: Partial<Record<Job, readonly Skill[]>> = { warrior: WARRIOR_MODELLED, bowman: BOWMAN_MODELLED, magician: MAGICIAN_MODELLED }

/** De skills die het model voor deze job kan doorrekenen. */
export const skillsOf = (job: Job): readonly Skill[] => MODELLED[job] ?? SKILLS

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

/**
 * Wat het model van een Magician niet kan doorrekenen, met de reden. Magic Guard zet een deel van de schade om in MP-verlies en
 * Magic Armor geeft een buff met WDEF voor een tijd: het profiel kent geen buffs. Improved MP Recovery en Max MP Increase werken op
 * MP-herstel en Max MP, en het profiel kent geen Max MP (en het herstel per tijd hangt aan hoe lang je blijft).
 */
export const MAGICIAN_NOT_MODELLED: readonly string[] = ['Magic Guard', 'Magic Armor', 'Improved MP Recovery', 'Max MP Increase']

/**
 * Wat het model van een Bowman niet kan doorrekenen, met de reden. Double Shot raakt tot 2 monsters met 1 klap per monster,
 * en hoeveel monsters er bij je staan is nergens gemeten; op één monster is hij zwakker dan Arrow Blow en kost hij 2 pijlen
 * en meer MP. Critical Shot geeft een kans op een critical en "extra critical-schade"; de damage-gids noemt geen schade
 * voor een crit. The Eye of Amazon geeft alleen bereik en Focus is een buff (accuracy en evasion) met MP per cast.
 */
export const BOWMAN_NOT_MODELLED: readonly string[] = ['Double Shot', 'Critical Shot', 'The Eye of Amazon', 'Focus']

const NOT_MODELLED_BY_JOB: Partial<Record<Job, readonly string[]>> = { warrior: WARRIOR_NOT_MODELLED, bowman: BOWMAN_NOT_MODELLED, magician: MAGICIAN_NOT_MODELLED }

/** De skills van deze job die het model niet doorrekent. */
export const notModelled = (job: Job): readonly string[] => NOT_MODELLED_BY_JOB[job] ?? NOT_MODELLED

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
    .filter((s) => s.level(profile) < s.max && (s.learnable?.(profile) ?? true))
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
