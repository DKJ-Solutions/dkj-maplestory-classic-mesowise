// Het karakter over de horizon van een upgrade (Dave, 7 oktober 2026): "De Total cost van Equip is ook berekend op basis van de Skillpoints
// van een LV 20 thief bijvoorbeeld. Dat bepaalt uiteindelijk ook hoeveel ATT je doet en DEF vangt." Een upgrade telt tot je volgende upgrade,
// en in die levels groeit je karakter: het level zelf (het levelverschil met de mob), Max HP en MP, het level-deel van de accuracy, de AP
// van het level en de skillpunten van het level. Dit rekent dat uit, één keer per horizon en per level onthouden. Puur, zonder UI-import.
//
// Gekozen standaarden (de app toont ze):
// - Per level: applyLevelUp (level +1, Max HP en MP, accuracy van het level); de AP van dat level (apAtLevel) gaan naar de hoofdstat van je job
//   (zoals autoFillAp); de secundaire stat en de eisen van je items groeien hier niet mee. De accuracy en evasion volgen de formules mee
//   (expectedStat); de skillpunten van het level (3 per level, op level 10 vier; skillPointCap) elk in het punt van de winnaar van het
//   skillpuntadvies, zoals cheapestSettings dat doet. Alleen de pot van je 1e job wordt gezet (de Beginner-punten niet).
// - De skillpunten worden altijd geplaatst onder ASSUMPTIONS; de aanname-varianten van een advies hergebruiken diezelfde groei en rekenen
//   er alleen hun eigen EXP per meso op uit.
// - Je potions, geslacht en equipment blijven zoals ze nu zijn; een item dat wordt vergeleken komt als verschil op elk level van de groei
//   (zie growthCosts). Dat is een benadering: de skillpunten worden geplaatst op het profiel zonder het item, ook al kan een ander item
//   een andere skill beter maken. "Met" en "zonder" delen zo dezelfde groei, dus de besparing blijft een eerlijk verschil.
// - Is het profiel na een level niet door te rekenen (het hoogste level, een veld buiten zijn grens), dan houdt de groei daar op en blijven
//   de stats staan zoals ze waren, alleen het level loopt door. Dat gebeurt zonder melding: de groei hergebruikt de laatste goede stats.
// - Alleen wat groeit verandert (zie GROWN); al het andere (wapen, armor, pijlen, dagger, multiplier, potions, geslacht) blijft zoals in het
//   profiel waarmee je begon.
import { applyLevelUp, applySkillPoint } from './levelUp'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { skillPointCap } from './data/skillPoints'
import { apAtLevel } from './data/thief'
import { bestExpPerMeso } from './bestExpPerMeso'
import { expectedStat } from './expectedStats'
import { horizonCost } from './horizonCost'
import { isSkillKey } from './data/skills'
import { DRAFT_FIELDS, EXTRA_KEY, mainStatKey, parseProfile, PROFILE_FIELDS, skillPointsLeft, type Profile, type ProfileDraft, type ProfileKey } from './profile'
import { skillPointWinner } from './skillPoint'
import type { SpotDraft } from './spotDraft'

/** Het profiel op een level van de horizon: het level van nu of later. */
export type Growth = (level: number) => Profile

const STAT_MAX = PROFILE_FIELDS.find((f) => f.key === 'luk')!.max
const STATS = ['str', 'dex', 'int', 'luk'] as const

/** Het profiel terug als concept: de stats van het profiel zijn totalen, in het concept staat de base AP los van de extra AP van items. */
function draftOf(p: Profile): ProfileDraft {
  const d = Object.fromEntries(DRAFT_FIELDS.map((f) => [f.key, String(p[f.key])])) as ProfileDraft
  for (const s of STATS) d[s] = String(p[s] - p[EXTRA_KEY[s]])
  return d
}

/** De velden die over de horizon veranderen: level, HP, MP, de stats, accuracy, evasion en de skills. */
const GROWN = (key: ProfileKey): boolean => isSkillKey(key) || key === 'level' || key === 'hp' || key === 'mp' || key === 'accuracy' || key === 'avoid' || (STATS as readonly string[]).includes(key)

/**
 * Het concept als profiel: wat groeit komt uit het concept, al het andere blijft zoals in `from` (de round-trip via het concept zou
 * bijvoorbeeld de pijlen van een Bowman of de potions kwijtraken). Null als het concept niet klopt.
 */
function profileOf(d: ProfileDraft, from: Profile): Profile | null {
  const parsed = parseProfile(d, from.job, from.gender ?? null)
  if (!('profile' in parsed)) return null
  const out: Profile = { ...from }
  for (const key of DRAFT_FIELDS.map((f) => f.key)) if (GROWN(key)) out[key] = parsed.profile[key]
  return out
}

/** Het profiel een level verder (zie de kop); null als dat niet kan. */
function growOneLevel(drafts: readonly SpotDraft[], p: Profile): Profile | null {
  const { job } = p
  const before = applyLevelUp(draftOf(p), job)
  if (before.level === String(p.level)) return null
  // De AP van het nieuwe level in de hoofdstat; accuracy en evasion gaan mee met wat de formules van die stat zeggen.
  const main = mainStatKey(job)
  const gain = apAtLevel(p.level + 1) - apAtLevel(p.level)
  let draft: ProfileDraft = { ...before, [main]: String(Math.min(Number(before[main]) + gain, STAT_MAX)) }
  for (const key of ['accuracy', 'avoid'] as const) {
    const was = expectedStat(key, before, job)
    const now = expectedStat(key, draft, job)
    if (was !== undefined && now !== undefined) draft = { ...draft, [key]: String(Number(draft[key]) + now - was) }
  }
  let grown = profileOf(draft, p)
  // De skillpunten die dit level geeft (3, op level 10 er 4), elk in de skill die het meeste bespaart (skillPointWinner is de winnaar van
  // skillPointAdvice). Punten die je nu nog open hebt staan, blijven open: dat is jouw keuze, niet die van de groei.
  const earned = skillPointCap(p.level + 1, 'job') - skillPointCap(p.level, 'job')
  for (let i = 0; i < earned && grown && skillPointsLeft(grown, 'job') > 0; i++) {
    const winner = skillPointWinner(drafts, grown)
    if (winner === null) break
    const next = applySkillPoint(draft, winner, job)
    if (next === draft) break
    draft = next
    grown = profileOf(draft, p)
  }
  return grown
}

const cache = new WeakMap<readonly SpotDraft[], Map<string, Growth>>()
/** Hoeveel profielen per plekkenlijst onthouden blijven: tijdens het typen komt er steeds een nieuw profiel, dus de oudste gaan eruit. */
const MAX_KEPT = 8

/**
 * De groei van dit profiel: het profiel op elk level van het jouwe tot het eind van de EXP-tabel, per level onthouden. Dezelfde plekken
 * en hetzelfde profiel geven dezelfde groei terug (een ronde van Cheapest vraagt hem voor claw, armor en star).
 */
export function growthOf(drafts: readonly SpotDraft[], profile: Profile): Growth {
  const key = JSON.stringify(profile)
  const known = cache.get(drafts) ?? new Map<string, Growth>()
  cache.set(drafts, known)
  const hit = known.get(key)
  if (hit) return hit
  const steps: Profile[] = [profile]
  let stuck = false
  const growth: Growth = (level) => {
    while (!stuck && profile.level + steps.length - 1 < level) {
      const next = growOneLevel(drafts, steps[steps.length - 1])
      if (next === null) stuck = true
      else steps.push(next)
    }
    const at = steps[level - profile.level]
    return at ?? { ...steps[steps.length - 1], level: Math.max(level, profile.level) }
  }
  known.set(key, growth)
  if (known.size > MAX_KEPT) known.delete(known.keys().next().value!)
  return growth
}

/** Wat een upgrade met het profiel doet (een claw, een stuk armor, een star); zonder verandering is het "zonder". */
export type UpgradeChange = (p: Profile) => Profile

/**
 * De mesokosten van een horizon bij deze groei, zonder en met een upgrade, onder één aanname. Het verschil van de upgrade ligt op elk level
 * over de groei van het profiel zonder hem (zie de kop). Null als een level niet uit te rekenen of onhaalbaar is (net als bij de upgrades zonder groei).
 */
export function growthCosts(drafts: readonly SpotDraft[], grow: Growth, a: Assumptions = ASSUMPTIONS) {
  const perLevel = new Map<number, number | undefined>()
  const without = (level: number): number | undefined => {
    if (!perLevel.has(level)) perLevel.set(level, bestExpPerMeso(drafts, grow(level), a))
    return perLevel.get(level)
  }
  return {
    without: (from: number, to: number): number | null => horizonCost(from, to, without) ?? null,
    withIt: (from: number, to: number, change: UpgradeChange): number | null => horizonCost(from, to, (level) => bestExpPerMeso(drafts, change(grow(level)), a)) ?? null,
  }
}
