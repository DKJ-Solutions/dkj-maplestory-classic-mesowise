// De Magician-winkelgegevens (data/magician.ts, eigen types met `int`) in de vorm van de Thief-lijsten (Claw en
// Armor, op de gedeelde ShopItem-basis), zodat het equipment-scherm en de upgrade-adviezen ze op dezelfde manier
// kunnen lezen, net als warriorGear.ts voor de Warrior. Alleen hier, aan de rand van die adviezen, staat de
// hoofdstat (INT) in het veld `luk` en de tweede eis (LUK) in het veld `dex`; de data zelf noemt ze `int` en
// `luk`. Het getal dat voor een Magician telt is zijn Magic Attack: `watk` van deze Claw is dus de M.ATT van het
// wapen (bij een Magician zet het wapen in het profiel dus zijn M.ATT in `clawWatk`). De aanvalstijd is de vaste
// cast van 810 ms (SPELL_CAST_MS), niet de "Attack cycle" van de itempagina: die kijkt naar de gewone aanval.
// Puur, zonder UI-import.
import { NPC_MAGICIAN_ARMOR, NPC_MAGICIAN_WEAPONS, SPELL_CAST_MS } from './data/magician'
import type { Armor, Claw, WornArmor } from './data/types'
import { COMMON_WORN_ARMOR } from './data/wornItems'

const CAST = { label: 'Spell cast', attackMs: SPELL_CAST_MS.normal }

/** De NPC-wands en -staffs van een Magician als Claw: M.ATT in `watk`, INT in `luk` (hoofdstat) en LUK in `dex` (tweede eis). */
export const MAGICIAN_WEAPONS: readonly Claw[] = NPC_MAGICIAN_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.matk,
  speed: CAST,
  luk: w.int,
  dex: w.luk,
  price: w.price,
  source: w.source,
}))

/** De NPC-armor van een Magician (hats, tops, bottoms en shoes, zie data/magician.ts) als Armor: INT in `luk`, LUK in `dex`. De MDEF telt niet: een aanraking is fysiek. */
export const MAGICIAN_ARMOR: readonly Armor[] = NPC_MAGICIAN_ARMOR.map((a) => ({
  name: a.name,
  slot: a.slot,
  level: a.level,
  wdef: a.wdef,
  luk: a.int,
  dex: a.luk,
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
