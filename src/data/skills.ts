// De skills die een Thief kan leren tot de 2e job: de drie van de Beginner en de zes van de 1e job,
// elk met het hoogste skill-level. Alleen namen en maxima, voor de sectie "Skillpoints"; wat een
// skill doet, staat in thief.ts voor de skills die het model doorrekent.
// Opgehaald bij NiaMeowDB (meowdb.com) op de datum hieronder; de maxima staan zowel op de klassenpagina
// als op de skillpagina's.
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

export interface SkillInfo {
  key: SkillKey
  name: string
  job: 'Beginner' | 'Thief'
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

export const SKILL_KEYS: readonly SkillKey[] = THIEF_SKILLS.map((s) => s.key)

/** Of een profielveld een skill is (die hoort in "Skillpoints", niet bij je stats). */
export const isSkillKey = (key: string): key is SkillKey => (SKILL_KEYS as readonly string[]).includes(key)

export const skillInfo = (key: SkillKey): SkillInfo => THIEF_SKILLS.find((s) => s.key === key)!
