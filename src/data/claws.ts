// De claws die een NPC verkoopt (issue #25): alleen de Thief-claws met een vaste winkelprijs. Claws die je
// alleen kunt laten maken (Mithril en Gold Titans, Bronze en Adamantium Igor, Mithril Guards) hebben op
// MeowDB geen NPC-prijs, dus de app telt ze niet mee. Opgehaald bij NiaMeowDB (meowdb.com), per claw de
// itempagina met de datum.
import { SPEED } from './attackSpeed'
import type { Claw, Source } from './types'

const R = '2026-10-03'
const src = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })

const { fast5: FAST5, fast4: FAST4, faster3: FASTER3 } = SPEED

/** De NPC-claws, van laag naar hoog level. */
export const NPC_CLAWS: readonly Claw[] = [
  { name: 'Garnier', level: 10, watk: 10, speed: FAST5, luk: 25, dex: 0, price: 5_000, source: src(680) },
  { name: 'Steel Titans', level: 15, watk: 13, speed: FAST4, luk: 35, dex: 15, price: 7_000, source: src(682) },
  { name: 'Steel Igor', level: 20, watk: 17, speed: FAST4, luk: 45, dex: 20, price: 14_100, source: src(686) },
  { name: 'Meba', level: 25, watk: 19, speed: FASTER3, luk: 55, dex: 25, price: 16_500, source: src(688) },
  { name: 'Steel Guards', level: 30, watk: 22, speed: FAST4, luk: 65, dex: 30, price: 26_000, source: src(689) },
  { name: 'Adamantium Guards', level: 30, watk: 23, speed: FAST4, luk: 65, dex: 30, price: 27_600, source: src(691) },
]
