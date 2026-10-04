// De Magician-winkelgegevens (data/magician.ts, eigen types met `int`) in de gedeelde vorm van wapens en armor (Weapon en
// ArmorPiece, op de ShopItem-basis), zodat het equipment-scherm en de upgrade-adviezen ze op dezelfde manier kunnen lezen,
// net als warriorGear.ts voor de Warrior. Elke eis staat in zijn eigen stat (INT en LUK, issue #69). Het getal dat voor een
// Magician telt is zijn Magic Attack: `watk` van dit Weapon is dus de M.ATT van het wapen (bij een Magician zet het wapen in
// het profiel zijn M.ATT in `clawWatk`). De aanvalstijd is de vaste cast van 810 ms (SPELL_CAST_MS), niet de "Attack cycle"
// van de itempagina: die kijkt naar de gewone aanval. Puur, zonder UI-import.
import { NPC_MAGICIAN_ARMOR, NPC_MAGICIAN_WEAPONS, SPELL_CAST_MS } from './data/magician'
import type { ArmorPiece, Weapon, WornArmor } from './data/types'
import { COMMON_WORN_ARMOR } from './data/wornItems'

const CAST = { label: 'Spell cast', attackMs: SPELL_CAST_MS.normal }

/** De NPC-wands en -staffs van een Magician als Weapon: de M.ATT in `watk`, met de vaste cast van 810 ms. */
export const MAGICIAN_WEAPONS: readonly Weapon[] = NPC_MAGICIAN_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.matk,
  speed: CAST,
  int: w.int,
  luk: w.luk,
  price: w.price,
  source: w.source,
}))

/** De NPC-armor van een Magician (hats, tops, bottoms en shoes, zie data/magician.ts) als ArmorPiece. De MDEF gaat mee voor de Magic Def op de Total stats-kaart (#91); het advies telt hem niet: een aanraking is fysiek. */
export const MAGICIAN_ARMOR: readonly ArmorPiece[] = NPC_MAGICIAN_ARMOR.map((a) => ({
  name: a.name,
  slot: a.slot,
  level: a.level,
  wdef: a.wdef,
  mdef: a.mdef,
  int: a.int,
  luk: a.luk,
  price: a.price,
  source: a.source,
}))

const npcArmorNames = new Set(NPC_MAGICIAN_ARMOR.map((a) => a.name))

/**
 * Armor zonder prijs voor een Magician: de items zonder jobregel die elke klas draagt (COMMON_WORN_ARMOR in
 * wornItems.ts, dezelfde objecten; #55) zonder wat al een NPC-item van de Magician is. Magician-items met een jobregel
 * die geen NPC verkoopt zijn niet gelezen, dus die staan er niet in.
 */
export const WORN_MAGICIAN_ARMOR: readonly WornArmor[] = COMMON_WORN_ARMOR.filter((a) => !npcArmorNames.has(a.name))
