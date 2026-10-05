// De Warrior-winkelgegevens (data/warrior.ts, eigen types met `str`) in de gedeelde vorm van wapens en armor
// (Weapon en ArmorPiece, op de ShopItem-basis), zodat het equipment-scherm en de upgrade-adviezen ze op dezelfde
// manier kunnen lezen als de Thief-lijsten. De STR-eis blijft `str` (issue #69). Puur, zonder UI-import.
import type { ArmorPiece, Weapon, WornClaw } from './data/types'
import { averageAttackMs, effectiveMultiplier, NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS } from './data/warrior'
import { WORN_WARRIOR_WEAPONS } from './data/wornWarrior'

/**
 * De NPC-wapens van een Warrior als Weapon. De aanvalstijd is het gemiddelde van zwaaien en steken en de
 * multiplier die van de 60/40-regel (zie data/warrior.ts).
 */
export const WARRIOR_WEAPONS: readonly Weapon[] = NPC_WARRIOR_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.watk,
  speed: { label: w.speed.label, attackMs: averageAttackMs(w.speed) },
  mult: effectiveMultiplier(w.mult),
  str: w.str,
  dex: w.dex,
  price: w.price,
  source: w.source,
}))

/** De Warrior-wapens zonder prijs, op dezelfde manier omgezet: de claw-vorm met aanvalstijd, multiplier en eisen, zonder prijs (#158). */
export const WORN_WARRIOR_CLAWS: readonly (WornClaw & { mult: number })[] = WORN_WARRIOR_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.watk,
  speed: { label: w.speed.label, attackMs: averageAttackMs(w.speed) },
  mult: effectiveMultiplier(w.mult),
  str: w.str,
  dex: w.dex,
  source: w.source,
}))

/** De NPC-armor van een Warrior (zie data/warrior.ts) als ArmorPiece; een stuk voor één geslacht houdt zijn `gender`. */
export const WARRIOR_ARMOR: readonly ArmorPiece[] = NPC_WARRIOR_ARMOR.map((a) => ({
  name: a.name,
  slot: a.slot,
  level: a.level,
  wdef: a.wdef,
  str: a.str,
  dex: a.dex,
  price: a.price,
  source: a.source,
  ...(a.gender ? { gender: a.gender } : {}),
}))
