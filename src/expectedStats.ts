// De waarde die een stat volgens de formules zou moeten hebben, zoals de equipment-kaart de stat uit de database
// toont. Puur, zonder UI-import. Wijkt je spel af (een item met accuracy, een buff), dan corrigeer je het getal en
// toont de kaart de verwachting doorgestreept ernaast. Voor elke job die de app doorrekent (Thief, Warrior, Bowman en Magician).
// De weapon multiplier van een Warrior heeft geen verwachting: die komt uit het gekozen wapen, en
// de kaart noemt hem per soort wapen (issue #77).
import { BOWMAN_ACCURACY_SOURCE, bowmanAccuracy } from './data/bowman'
import { MAGICIAN_ACCURACY_SOURCE, magicianAccuracy } from './data/magician'
import { ACCURACY_SOURCE, baseAccuracy, baseAvoid, DAMAGE_FORMULA_SOURCE, NIMBLE_BODY } from './data/thief'
import type { Source } from './data/types'
import { PRECISE_STRIKES_LEVELS, WARRIOR_ACCURACY_SOURCE, warriorAccuracy } from './data/warrior'
import type { Job } from './job'
import { draftStatTotal, type ProfileDraft, type ProfileKey } from './profile'

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
 * en LUK (Thief: thief.ts, Warrior: warrior.ts) of uit INT, level en LUK (Magician: magician.ts) plus de accuracy uit de passief van je job
 * (Nimble Body of Precise Strikes; de Magician heeft er in de 1e job geen). Avoid: het stat-deel uit DEX en LUK, voor elke job hetzelfde, plus Nimble Body bij een Thief.
 */
export function expectedStat(key: ProfileKey, draft: ProfileDraft, job: Job): number | undefined {
  return statBreakdown(key, draft, job)?.total
}

/** Eén deel van een stat in de opbouw achter het vraagteken: wat het is, eventueel de formule met jouw getallen, en wat het oplevert. */
export type BreakdownPart = { label: string; detail?: string; value: number }

/** De opbouw van een verwachte stat: de delen, die samen precies `expectedStat` geven. */
export type StatBreakdown = { parts: readonly BreakdownPart[]; total: number }

/**
 * Waar de formule van een stat vandaan komt (Dave, 8 oktober 2026): voor het i-knopje achter Accuracy en Evasion in je profiel. Accuracy per job
 * (de bronnen bij de functies in data/), Avoid voor elke job uit de uitleg van de damage-formule; undefined voor een stat zonder formule.
 */
export function statFormulaSource(key: ProfileKey, job: Job): Source | undefined {
  if (key === 'avoid') return DAMAGE_FORMULA_SOURCE
  if (key !== 'accuracy') return undefined
  return { thief: ACCURACY_SOURCE, warrior: WARRIOR_ACCURACY_SOURCE, bowman: BOWMAN_ACCURACY_SOURCE, magician: MAGICIAN_ACCURACY_SOURCE }[job]
}

/** Het stat-deel van de accuracy per job: de hoofdstat en hoe de som eindigt (de bronnen staan bij de functies in data/). */
const ACCURACY_TAIL: Record<Job, { stat: 'DEX' | 'INT'; tail: string; of: (main: number, level: number, luk: number) => number }> = {
  thief: { stat: 'DEX', tail: '× 0,25 + 15', of: baseAccuracy },
  warrior: { stat: 'DEX', tail: '÷ 2,5 + 10', of: warriorAccuracy },
  bowman: { stat: 'DEX', tail: '÷ 4,8 + 20', of: bowmanAccuracy },
  magician: { stat: 'INT', tail: '÷ 5,1 + 20', of: magicianAccuracy },
}

/**
 * Hoe de app een stat opbouwt (Dave, 7 oktober 2026): het vraagteken achter Accuracy en Evasion toont dit. Undefined als de
 * app er geen formule voor heeft of een benodigd veld geen geheel getal is, net als `expectedStat`, die hier het totaal van is.
 * Accuracy: het stat-deel (naar beneden afgerond) plus de passief van je job. Avoid: LUK ÷ 3 en DEX ÷ 6 (elk naar beneden
 * afgerond) plus 5, en Nimble Body bij een Thief. Een skill die niet geleerd is, staat er niet in.
 */
export function statBreakdown(key: ProfileKey, draft: ProfileDraft, job: Job): StatBreakdown | undefined {
  if (key !== 'accuracy' && key !== 'avoid') return undefined
  const level = wholeOf(draft.level)
  // De formules rekenen met je totale stats: base AP plus wat je items geven.
  const dex = draftStatTotal(draft, 'dex')
  const luk = draftStatTotal(draft, 'luk')
  // Een Magician rekent ook INT mee; zonder INT heeft hij geen verwachting, ook niet voor avoid.
  const int = draftStatTotal(draft, 'int')
  if (level === null || dex === null || luk === null || (job === 'magician' && int === null)) return undefined
  const parts: BreakdownPart[] = []
  if (key === 'accuracy') {
    // De Bowman heeft in de 1e job geen accuracy-skill (Focus is een buff en telt niet mee), de Magician ook niet: alleen het stat-deel.
    const acc = ACCURACY_TAIL[job]
    const main = job === 'magician' ? int! : dex
    parts.push({ label: 'Stats', detail: `(1,2 × ${acc.stat} ${main} + 2 × level ${level} + 0,6 × LUK ${luk}) ${acc.tail}, naar beneden afgerond`, value: acc.of(main, level, luk) })
  } else {
    parts.push({ label: `LUK ${luk} ÷ 3`, detail: 'naar beneden afgerond', value: Math.floor(luk / 3) })
    parts.push({ label: `DEX ${dex} ÷ 6`, detail: 'naar beneden afgerond', value: Math.floor(dex / 6) })
    parts.push({ label: 'Basis', value: baseAvoid(dex, luk) - Math.floor(luk / 3) - Math.floor(dex / 6) })
  }
  if (job === 'thief') {
    const nimbleBody = wholeOf(draft.nimbleBody) ?? 0
    const per = key === 'accuracy' ? NIMBLE_BODY.accuracyPerLevel : NIMBLE_BODY.avoidPerLevel
    if (nimbleBody > 0) parts.push({ label: `Nimble Body (level ${nimbleBody})`, value: nimbleBody * per })
  }
  if (job === 'warrior' && key === 'accuracy') {
    const precise = wholeOf(draft.preciseStrikes) ?? 0
    const value = preciseStrikesAccuracy(precise)
    if (value > 0) parts.push({ label: `Precise Strikes (level ${precise})`, value })
  }
  return { parts, total: parts.reduce((sum, p) => sum + p.value, 0) }
}
