// De Warrior-winkelgegevens (data/warrior.ts) in de vorm van de Thief-lijsten (Claw en Armor), zodat het
// equipment-scherm en de upgrade-adviezen ze op dezelfde manier kunnen lezen. De eis in de hoofdstat (STR)
// staat in het veld `luk`: dat veld heet zo omdat de Thief begon, en betekent "hoofdstat". Puur, zonder UI-import.
import type { Armor, Claw, WarriorWeaponKind } from './data/types'
import { averageAttackMs, effectiveMultiplier, MULT, NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS } from './data/warrior'

/**
 * De NPC-wapens van een Warrior als Claw. De aanvalstijd is het gemiddelde van zwaaien en steken en de
 * multiplier die van de 60/40-regel (zie data/warrior.ts).
 */
export const WARRIOR_WEAPONS: readonly Claw[] = NPC_WARRIOR_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.watk,
  speed: { label: w.speed.label, attackMs: averageAttackMs(w.speed) },
  mult: effectiveMultiplier(w.mult),
  luk: w.str,
  dex: w.dex,
  price: w.price,
  source: w.source,
}))

/** De NPC-armor van een Warrior (alleen hats en shoes, zie data/warrior.ts) als Armor. */
export const WARRIOR_ARMOR: readonly Armor[] = NPC_WARRIOR_ARMOR.map((a) => ({
  name: a.name,
  slot: a.slot,
  level: a.level,
  wdef: a.wdef,
  luk: a.str,
  dex: a.dex,
  price: a.price,
  source: a.source,
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
