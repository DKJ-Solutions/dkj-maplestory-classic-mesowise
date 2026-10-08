// Het id van een item (Dave, 8 oktober 2026): voor data-based-on-equip, zodat de HTML per gedragen stuk zegt welk item het is. Het is het
// nummer uit de MeowDB-pagina die elke itemregel al als bron heeft (meowdb.com/msclassic/item-db/<id>); de app kent geen ander id.
// Puur, zonder UI-import.
import { ACCESSORIES } from './data/accessories'
import { NPC_ARMOR } from './data/armor'
import { BEGINNER_WEAPONS } from './data/beginnerWeapons'
import { GENDERED_WORN_BOWMAN_ARMOR, HELPFUL_STRANGER_ARROWS, NPC_ARROWS, NPC_BOWMAN_ARMOR, NPC_BOWMAN_WEAPONS } from './data/bowman'
import { NPC_CLAWS } from './data/claws'
import { NPC_DAGGERS } from './data/daggers'
import { NPC_MAGICIAN_ARMOR, NPC_MAGICIAN_WEAPONS } from './data/magician'
import { THROWING_STARS } from './data/thief'
import type { Source } from './data/types'
import { NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS } from './data/warrior'
import { WORN_ARMOR, WORN_CLAWS } from './data/wornItems'
import { WORN_WARRIOR_ARMOR, WORN_WARRIOR_WEAPONS } from './data/wornWarrior'

const ITEM_PAGE = /^https:\/\/meowdb\.com\/msclassic\/item-db\/(\d+)$/

const ITEMS: readonly { name: string; source: Source }[] = [
  ...NPC_CLAWS, ...NPC_DAGGERS, ...BEGINNER_WEAPONS, ...NPC_ARMOR, ...ACCESSORIES,
  ...NPC_BOWMAN_WEAPONS, ...NPC_ARROWS, ...HELPFUL_STRANGER_ARROWS, ...NPC_BOWMAN_ARMOR, ...GENDERED_WORN_BOWMAN_ARMOR,
  ...NPC_WARRIOR_WEAPONS, ...NPC_WARRIOR_ARMOR, ...NPC_MAGICIAN_WEAPONS, ...NPC_MAGICIAN_ARMOR, ...THROWING_STARS,
  ...WORN_ARMOR, ...WORN_CLAWS, ...WORN_WARRIOR_ARMOR, ...WORN_WARRIOR_WEAPONS,
]

const IDS: ReadonlyMap<string, string> = new Map(
  ITEMS.flatMap((i) => {
    const m = ITEM_PAGE.exec(i.source.url)
    return m ? [[i.name, m[1]] as const] : []
  }),
)

/** Het MeowDB-id van een item uit de data van de app; null voor een naam die de app niet kent (een eigen item). */
export const itemId = (name: string): string | null => IDS.get(name) ?? null
