// De Warrior-winkelgegevens (data/warrior.ts, eigen types met `str`) in de gedeelde vorm van wapens en armor
// (Weapon en ArmorPiece, op de ShopItem-basis), zodat het equipment-scherm en de upgrade-adviezen ze op dezelfde
// manier kunnen lezen als de Thief-lijsten. De STR-eis blijft `str` (issue #69). Puur, zonder UI-import.
import type { ArmorPiece, WarriorWeaponKind, Weapon, WornClaw } from './data/types'
import { averageAttackMs, effectiveMultiplier, MULT, NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS } from './data/warrior'
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

/** De Warrior-wapens zonder prijs, op dezelfde manier omgezet: de claw-vorm met aanvalstijd en multiplier, zonder eisen en prijs. */
export const WORN_WARRIOR_CLAWS: readonly (WornClaw & { mult: number })[] = WORN_WARRIOR_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.watk,
  speed: { label: w.speed.label, attackMs: averageAttackMs(w.speed) },
  mult: effectiveMultiplier(w.mult),
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

/** Hoe een soort wapen heet op het scherm. */
const KIND_LABEL: Record<WarriorWeaponKind, string> = {
  '1h-sword': '1H Sword',
  '2h-sword': '2H Sword',
  '1h-axe': '1H Axe',
  '2h-axe': '2H Axe',
  '1h-blunt': '1H Blunt',
  '2h-blunt': '2H Blunt',
  spear: 'Spear',
  polearm: 'Polearm',
}

/** De verwachte weapon multiplier per soort wapen, voor de speler die een wapen zelf invult. */
export const WEAPON_MULT_BY_KIND: readonly { label: string; mult: number }[] = (Object.keys(MULT) as WarriorWeaponKind[]).map((k) => ({
  label: KIND_LABEL[k],
  mult: effectiveMultiplier(MULT[k]),
}))
