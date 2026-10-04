// Het voorstel bij een bekende plek: het mob-model met de spelgegevens en het karakterprofiel.
// Een leeg veld bij een bekende plek betekent "neem het voorstel"; wat de speler zelf invult, wint.
import { expPerHour, potionCostPerHour } from './calc/expPerHour'
import { ASSUMPTIONS, characterAttack, estimateMob, meleeAttack, spellAttack, type Assumptions, type Attack, type Character, type MobEstimate, type SkillStats } from './calc/mobModel'
import type { Spot } from './calc/rankSpots'
import { ENERGY_BOLT_LEVELS, MAGIC_CLAW_HITS, MAGIC_CLAW_LEVELS, MAGIC_CLAW_REQUIRES_ENERGY_BOLT, MAGICIAN_MP_POTIONS } from './data/magician'
import { POTIONS } from './data/spots'
import { LUCKY_SEVEN, LUCKY_SEVEN_LEVELS } from './data/thief'
import type { KnownSpot, Monster, Potion, SpellLevel } from './data/types'
import { POWER_STRIKE_LEVELS } from './data/warrior'
import type { Job } from './job'
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

/** Een spreuk op dit skill-level, of null als hij nog niet geleerd is (level 0); boven het maximum telt het maximum. */
const spellAt = (levels: readonly SpellLevel[], level: number): SpellLevel | null => (level < 1 ? null : (levels[Math.min(level, levels.length) - 1] ?? null))

/** Energy Bolt op dit skill-level, of null als hij nog niet geleerd is (level 0). */
export const energyBoltAt = (level: number): SpellLevel | null => spellAt(ENERGY_BOLT_LEVELS, level)

/** Magic Claw op dit skill-level, of null als hij nog niet geleerd is (level 0). */
export const magicClawAt = (level: number): SpellLevel | null => spellAt(MAGIC_CLAW_LEVELS, level)

/**
 * De spreuken die een Magician kan casten (Energy Bolt, 1 klap; Magic Claw, 2 klappen); een cast duurt bij beide 810 ms.
 * suggestMonsters kiest per monster de spreuk met de meeste EXP per meso aan potions. Een Magician zonder spreuk heeft geen
 * aanval die de app kent (de gewone wand-aanval staat niet in de gegevens): geen enkele.
 */
function magicianAttacks(profile: Profile, character: Character): Attack[] {
  const spells: Attack[] = []
  const bolt = energyBoltAt(profile.energyBolt)
  if (bolt) spells.push(spellAttack(character, bolt, 1))
  // Magic Claw kun je pas leren met Energy Bolt op het vereiste level; een ingevuld level zonder dat telt niet.
  const claw = profile.energyBolt >= MAGIC_CLAW_REQUIRES_ENERGY_BOLT ? magicClawAt(profile.magicClaw) : null
  if (claw) spells.push(spellAttack(character, claw, MAGIC_CLAW_HITS))
  return spells
}

/**
 * De aanvallen van dit profiel. Een Thief gooit Lucky Seven (of de gewone claw-aanval); een Warrior slaat met
 * Power Strike op het gezette level, of zonder punten met de gewone aanval; een Magician kiest uit zijn spreuken
 * (geen spreuk: geen aanval, dan is er geen voorstel). Slash Blast is bewust niet
 * meegenomen: hij raakt tot 4 monsters, en hoeveel er in de buurt staan is niet bekend (zie skillPoint.ts).
 */
function attacksOf(profile: Profile, character: Character): Attack[] {
  if (profile.job === 'magician') return magicianAttacks(profile, character)
  return [
    profile.job === 'warrior'
      ? meleeAttack(character, profile.weaponMult, powerStrikeAt(profile.powerStrike))
      : characterAttack(character, luckySevenAt(profile.luckySeven), LUCKY_SEVEN),
  ]
}

/** De potion die per punt herstel het minst kost (Orange Potion bij HP, Blue Potion bij MP); bij gelijke prijs de eerste. */
function cheapest(kind: 'hp' | 'mp', from: readonly Potion[] = POTIONS): Potion {
  const options = from.filter((p) => p[kind] > 0)
  return options.reduce((best, p) => (p.price / p[kind] < best.price / best[kind] ? p : best))
}

export const HP_POTION = cheapest('hp')
export const MP_POTION = cheapest('mp')

/**
 * De MP-potion van een Magician: de goedkoopste per MP van de Orange en de Lemon (data/magician.ts, 1 meso per MP)
 * en de Blue Potion. Orange en Lemon kosten evenveel per MP en zijn goedkoper dan de Blue (1,1): bij gelijkspel de Orange.
 */
export const MAGICIAN_MP_POTION = cheapest('mp', [...MAGICIAN_MP_POTIONS, ...POTIONS])

/** De potion die deze job voor MP gebruikt. */
export const mpPotionFor = (job: Job): Potion => (job === 'magician' ? MAGICIAN_MP_POTION : MP_POTION)

/** Het voorstel voor één monster: wat het model verwacht, en de EXP per uur die daaruit volgt. */
export interface MonsterSuggestion {
  monster: Monster
  estimate: MobEstimate
  expPerHour: number
  /** Wat het herladen van één ster kost: die van je gekozen stars; een Warrior of Magician gooit niets, dus 0. */
  rechargePerStar: number
  /** De potion waarmee deze job zijn MP aanvult. */
  mpPotion: Potion
}

/** EXP per meso aan potions en munitie van een voorstel; zonder kosten oneindig, zodat het gratis voorstel wint. */
const expPerMeso = (s: MonsterSuggestion): number => {
  const plan = hourPlan(s, s.estimate.killsPerHour)
  const cost = plan.potions + plan.ammo
  return cost > 0 ? plan.expPerHour / cost : Infinity
}

/**
 * Elk monster van de plek doorgerekend, van meeste naar minste EXP per uur. Heeft het karakter meer dan één aanval
 * (een Magician met twee spreuken), dan telt per monster de aanval met de meeste EXP per meso aan potions; bij gelijkspel
 * de meeste EXP per uur.
 */
export function suggestMonsters(profile: Profile, spot: KnownSpot, assumptions: Assumptions = ASSUMPTIONS): MonsterSuggestion[] {
  const character = toCharacter(profile)
  const attacks = attacksOf(profile, character)
  const rechargePerStar = profile.job === 'thief' ? profile.starRecharge : 0
  const mpPotion = mpPotionFor(profile.job)
  return spot.monsters
    .flatMap((monster) => {
      const options = attacks.map((attack): MonsterSuggestion => {
        const estimate = estimateMob(character, attack, monster, assumptions)
        return { monster, estimate, expPerHour: expPerHour(monster.expPerKill, estimate.killsPerHour), rechargePerStar, mpPotion }
      })
      const better = (a: MonsterSuggestion, b: MonsterSuggestion) => expPerMeso(b) > expPerMeso(a) || (expPerMeso(b) === expPerMeso(a) && b.expPerHour > a.expPerHour)
      const best = options.reduce<MonsterSuggestion | undefined>((top, o) => (top === undefined || better(top, o) ? o : top), undefined)
      return best ? [best] : []
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
  /** Meso per uur aan het herladen van stars (0 voor een Warrior of Magician). */
  ammo: number
}

/** Het uur uitgerekend; het verbruik per kill schaalt mee met de kills per uur. */
export function hourPlan(s: MonsterSuggestion, killsPerHour: number): HourPlan {
  const hpPotionsPerHour = (killsPerHour * s.estimate.hpLossPerKill) / HP_POTION.hp
  const mpPotionsPerHour = (killsPerHour * s.estimate.mpPerKill) / s.mpPotion.mp
  return {
    killsPerHour,
    expPerHour: expPerHour(s.monster.expPerKill, killsPerHour),
    hpPotionsPerHour,
    mpPotionsPerHour,
    potions: potionCostPerHour(hpPotionsPerHour, HP_POTION.price) + potionCostPerHour(mpPotionsPerHour, s.mpPotion.price),
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
