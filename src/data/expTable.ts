// De EXP die je nodig hebt van level N naar N+1: alleen de levels van het levelplan (lv 10–20), niet
// de hele tabel (zie .claude/rules/this-repo.md). Opgehaald bij NiaMeowDB (meowdb.com); de pagina
// noemt lv 1–49 bevestigd in het huidige spel.
import type { Source } from './types'

export const EXP_TABLE_SOURCE: Source = {
  url: 'https://meowdb.com/msclassic/guides/exp-table-level-1-to-100',
  retrieved: '2026-10-03',
}

/** Het eerste level in de tabel; de waarden hieronder lopen per level op vanaf hier. */
export const FIRST_LEVEL = 10

/** EXP van level N naar N+1, voor N = 10 tot en met 20. */
const EXP_TO_NEXT: readonly number[] = [1_716, 2_360, 3_216, 4_200, 5_460, 7_050, 8_840, 11_040, 13_716, 16_680, 20_216]

/** De levels waarvoor de tabel een waarde heeft, laag naar hoog. */
export const EXP_TABLE_LEVELS: readonly number[] = EXP_TO_NEXT.map((_, i) => FIRST_LEVEL + i)

/** EXP van dit level naar het volgende, of undefined als dat level niet in de tabel staat. */
export function expToNextLevel(level: number): number | undefined {
  const i = level - FIRST_LEVEL
  return Number.isInteger(level) && i >= 0 && i < EXP_TO_NEXT.length ? EXP_TO_NEXT[i] : undefined
}
