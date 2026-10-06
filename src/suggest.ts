// Het voorstel bij een bekende plek: het mob-model met de spelgegevens en het karakterprofiel.
// Een leeg veld bij een bekende plek betekent "neem het voorstel"; wat de speler zelf invult, wint.
import { expPerHour, potionCostPerHour } from './calc/expPerHour'
import { ASSUMPTIONS, beginnerAttack, bowAttack, characterAttack, daggerAttack, estimateMob, meleeAttack, spellAttack, type Assumptions, type Attack, type Character, type MobEstimate, type SkillStats } from './calc/mobModel'
import type { Spot } from './calc/rankSpots'
import { ARROW_BLOW_LEVELS, BOWMAN_DAMAGE, BOWMAN_MASTERY_BASE } from './data/bowman'
import { ENERGY_BOLT_LEVELS, IMPROVED_MP_RECOVERY, MAGIC_CLAW_HITS, MAGIC_CLAW_LEVELS, MAGIC_CLAW_REQUIRES_ENERGY_BOLT, MAGICIAN_MP_POTIONS } from './data/magician'
import { POTIONS } from './data/spots'
import { DOUBLE_STAB_HITS, DOUBLE_STAB_LEVELS, DOUBLE_STAB_WEAPON_MULT, LUCKY_SEVEN, LUCKY_SEVEN_LEVELS } from './data/thief'
import type { KnownSpot, Monster, Potion, SpellLevel } from './data/types'
import { IMPROVED_HP_RECOVERY, POWER_STRIKE_LEVELS } from './data/warrior'
import type { Job } from './job'
import { attacksAsBeginner, thiefWithDagger, toCharacter, type Profile } from './profile'
import { buffBonus } from './skillEffects'
import { parseAmount, toSpot, type SpotDraft } from './spotDraft'

/** Lucky Seven op dit skill-level, of null als hij nog niet geleerd is (level 0). */
export function luckySevenAt(level: number): SkillStats | null {
  if (level < 1) return null
  return LUCKY_SEVEN_LEVELS[Math.min(level, LUCKY_SEVEN_LEVELS.length) - 1] ?? null
}

/** Double Stab op dit skill-level, of null als hij nog niet geleerd is (level 0): dan telt de gewone aanval met de dagger. */
export function doubleStabAt(level: number): SkillStats | null {
  if (level < 1) return null
  return DOUBLE_STAB_LEVELS[Math.min(level, DOUBLE_STAB_LEVELS.length) - 1] ?? null
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

/** Arrow Blow op dit skill-level, of null als hij nog niet geleerd is (level 0): dan telt het gewone schot. */
export function arrowBlowAt(level: number): SkillStats | null {
  if (level < 1) return null
  return ARROW_BLOW_LEVELS[Math.min(level, ARROW_BLOW_LEVELS.length) - 1] ?? null
}

/** De weapon multiplier van een schot en de basis-mastery van een Bowman, uit de damage-gids (data/bowman.ts). */
const BOW = { weaponMult: BOWMAN_DAMAGE.shootMultiplier, mastery: BOWMAN_MASTERY_BASE } as const

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

/** De gewone aanval van een Beginner met het wapen in zijn hand (#171): de multiplier en of het een dagger is, uit de equipment. */
const beginnerAttackOf = (profile: Profile, c: Character): Attack => beginnerAttack(c, profile.weaponMult, profile.dagger === 1)

/**
 * De aanval van een Thief met een dagger (#170): Double Stab op het gezette level (2 klappen, de steek van 2,0), of zonder punten
 * de gewone aanval met de verwachte multiplier van de dagger uit de equipment.
 */
function daggerAttackOf(profile: Profile, c: Character): Attack {
  const stab = doubleStabAt(profile.doubleStab)
  return stab ? daggerAttack(c, DOUBLE_STAB_WEAPON_MULT, stab, DOUBLE_STAB_HITS) : daggerAttack(c, profile.weaponMult, null, 1)
}

/**
 * De aanvallen van dit profiel; de meeste jobs hebben er één. Een Thief of Bowman onder level 10 slaat als Beginner (#171). Een Thief gooit Lucky Seven (of de gewone claw-aanval), of steekt met een dagger Double Stab (#170); een Warrior slaat met
 * Power Strike op het gezette level, of zonder punten met de gewone aanval; een Bowman schiet Arrow Blow op het
 * gezette level, of zonder punten het gewone schot; een Magician kiest uit zijn spreuken (geen spreuk: geen aanval, dan is er
 * geen voorstel). Slash Blast en Double Shot zijn bewust niet meegenomen: ze raken
 * tot 4 en tot 2 monsters, en hoeveel er in de buurt staan is niet bekend (zie skillPoint.ts).
 */
function attacksOf(profile: Profile, character: Character): Attack[] {
  if (attacksAsBeginner(profile.job, profile.level)) return [beginnerAttackOf(profile, character)]
  switch (profile.job) {
    case 'warrior':
      return [meleeAttack(character, profile.weaponMult, powerStrikeAt(profile.powerStrike))]
    case 'bowman':
      return [bowAttack(character, BOW, arrowBlowAt(profile.arrowBlow))]
    case 'magician':
      return magicianAttacks(profile, character)
    default:
      if (thiefWithDagger(profile.job, profile.dagger)) return [daggerAttackOf(profile, character)]
      return [characterAttack(character, luckySevenAt(profile.luckySeven), LUCKY_SEVEN)]
  }
}

/**
 * De Attack uit het statvenster (issue #108): de laagste en hoogste schade van één gewone aanval, uit je ability points
 * en je weapon attack, zonder skill en vóór de verdediging van het monster. Bron: de damage-gids van MeowDB
 * (meowdb.com/msclassic/guides/explaining-the-damage-formula, "Character-window damage range"), die beide afrondt
 * naar beneden. Null voor een Magician: zijn gewone wand-aanval staat niet in de gegevens. Bij een Warrior (en een Thief met een dagger) is het
 * een benadering: zijn weapon multiplier is het gemiddelde van zwaaien en steken (data/warrior.ts), waar het spel één
 * multiplier gebruikt; het bereik kan daardoor een paar punten van het statvenster afwijken.
 */
export function statWindowRange(profile: Profile): { min: number; max: number } | null {
  const c = toCharacter(profile)
  const a = attacksAsBeginner(profile.job, profile.level)
    ? beginnerAttackOf(profile, c)
    : profile.job === 'warrior'
      ? meleeAttack(c, profile.weaponMult, null)
      : profile.job === 'bowman'
        ? bowAttack(c, BOW, null)
        : thiefWithDagger(profile.job, profile.dagger)
          ? daggerAttack(c, profile.weaponMult, null, 1)
          : profile.job === 'thief'
          ? characterAttack(c, null, LUCKY_SEVEN)
          : null
  return a && { min: Math.trunc(a.min), max: Math.trunc(a.max) }
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

/** Het herstel van items op dit skill-level als factor: 1 op level 0, 1,05 op level 1; boven het maximum telt het maximum. */
function itemRecoveryFactor(pct: readonly number[], level: number): number {
  if (level < 1) return 1
  return 1 + (pct[Math.min(level, pct.length) - 1] ?? 0) / 100
}

/**
 * Hoeveel meer HP en MP een potion herstelt dan er op staat (issue #141): Improved HP Recovery van een Warrior en Improved MP
 * Recovery van een Magician verhogen het herstel van items met 5% tot 20%. Dat geldt voor elke potion, dus de goedkoopste per
 * punt herstel blijft dezelfde. Het herstel per 10 seconden telt niet mee: bij HP staat er geen getal op de pagina, en bij MP
 * is het een deel van je Max MP, die de berekening niet gebruikt (Total stats toont hem). Een andere job heeft 0 in die velden (parseProfile), dus 1.
 */
export const potionFactorOf = (profile: Profile): { hp: number; mp: number } => ({
  hp: itemRecoveryFactor(IMPROVED_HP_RECOVERY.itemRecoveryPct, profile.improvedHpRecovery),
  mp: itemRecoveryFactor(IMPROVED_MP_RECOVERY.itemRecoveryPct, profile.improvedMpRecovery),
})

/** Het voorstel voor één monster: wat het model verwacht, en de EXP per uur die daaruit volgt. */
export interface MonsterSuggestion {
  monster: Monster
  estimate: MobEstimate
  expPerHour: number
  /** Wat het herladen van één ster kost: die van je gekozen stars, of de prijs van één pijl voor een Bowman; een Warrior, Magician, Beginner of Thief met een dagger gooit niets, dus 0. */
  rechargePerStar: number
  /** De potion waarmee je je HP aanvult: je keuze (profile.potions), anders de goedkoopste per HP. */
  hpPotion: Potion
  /** De potion waarmee je je MP aanvult: je keuze (profile.potions), anders de goedkoopste per MP van deze job. */
  mpPotion: Potion
  /** De MP per uur om je buffs aan te houden (buffBonus in skillEffects.ts); los van hoeveel je killt. */
  buffMpPerHour: number
  /** Hoeveel meer een potion herstelt dan er op staat, door Improved HP en MP Recovery: 1 zonder punten, 1,2 op het maximum. */
  potionFactor: { hp: number; mp: number }
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
  const throwsNothing = profile.job === 'warrior' || profile.job === 'magician' || attacksAsBeginner(profile.job, profile.level) || thiefWithDagger(profile.job, profile.dagger)
  const rechargePerStar = throwsNothing ? 0 : profile.starRecharge
  const hpPotion = profile.potions?.hp ?? HP_POTION
  const mpPotion = profile.potions?.mp ?? mpPotionFor(profile.job)
  const buffMpPerHour = buffBonus(profile).mpPerHour
  const potionFactor = potionFactorOf(profile)
  return spot.monsters
    .flatMap((monster) => {
      const options = attacks.map((attack): MonsterSuggestion => {
        const estimate = estimateMob(character, attack, monster, assumptions)
        return { monster, estimate, expPerHour: expPerHour(monster.expPerKill, estimate.killsPerHour), rechargePerStar, hpPotion, mpPotion, buffMpPerHour, potionFactor }
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
  /** Meso per uur aan het herladen van stars of het kopen van pijlen (0 voor een Warrior of Magician). */
  ammo: number
}

/** Het uur uitgerekend; het verbruik per kill schaalt mee met de kills per uur, de MP voor je buffs niet. */
export function hourPlan(s: MonsterSuggestion, killsPerHour: number): HourPlan {
  const hpPotionsPerHour = (killsPerHour * s.estimate.hpLossPerKill) / (s.hpPotion.hp * s.potionFactor.hp)
  const mpPotionsPerHour = (killsPerHour * s.estimate.mpPerKill + s.buffMpPerHour) / (s.mpPotion.mp * s.potionFactor.mp)
  return {
    killsPerHour,
    expPerHour: expPerHour(s.monster.expPerKill, killsPerHour),
    hpPotionsPerHour,
    mpPotionsPerHour,
    potions: potionCostPerHour(hpPotionsPerHour, s.hpPotion.price) + potionCostPerHour(mpPotionsPerHour, s.mpPotion.price),
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
