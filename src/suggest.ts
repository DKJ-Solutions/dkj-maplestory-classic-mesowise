// Het voorstel bij een bekende plek: het mob-model met de spelgegevens en het karakterprofiel.
// Een leeg veld bij een bekende plek betekent "neem het voorstel"; wat de speler zelf invult, wint.
import { expPerHour, potionCostPerHour } from './calc/expPerHour'
import { ASSUMPTIONS, characterAttack, estimateMob, type Assumptions, type MobEstimate, type SkillStats } from './calc/mobModel'
import type { Spot } from './calc/rankSpots'
import { POTIONS } from './data/spots'
import { LUCKY_SEVEN, LUCKY_SEVEN_LEVELS, SUBI } from './data/thief'
import type { KnownSpot, Monster, Potion } from './data/types'
import { toCharacter, type Profile } from './profile'
import { parseAmount, toSpot, type SpotDraft } from './spotDraft'

/** Lucky Seven op dit skill-level, of null als hij nog niet geleerd is (level 0). */
export function luckySevenAt(level: number): SkillStats | null {
  if (level < 1) return null
  return LUCKY_SEVEN_LEVELS[Math.min(level, LUCKY_SEVEN_LEVELS.length) - 1] ?? null
}

/** De potion die per punt herstel het minst kost (Orange bij HP, Blue bij MP). */
function cheapest(kind: 'hp' | 'mp'): Potion {
  const options = POTIONS.filter((p) => p[kind] > 0)
  return options.reduce((best, p) => (p.price / p[kind] < best.price / best[kind] ? p : best))
}

export const HP_POTION = cheapest('hp')
export const MP_POTION = cheapest('mp')

/** Het voorstel voor één monster: wat het model verwacht, en de EXP per uur die daaruit volgt. */
export interface MonsterSuggestion {
  monster: Monster
  estimate: MobEstimate
  expPerHour: number
}

/** Elk monster van de plek doorgerekend, van meeste naar minste EXP per uur. */
export function suggestMonsters(profile: Profile, spot: KnownSpot, assumptions: Assumptions = ASSUMPTIONS): MonsterSuggestion[] {
  const character = toCharacter(profile)
  const attack = characterAttack(character, luckySevenAt(profile.luckySeven), LUCKY_SEVEN)
  return spot.monsters
    .map((monster) => {
      const estimate = estimateMob(character, attack, monster, assumptions)
      return { monster, estimate, expPerHour: expPerHour(monster.expPerKill, estimate.killsPerHour) }
    })
    .sort((a, b) => b.expPerHour - a.expPerHour)
}

/** Het gekozen monster, of anders het monster met de meeste EXP per uur. */
export function pickMonster(suggestions: readonly MonsterSuggestion[], name: string | undefined): MonsterSuggestion | undefined {
  return suggestions.find((s) => s.monster.name === name) ?? suggestions[0]
}

/** Wat een uur op dit monster oplevert en kost, bij een gegeven aantal kills per uur. */
export interface HourPlan {
  killsPerHour: number
  expPerHour: number
  hpPotionsPerHour: number
  mpPotionsPerHour: number
  /** Meso per uur aan potions. */
  potions: number
  /** Meso per uur aan het herladen van stars. */
  ammo: number
}

/** Het uur uitgerekend; het verbruik per kill schaalt mee met de kills per uur. */
export function hourPlan(s: MonsterSuggestion, killsPerHour: number): HourPlan {
  const hpPotionsPerHour = (killsPerHour * s.estimate.hpLossPerKill) / HP_POTION.hp
  const mpPotionsPerHour = (killsPerHour * s.estimate.mpPerKill) / MP_POTION.mp
  return {
    killsPerHour,
    expPerHour: expPerHour(s.monster.expPerKill, killsPerHour),
    hpPotionsPerHour,
    mpPotionsPerHour,
    potions: potionCostPerHour(hpPotionsPerHour, HP_POTION.price) + potionCostPerHour(mpPotionsPerHour, MP_POTION.price),
    ammo: killsPerHour * s.estimate.starsPerKill * SUBI.rechargePerStar,
  }
}

/** Een leeg veld neemt het voorstel; anders telt wat er staat (ook als het ongeldig is). */
const orSuggestion = (text: string | undefined, suggestion: number) =>
  text === undefined || text.trim() === '' ? suggestion : parseAmount(text)

/**
 * Een plek als getallen. Bij een bekende plek met een geldig profiel vullen de lege velden zich
 * met het voorstel; bij een eigen plek (of zonder profiel) is dit gewoon toSpot.
 */
export function resolveSpot(
  d: SpotDraft,
  known: KnownSpot | undefined,
  profile: Profile | null,
  assumptions: Assumptions = ASSUMPTIONS,
): Spot {
  const spot = toSpot(d)
  if (!known || !profile) return spot
  const s = pickMonster(suggestMonsters(profile, known, assumptions), d.monster)
  if (!s) return spot
  const kills = orSuggestion(d.kills, s.estimate.killsPerHour)
  // Onzinnige kills per uur: er is geen voorstel, dus alleen wat de speler zelf invulde telt.
  const plan = Number.isFinite(kills) && kills >= 0 ? hourPlan(s, kills) : null
  return {
    ...spot,
    expPerHour: orSuggestion(d.expPerHour, plan?.expPerHour ?? NaN),
    cost: {
      potions: orSuggestion(d.potions, plan?.potions ?? NaN),
      ammo: orSuggestion(d.ammo, plan?.ammo ?? NaN),
      travel: spot.cost.travel,
    },
  }
}

/** Of de EXP per uur van deze plek uit het voorstel komt (en dus een schatting is). */
export function isEstimated(d: SpotDraft, known: KnownSpot | undefined, profile: Profile | null): boolean {
  return Boolean(known && profile && d.expPerHour.trim() === '')
}
