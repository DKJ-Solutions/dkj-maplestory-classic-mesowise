// De Bowman-winkelgegevens (data/bowman.ts, eigen types met `str`) in de gedeelde vorm van wapens en armor (Weapon en
// ArmorPiece, op de ShopItem-basis), zodat het equipment-scherm en de upgrade-adviezen ze op dezelfde manier kunnen
// lezen, zoals warriorGear.ts dat voor de Warrior doet. De STR-eis blijft `str` (issue #69). Puur, zonder UI-import.
import { GENDERED_WORN_BOWMAN_ARMOR, HELPFUL_STRANGER_ARROWS, NPC_ARROWS, NPC_BOWMAN_ARMOR, NPC_BOWMAN_WEAPONS } from './data/bowman'
import type { ArmorPiece, Weapon, WornArmor } from './data/types'
import { COMMON_WORN_ARMOR } from './data/wornItems'

/**
 * De bogen en kruisbogen als Weapon, op level gesorteerd (de volgorde bepaalt in clawUpgrade.ts het einde van de
 * horizon). De aanvalstijd is die van de itempagina (de Balanche 840 ms) en er is geen `mult`: de multiplier van
 * een schot (2,5) staat vast in de damage-formule, niet bij het wapen.
 */
export const BOWMAN_WEAPONS: readonly Weapon[] = NPC_BOWMAN_WEAPONS.map((w) => ({
  name: w.name,
  level: w.level,
  watk: w.watk,
  speed: w.speed,
  str: w.str,
  dex: w.dex,
  price: w.price,
  source: w.source,
})).sort((a, b) => a.level - b.level)

/** De NPC-armor van een Bowman (hat, top, bottom, shoes, zie data/bowman.ts) als ArmorPiece; een stuk voor één geslacht houdt zijn `gender`. */
export const BOWMAN_ARMOR: readonly ArmorPiece[] = NPC_BOWMAN_ARMOR.map((a) => ({
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

const npcArmorNames = new Set(NPC_BOWMAN_ARMOR.map((a) => a.name))

const SLOT_RANK = { hat: 0, top: 1, bottom: 2, overall: 3, shoes: 4 } as const

/**
 * Armor zonder prijs die een Bowman kan dragen: de items zonder jobregel (voor elke klas, zie wornItems.ts) en de
 * andere kleuren van de Able-rok (#107), zonder wat de winkel van de Bowman al heeft. Per slot van laag naar hoog
 * level, zoals WORN_WARRIOR_ARMOR.
 */
export const WORN_BOWMAN_ARMOR: readonly WornArmor[] = [...COMMON_WORN_ARMOR, ...GENDERED_WORN_BOWMAN_ARMOR]
  .filter((a) => !npcArmorNames.has(a.name))
  .map((a, i) => ({ a, i }))
  .sort((x, y) => SLOT_RANK[x.a.slot] - SLOT_RANK[y.a.slot] || x.a.level - y.a.level || x.i - y.i)
  .map(({ a }) => a)

/**
 * De gewone pijl, waarmee de app rekent zolang de speler Helpful Stranger niet heeft aangezet. De gewone pijlen voor
 * bogen en voor kruisbogen hebben dezelfde W.ATT (0) en prijs (1 meso); een test bewaakt dat, zodat de keuze voor één
 * niets uitmaakt.
 */
export const PLAIN_ARROW = NPC_ARROWS[0]

/** De bronze pijl (#64): +1 W.ATT voor 2 meso, gelijk voor bogen en kruisbogen (een test bewaakt dat). Alleen met Helpful Stranger. */
export const BRONZE_ARROW = HELPFUL_STRANGER_ARROWS[0]

/** Of dit een bronze pijl is, op naam. */
export const isBronzeArrow = (name: string): boolean => HELPFUL_STRANGER_ARROWS.some((a) => a.name === name)

/**
 * De pijl waarmee een Bowman rekent: de bronze pijl alleen als hij Helpful Stranger aanzette én die pijl koos; anders
 * de gewone. Zo valt het getal terug op de gewone pijl zodra de schakelaar uit staat, wat er ook gekozen was.
 */
export const arrowFor = (helpfulStranger: boolean, bronzeChosen: boolean) => (helpfulStranger && bronzeChosen ? BRONZE_ARROW : PLAIN_ARROW)
