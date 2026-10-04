// Het voorstel bij een bekende plek: het mob-model met de spelgegevens en het karakterprofiel.
// Een leeg veld bij een bekende plek betekent "neem het voorstel"; wat de speler zelf invult, wint.
import { expPerHour, potionCostPerHour } from './calc/expPerHour'
import { ASSUMPTIONS, bowAttack, characterAttack, estimateMob, meleeAttack, type Assumptions, type Attack, type Character, type MobEstimate, type SkillStats } from './calc/mobModel'
import type { Spot } from './calc/rankSpots'
import { ARROW_BLOW_LEVELS, BOWMAN_DAMAGE, BOWMAN_MASTERY_BASE } from './data/bowman'
import { POTIONS } from './data/spots'
import { LUCKY_SEVEN, LUCKY_SEVEN_LEVELS } from './data/thief'
import type { KnownSpot, Monster, Potion } from './data/types'
import { POWER_STRIKE_LEVELS } from './data/warrior'
import { isComputed } from './job'
import { toCharacter, type Profile } from './profile'
import { parseAmount, toSpot, type SpotDraft } from './spotDraft'

/** Lucky Seven op dit skill-level, of null als hij nog niet geleerd is (level 0). */
export function luckySevenAt(level: number): SkillStats | null {
  if (level < 1) return null
  return LUCKY_SEVEN_LEVELS[Math.min(level, LUCKY_SEVEN_LEVELS.length) - 1] ?? null
}

/** Power Strike op dit skill-level, of null als hij nog niet geleerd is (level 0): dan telt de gewone aanval. */
export function powerStrikeAt(level: number): SkillStats | null {
  if (level < 1) return null
  return POWER_STRIKE_LEVELS[Math.min(level, POWER_STRIKE_LEVELS.length) - 1] ?? null
}

/** Arrow Blow op dit skill-level, of null als hij nog niet geleerd is (level 0): dan telt het gewone schot. */
export function arrowBlowAt(level: number): SkillStats | null {
  if (level < 1) return null
  return ARROW_BLOW_LEVELS[Math.min(level, ARROW_BLOW_LEVELS.length) - 1] ?? null
}

/** De weapon multiplier van een schot en de basis-mastery van een Bowman, uit de damage-gids (data/bowman.ts). */
const BOW = { weaponMult: BOWMAN_DAMAGE.shootMultiplier, mastery: BOWMAN_MASTERY_BASE } as const

/**
 * De aanval van dit profiel. Een Thief gooit Lucky Seven (of de gewone claw-aanval); een Warrior slaat met
 * Power Strike op het gezette level, of zonder punten met de gewone aanval; een Bowman schiet Arrow Blow op het
 * gezette level, of zonder punten het gewone schot. Slash Blast en Double Shot zijn bewust niet meegenomen: ze raken
 * tot 4 en tot 2 monsters, en hoeveel er in de buurt staan is niet bekend (zie skillPoint.ts).
 */
function attackOf(profile: Profile, character: Character, basic = false): Attack {
  switch (profile.job) {
    case 'warrior':
      return meleeAttack(character, profile.weaponMult, basic ? null : powerStrikeAt(profile.powerStrike))
    case 'bowman':
      return bowAttack(character, BOW, basic ? null : arrowBlowAt(profile.arrowBlow))
    default:
      return characterAttack(character, basic ? null : luckySevenAt(profile.luckySeven), LUCKY_SEVEN)
  }
}

/**
 * De Attack uit het statvenster (issue #108): de laagste en hoogste schade van één gewone aanval, uit je ability points
 * en je weapon attack, zonder skill en vóór de verdediging van het monster. Bron: de damage-gids van MeowDB
 * (meowdb.com/msclassic/guides/explaining-the-damage-formula, "Character-window damage range"), die beide afrondt
 * naar beneden. Null voor een job die de app nog niet doorrekent: daar kent hij de formule niet.
 */
export function statWindowRange(profile: Profile): { min: number; max: number } | null {
  if (!isComputed(profile.job)) return null
  const a = attackOf(profile, toCharacter(profile), true)
  return { min: Math.trunc(a.min), max: Math.trunc(a.max) }
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
  /** Wat het herladen van één ster kost: die van je gekozen stars, of de prijs van één pijl voor een Bowman; een Warrior gooit niets, dus 0. */
  rechargePerStar: number
}

/** Elk monster van de plek doorgerekend, van meeste naar minste EXP per uur. */
export function suggestMonsters(profile: Profile, spot: KnownSpot, assumptions: Assumptions = ASSUMPTIONS): MonsterSuggestion[] {
  const character = toCharacter(profile)
  const attack = attackOf(profile, character)
  const rechargePerStar = profile.job === 'warrior' ? 0 : profile.starRecharge
  return spot.monsters
    .map((monster) => {
      const estimate = estimateMob(character, attack, monster, assumptions)
      return { monster, estimate, expPerHour: expPerHour(monster.expPerKill, estimate.killsPerHour), rechargePerStar }
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
  /** Meso per uur aan het herladen van stars of het kopen van pijlen (0 voor een Warrior). */
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
    ammo: killsPerHour * s.estimate.starsPerKill * s.rechargePerStar,
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
