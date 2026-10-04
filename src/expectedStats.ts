// De waarde die een stat volgens de formules zou moeten hebben, zoals de equipment-kaart de stat uit de database
// toont. Puur, zonder UI-import. Wijkt je spel af (een item met accuracy, een buff), dan corrigeer je het getal en
// toont de kaart de verwachting doorgestreept ernaast. Voor een Thief en een Warrior; van andere jobs kent de app de
// formules nog niet. De weapon multiplier van een Warrior heeft geen verwachting: die komt uit het gekozen wapen, en
// de kaart noemt hem per soort wapen (issue #77).
import { baseAccuracy, baseAvoid, NIMBLE_BODY } from './data/thief'
import { PRECISE_STRIKES_LEVELS, warriorAccuracy } from './data/warrior'
import type { Job } from './job'
import type { ProfileDraft, ProfileKey } from './profile'

/** Een invulveld als geheel getal, of null. */
const wholeOf = (text: string): number | null => {
  const t = text.trim()
  const n = t === '' ? NaN : Number(t)
  return Number.isInteger(n) ? n : null
}

/** De accuracy die Precise Strikes op dit skill-level geeft (0 als hij niet geleerd is). */
const preciseStrikesAccuracy = (level: number): number => PRECISE_STRIKES_LEVELS[level - 1]?.accuracy ?? 0

/**
 * De verwachte waarde van een stat uit de rest van het profiel, of undefined als de app er geen formule voor heeft
 * of een benodigd veld geen geheel getal is. Accuracy is het totaal uit je statvenster: het stat-deel uit DEX, level
 * en LUK (Thief: thief.ts, Warrior: warrior.ts) plus de accuracy uit de passief van je job (Nimble Body of Precise
 * Strikes). Avoid: het stat-deel uit DEX en LUK, voor elke job hetzelfde, plus Nimble Body bij een Thief.
 */
export function expectedStat(key: ProfileKey, draft: ProfileDraft, job: Job): number | undefined {
  if (job !== 'thief' && job !== 'warrior') return undefined
  const level = wholeOf(draft.level)
  const dex = wholeOf(draft.dex)
  const luk = wholeOf(draft.luk)
  if (level === null || dex === null || luk === null) return undefined
  if (job === 'warrior') {
    if (key === 'accuracy') return warriorAccuracy(dex, level, luk) + preciseStrikesAccuracy(wholeOf(draft.preciseStrikes) ?? 0)
    if (key === 'avoid') return baseAvoid(dex, luk)
    return undefined
  }
  const nimbleBody = wholeOf(draft.nimbleBody) ?? 0
  if (key === 'accuracy') return baseAccuracy(dex, level, luk) + nimbleBody * NIMBLE_BODY.accuracyPerLevel
  if (key === 'avoid') return baseAvoid(dex, luk) + nimbleBody * NIMBLE_BODY.avoidPerLevel
  return undefined
}
