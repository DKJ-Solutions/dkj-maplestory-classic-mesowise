// De skills die een Thief, Warrior of Bowman kan leren tot de 2e job: de drie van de Beginner en de zes van de 1e job,
// elk met het hoogste skill-level en de MP die hij per keer kost (issue #83). Alleen namen, maxima en MP, voor de
// sectie "Skillpoints"; wat een skill doet, staat in thief.ts voor de skills die het model doorrekent.
// Opgehaald bij NiaMeowDB (meowdb.com) op de datum hieronder; de maxima staan zowel op de klassenpagina
// als op de skillpagina's, de MP per level in de tabel op elke skillpagina (daar als "MP -8").
import { ARROW_BLOW_LEVELS, CRITICAL_SHOT, DOUBLE_SHOT_LEVELS, EYE_OF_AMAZON, FOCUS_LEVELS } from './bowman'
import { LUCKY_SEVEN_LEVELS } from './thief'
import { IMPROVED_HP_RECOVERY, IRON_BODY_LEVELS, MAX_HP_INCREASE, POWER_STRIKE_LEVELS, PRECISE_STRIKES_LEVELS, SLASH_BLAST_LEVELS } from './warrior'
import type { Source } from './types'

const R = '2026-10-04'

/** De klassenpagina's: "1st Job (Thief) - 6 Skills" en de drie Beginner-skills, met hun maximum. */
export const THIEF_CLASS_SOURCE: Source = { url: 'https://meowdb.com/msclassic/classes/thief', retrieved: R }
export const BEGINNER_CLASS_SOURCE: Source = { url: 'https://meowdb.com/msclassic/classes/beginner', retrieved: R }

export type SkillKey =
  | 'threeSnails'
  | 'nimbleFeet'
  | 'recovery'
  | 'nimbleBody'
  | 'keenEyes'
  | 'doubleStab'
  | 'disorder'
  | 'darkSight'
  | 'luckySeven'
  | 'improvedHpRecovery'
  | 'maxHpIncrease'
  | 'ironBody'
  | 'powerStrike'
  | 'slashBlast'
  | 'preciseStrikes'
  | 'arrowBlow'
  | 'doubleShot'
  | 'criticalShot'
  | 'eyeOfAmazon'
  | 'focus'

export interface SkillInfo {
  key: SkillKey
  name: string
  job: 'Beginner' | 'Thief' | 'Warrior' | 'Bowman'
  /** Het hoogste skill-level. */
  max: number
  /** De MP die de skill per keer kost, per skill-level (index 0 is level 1); ontbreekt bij een passieve skill. */
  mp?: readonly number[]
  source: Source
}

const skill = (key: SkillKey, name: string, job: SkillInfo['job'], max: number, path: string, mp?: readonly number[]): SkillInfo => ({
  key,
  name,
  job,
  max,
  ...(mp && { mp }),
  source: { url: `https://meowdb.com/msclassic/skills/${path}`, retrieved: R },
})

// De MP per level van de skills die het model niet doorrekent, uit de tabel op hun skillpagina.
const THREE_SNAILS_MP = [3, 4, 5]
const NIMBLE_FEET_MP = [4, 7, 10]
const RECOVERY_MP = [5, 10, 15]
const DOUBLE_STAB_MP = [8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16]
const DISORDER_MP = [5, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10]
// Level 19 kost 32 en level 20 kost 30 (geen vaste stap): zo staat het op de pagina.
const DARK_SIGHT_MP = [50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 30]

const mpOf = (levels: readonly { mp: number }[]): number[] => levels.map((l) => l.mp)

/** Alle skills van een Thief tot de 2e job, in de volgorde van de klassenpagina's. */
export const THIEF_SKILLS: readonly SkillInfo[] = [
  skill('threeSnails', 'Three Snails', 'Beginner', 3, 'beginner/three-snails', THREE_SNAILS_MP),
  skill('nimbleFeet', 'Nimble Feet', 'Beginner', 3, 'beginner/nimble-feet', NIMBLE_FEET_MP),
  skill('recovery', 'Recovery', 'Beginner', 3, 'beginner/recovery', RECOVERY_MP),
  skill('nimbleBody', 'Nimble Body', 'Thief', 15, 'thief/nimble-body'),
  skill('keenEyes', 'Keen Eyes', 'Thief', 15, 'thief/keen-eyes'),
  skill('doubleStab', 'Double Stab', 'Thief', 20, 'thief/double-stab', DOUBLE_STAB_MP),
  skill('disorder', 'Disorder', 'Thief', 20, 'thief/disorder', DISORDER_MP),
  skill('darkSight', 'Dark Sight', 'Thief', 20, 'thief/dark-sight', DARK_SIGHT_MP),
  skill('luckySeven', 'Lucky Seven', 'Thief', 20, 'thief/lucky-seven', mpOf(LUCKY_SEVEN_LEVELS)),
]

/**
 * De zes skills van de 1e job van een Warrior, in de volgorde van de klassenpagina. De maxima zijn het aantal
 * levels in de gegevens van het model (data/warrior.ts), dezelfde als op de skillpagina's.
 */
export const WARRIOR_SKILLS: readonly SkillInfo[] = [
  skill('improvedHpRecovery', 'Improved HP Recovery', 'Warrior', IMPROVED_HP_RECOVERY.itemRecoveryPct.length, 'warrior/improved-hp-recovery'),
  skill('maxHpIncrease', 'Max HP Increase', 'Warrior', MAX_HP_INCREASE.maxHpPct.length, 'warrior/max-hp-increase'),
  skill('ironBody', 'Iron Body', 'Warrior', IRON_BODY_LEVELS.length, 'warrior/iron-body', mpOf(IRON_BODY_LEVELS)),
  skill('powerStrike', 'Power Strike', 'Warrior', POWER_STRIKE_LEVELS.length, 'warrior/power-strike', mpOf(POWER_STRIKE_LEVELS)),
  skill('slashBlast', 'Slash Blast', 'Warrior', SLASH_BLAST_LEVELS.length, 'warrior/slash-blast', mpOf(SLASH_BLAST_LEVELS)),
  skill('preciseStrikes', 'Precise Strikes', 'Warrior', PRECISE_STRIKES_LEVELS.length, 'warrior/precise-strikes'),
]

/**
 * De vijf skills van de 1e job van een Bowman (Blessing of Amazon bestaat niet op MeowDB, zie bowman.ts). De maxima
 * zijn het aantal levels in de gegevens van het model (data/bowman.ts), dezelfde als op de skillpagina's.
 */
export const BOWMAN_SKILLS: readonly SkillInfo[] = [
  skill('arrowBlow', 'Arrow Blow', 'Bowman', ARROW_BLOW_LEVELS.length, 'bowman/arrow-blow', mpOf(ARROW_BLOW_LEVELS)),
  skill('doubleShot', 'Double Shot', 'Bowman', DOUBLE_SHOT_LEVELS.length, 'bowman/double-shot', mpOf(DOUBLE_SHOT_LEVELS)),
  skill('criticalShot', 'Critical Shot', 'Bowman', CRITICAL_SHOT.critPct.length, 'bowman/critical-shot'),
  skill('eyeOfAmazon', 'The Eye of Amazon', 'Bowman', EYE_OF_AMAZON.range.length, 'bowman/the-eye-of-amazon'),
  skill('focus', 'Focus', 'Bowman', FOCUS_LEVELS.length, 'bowman/focus', mpOf(FOCUS_LEVELS)),
]

/** Alle skills van alle jobs die de app kent. */
export const ALL_SKILLS: readonly SkillInfo[] = [...THIEF_SKILLS, ...WARRIOR_SKILLS, ...BOWMAN_SKILLS]

/** De sleutels van de Thief-skills (Beginner en 1e job). */
export const SKILL_KEYS: readonly SkillKey[] = THIEF_SKILLS.map((s) => s.key)

/** Of een profielveld een skill is (die hoort in "Skillpoints", niet bij je stats). */
export const isSkillKey = (key: string): key is SkillKey => ALL_SKILLS.some((s) => s.key === key)

export const skillInfo = (key: SkillKey): SkillInfo => ALL_SKILLS.find((s) => s.key === key)!

/**
 * De MP die een skill per keer kost op dit level; null bij een passieve skill. Op level 0 die van level 1 (wat
 * je gaat betalen zodra je hem leert), boven het maximum die van het maximum. De sectie "Skillpoints" toont dit.
 */
export const skillMpAt = (s: SkillInfo, level: number): number | null =>
  s.mp ? s.mp[Math.min(Math.max(level, 1), s.mp.length) - 1] : null

/**
 * De MP die je nu per keer betaalt met deze skill: 0 zolang hij niet geleerd is (level 0) of passief is, en anders
 * skillMpAt. Het advies voor je skillpunt rekent hiermee (issue #101: één bron voor de MP van een skill).
 */
export const mpPerUse = (key: SkillKey, level: number): number => (level < 1 ? 0 : (skillMpAt(skillInfo(key), level) ?? 0))
