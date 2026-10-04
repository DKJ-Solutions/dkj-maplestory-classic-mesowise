// Hoeveel skillpunten je op een level hebt (issue #136): je kunt niet meer punten zetten dan je tot nu toe
// verdiende, ook al heeft elke skill zijn eigen maximum. Opgehaald bij NiaMeowDB (meowdb.com) op de datum
// hieronder. Er zijn twee aparte potten: de Beginner-punten gaan naar Beginner-skills, de punten van de
// 1e job naar de skills van de 1e job.
import type { SkillInfo } from './skills'
import type { Source } from './types'

const R = '2026-10-04'

/** De beginnersgids: "You earn 9 SP by the time you hit level 10 (1 per level-up, 9 level-ups from 1 to 10)." */
export const BEGINNER_SP_SOURCE: Source = {
  url: 'https://meowdb.com/msclassic/guides/beginners-guide-first-steps-in-maple-world',
  retrieved: R,
}

/** De woordenlijst: "3 SP per level, plus 1 bonus SP at lv 10 advancement" en "exactly 61 SP by level 30". */
export const JOB_SP_SOURCE: Source = { url: 'https://meowdb.com/msclassic/guides/maplestory-classic-glossary', retrieved: R }

/** De twee potten: de Beginner-punten en de punten van de 1e job. */
export type SkillPool = 'beginner' | 'job'

/** In welke pot de punten van een skill komen te staan. */
export const skillPoolOf = (job: SkillInfo['job']): SkillPool => (job === 'Beginner' ? 'beginner' : 'job')

/** De pot zoals de speler hem noemt, voor in een melding. */
export const SKILL_POOL_NAME: Record<SkillPool, string> = { beginner: 'Beginner-skills', job: 'skills van je 1e job' }

/** Het level waarop elke klas zijn 1e job krijgt (in het spel voor elke klas, ook de Magician). */
const FIRST_JOB_LEVEL = 10

/**
 * Hoeveel skillpunten je in totaal hebt verdiend op dit level, per pot. Beginner: 1 per level-up tot level 10 (dus
 * 9). 1e job: 0 tot level 10, daarna 1 bonuspunt bij de 1e jobwissel en 3 per level (61 op level 30). De app gaat
 * ervan uit dat je op level 10 van job wisselt; een latere jobwissel kent de app niet.
 */
export function skillPointCap(level: number, pool: SkillPool): number {
  if (pool === 'beginner') return Math.max(0, Math.min(level - 1, FIRST_JOB_LEVEL - 1))
  return level < FIRST_JOB_LEVEL ? 0 : 1 + 3 * (level - FIRST_JOB_LEVEL)
}
