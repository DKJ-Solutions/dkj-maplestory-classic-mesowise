// De skills die een Thief of Warrior kan leren tot de 2e job: de drie van de Beginner en de zes van de 1e job,
// elk met het hoogste skill-level. Alleen namen en maxima, voor de sectie "Skillpoints"; wat een
// skill doet, staat in thief.ts voor de skills die het model doorrekent.
// Opgehaald bij NiaMeowDB (meowdb.com) op de datum hieronder; de maxima staan zowel op de klassenpagina
// als op de skillpagina's.
import { IMPROVED_HP_RECOVERY, IRON_BODY_LEVELS, MAX_HP_INCREASE, POWER_STRIKE_LEVELS, PRECISE_STRIKES_LEVELS, SLASH_BLAST_LEVELS } from './warrior'
import { ENERGY_BOLT_LEVELS, IMPROVED_MP_RECOVERY, MAGIC_ARMOR_LEVELS, MAGIC_CLAW_LEVELS, MAGIC_GUARD, MAX_MP_INCREASE } from './magician'
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
  | 'energyBolt'
  | 'magicClaw'
  | 'magicGuard'
  | 'magicArmor'
  | 'improvedMpRecovery'
  | 'maxMpIncrease'

export interface SkillInfo {
  key: SkillKey
  name: string
  job: 'Beginner' | 'Thief' | 'Warrior' | 'Magician'
  /** Het hoogste skill-level. */
  max: number
  source: Source
}

const skill = (key: SkillKey, name: string, job: SkillInfo['job'], max: number, path: string): SkillInfo => ({
  key,
  name,
  job,
  max,
  source: { url: `https://meowdb.com/msclassic/skills/${path}`, retrieved: R },
})

/** Alle skills van een Thief tot de 2e job, in de volgorde van de klassenpagina's. */
export const THIEF_SKILLS: readonly SkillInfo[] = [
  skill('threeSnails', 'Three Snails', 'Beginner', 3, 'beginner/three-snails'),
  skill('nimbleFeet', 'Nimble Feet', 'Beginner', 3, 'beginner/nimble-feet'),
  skill('recovery', 'Recovery', 'Beginner', 3, 'beginner/recovery'),
  skill('nimbleBody', 'Nimble Body', 'Thief', 15, 'thief/nimble-body'),
  skill('keenEyes', 'Keen Eyes', 'Thief', 15, 'thief/keen-eyes'),
  skill('doubleStab', 'Double Stab', 'Thief', 20, 'thief/double-stab'),
  skill('disorder', 'Disorder', 'Thief', 20, 'thief/disorder'),
  skill('darkSight', 'Dark Sight', 'Thief', 20, 'thief/dark-sight'),
  skill('luckySeven', 'Lucky Seven', 'Thief', 20, 'thief/lucky-seven'),
]

/**
 * De zes skills van de 1e job van een Warrior, in de volgorde van de klassenpagina. De maxima zijn het aantal
 * levels in de gegevens van het model (data/warrior.ts), dezelfde als op de skillpagina's.
 */
export const WARRIOR_SKILLS: readonly SkillInfo[] = [
  skill('improvedHpRecovery', 'Improved HP Recovery', 'Warrior', IMPROVED_HP_RECOVERY.itemRecoveryPct.length, 'warrior/improved-hp-recovery'),
  skill('maxHpIncrease', 'Max HP Increase', 'Warrior', MAX_HP_INCREASE.maxHpPct.length, 'warrior/max-hp-increase'),
  skill('ironBody', 'Iron Body', 'Warrior', IRON_BODY_LEVELS.length, 'warrior/iron-body'),
  skill('powerStrike', 'Power Strike', 'Warrior', POWER_STRIKE_LEVELS.length, 'warrior/power-strike'),
  skill('slashBlast', 'Slash Blast', 'Warrior', SLASH_BLAST_LEVELS.length, 'warrior/slash-blast'),
  skill('preciseStrikes', 'Precise Strikes', 'Warrior', PRECISE_STRIKES_LEVELS.length, 'warrior/precise-strikes'),
]

/**
 * De zes skills van de 1e job van een Magician, in de volgorde van de skillpagina's. De maxima zijn het aantal
 * levels in de gegevens van het model (data/magician.ts), dezelfde als op de skillpagina's.
 */
export const MAGICIAN_SKILLS: readonly SkillInfo[] = [
  skill('magicGuard', 'Magic Guard', 'Magician', MAGIC_GUARD.mp.length, 'magician/magic-guard'),
  skill('magicArmor', 'Magic Armor', 'Magician', MAGIC_ARMOR_LEVELS.length, 'magician/magic-armor'),
  skill('improvedMpRecovery', 'Improved MP Recovery', 'Magician', IMPROVED_MP_RECOVERY.itemRecoveryPct.length, 'magician/improved-mp-recovery'),
  skill('maxMpIncrease', 'Max MP Increase', 'Magician', MAX_MP_INCREASE.maxMpPct.length, 'magician/max-mp-increase'),
  skill('energyBolt', 'Energy Bolt', 'Magician', ENERGY_BOLT_LEVELS.length, 'magician/energy-bolt'),
  skill('magicClaw', 'Magic Claw', 'Magician', MAGIC_CLAW_LEVELS.length, 'magician/magic-claw'),
]

/** Alle skills van alle jobs die de app kent. */
export const ALL_SKILLS: readonly SkillInfo[] = [...THIEF_SKILLS, ...WARRIOR_SKILLS, ...MAGICIAN_SKILLS]

/** De sleutels van de Thief-skills (Beginner en 1e job). */
export const SKILL_KEYS: readonly SkillKey[] = THIEF_SKILLS.map((s) => s.key)

/** Of een profielveld een skill is (die hoort in "Skillpoints", niet bij je stats). */
export const isSkillKey = (key: string): key is SkillKey => ALL_SKILLS.some((s) => s.key === key)

export const skillInfo = (key: SkillKey): SkillInfo => ALL_SKILLS.find((s) => s.key === key)!
