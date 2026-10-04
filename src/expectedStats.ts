// De waarde die een stat volgens de formules zou moeten hebben, zoals de equipment-kaart de stat uit de database
// toont. Puur, zonder UI-import. Wijkt je spel af (een item met accuracy, een buff), dan corrigeer je het getal en
// toont de kaart de verwachting doorgestreept ernaast. Alleen voor een Thief: van andere jobs kent de app de
// formules nog niet (ook de Warrior niet: zijn accuracy- en avoid-formule staan hier niet in).
import { baseAccuracy, baseAvoid, NIMBLE_BODY } from './data/thief'
import type { Job } from './job'
import type { ProfileDraft, ProfileKey } from './profile'

/** Een invulveld als geheel getal, of null. */
const wholeOf = (text: string): number | null => {
  const t = text.trim()
  const n = t === '' ? NaN : Number(t)
  return Number.isInteger(n) ? n : null
}

/**
 * De verwachte waarde van een stat uit de rest van het profiel, of undefined als de app er geen formule voor heeft
 * of een benodigd veld geen geheel getal is. Accuracy: het stat-deel uit DEX, level en LUK (thief.ts) plus Nimble
 * Body, want accuracy in het profiel is het totaal uit je statvenster. Avoid: het stat-deel uit DEX en LUK plus Nimble
 * Body, op dezelfde manier.
 */
export function expectedStat(key: ProfileKey, draft: ProfileDraft, job: Job): number | undefined {
  if (job !== 'thief') return undefined
  const level = wholeOf(draft.level)
  const dex = wholeOf(draft.dex)
  const luk = wholeOf(draft.luk)
  const nimbleBody = wholeOf(draft.nimbleBody) ?? 0
  if (level === null || dex === null || luk === null) return undefined
  if (key === 'accuracy') return baseAccuracy(dex, level, luk) + nimbleBody * NIMBLE_BODY.accuracyPerLevel
  if (key === 'avoid') return baseAvoid(dex, luk) + nimbleBody * NIMBLE_BODY.avoidPerLevel
  return undefined
}
