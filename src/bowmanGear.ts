// De Bowman-winkelgegevens (data/bowman.ts, eigen types met `str`) in de vorm van de Thief-lijsten (Claw en Armor,
// op de gedeelde ShopItem-basis), zodat het equipment-scherm en de upgrade-adviezen ze op dezelfde manier kunnen
// lezen, zoals warriorGear.ts dat voor de Warrior doet. Het veld `luk` van die vorm ("de eis naast DEX") staat hier
// voor STR; de data zelf noemt hem `str`. Puur, zonder UI-import.
import { NPC_ARROWS, NPC_BOWMAN_ARMOR, NPC_BOWMAN_WEAPONS } from './data/bowman'
import type { Armor, Claw, WornArmor } from './data/types'
import { COMMON_WORN_ARMOR } from './data/wornItems'

/**
 * De bogen en kruisbogen als Claw, op level gesorteerd (de volgorde bepaalt in clawUpgrade.ts het einde van de
 * horizon). De aanvalstijd is die van de itempagina (de Balanche 840 ms) en er is geen `mult`: de multiplier van
 * een schot (2,5) staat vast in de damage-formule, niet bij het wapen.
 */
export const BOWMAN_WEAPONS: readonly Claw[] = NPC_BOWMAN_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.watk,
  speed: w.speed,
  luk: w.str,
  dex: w.dex,
  price: w.price,
  source: w.source,
})).sort((a, b) => a.level - b.level)

/** De NPC-armor van een Bowman (hat, top, bottom, shoes, zie data/bowman.ts) als Armor. */
export const BOWMAN_ARMOR: readonly Armor[] = NPC_BOWMAN_ARMOR.map((a) => ({
  name: a.name,
  slot: a.slot,
  level: a.level,
  wdef: a.wdef,
  luk: a.str,
  dex: a.dex,
  price: a.price,
  source: a.source,
}))

const npcArmorNames = new Set(NPC_BOWMAN_ARMOR.map((a) => a.name))

/**
 * Armor zonder prijs die een Bowman kan dragen: de items zonder jobregel (voor elke klas, zie wornItems.ts), zonder wat
 * de winkel van de Bowman al heeft. De mannen- of vrouwen-only items van de Bowman zelf staan er niet in (#55).
 */
export const WORN_BOWMAN_ARMOR: readonly WornArmor[] = COMMON_WORN_ARMOR.filter((a) => !npcArmorNames.has(a.name))

/**
 * De pijl waarmee de app rekent. De gewone pijlen voor bogen en voor kruisbogen hebben dezelfde W.ATT (0) en prijs (1
 * meso); een test bewaakt dat, zodat de keuze voor één niets uitmaakt. Bronze pijlen (#64) zijn hier nog niet.
 */
export const PLAIN_ARROW = NPC_ARROWS[0]
