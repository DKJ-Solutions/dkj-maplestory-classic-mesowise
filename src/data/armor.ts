// De armor die een NPC verkoopt (issue #36): alleen Thief-armor met een vaste winkelprijs, level 10 tot 30,
// één kleur per item. De kleuren van een item hebben hetzelfde level, dezelfde eisen, dezelfde WDEF en
// dezelfde prijs; alleen de bonusstat verschilt, en die negeert de app. Opgehaald bij NiaMeowDB
// (meowdb.com), per item de itempagina met de datum; elke pagina is twee keer gecontroleerd op 2026-10-03.
//
// Niet opgenomen, en waarom:
// - Items zonder jobregel op de pagina (Bandana, Baseball Cap, One-lined T-Shirt): of een Thief ze kan
//   dragen staat niet op de pagina.
// - Items met een fame-eis (Old Wisconsin, Aroa Boots, Ankle-strap Sandals, Whitebottom Boots): de app
//   kent jouw fame niet.
// - Items waarvan de eisen niet getoond worden (Metal Gear, Nightshift top, Grey Thick Sweat Pants,
//   Warfare Pants).
// - Red Qi Pao Skirt (id 1216, level 22, WDEF 24): een item alleen voor vrouwen met eigen stats. De app
//   kent het geslacht van het personage niet en zou een rok aan een mannelijk personage kunnen adviseren.
// - Handschoenen, overalls en schilden: er is geen NPC-item voor een Thief in level 10 tot 30 met een
//   prijs op MeowDB.
//
// De Ghetto Beanie (level 10, jobregel Thief) verkoopt Don Hwang in Kerning City in vijf kleuren voor 1.200
// meso (#49, gelezen op 2026-10-04); hier staat de rode, de andere kleuren staan in wornItems.ts.
// De Pao Bottoms en Qi Pao Pants hebben een mannen- en een vrouwenversie met dezelfde stats, dus die
// blijven. 'Red Stealer Pants' is de naam zoals hij hier staat; de pagina noemt hem "Red / Gold".
import type { Armor, Source } from './types'

const R = '2026-10-03'
const src = (id: number, retrieved = R): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved })

/** De NPC-armor, per slot (hat, top, bottom, shoes) van laag naar hoog level. */
export const NPC_ARMOR: readonly Armor[] = [
  { name: 'Red Ghetto Beanie', slot: 'hat', level: 10, wdef: 15, luk: 10, dex: 0, price: 1_200, source: src(732, '2026-10-04') },
  { name: 'Red Thief Hood', slot: 'hat', level: 15, wdef: 18, luk: 20, dex: 0, price: 1_900, source: src(756) },
  { name: 'Red Loosecap', slot: 'hat', level: 20, wdef: 21, luk: 30, dex: 10, price: 3_600, source: src(776) },
  { name: 'Red Tiberian', slot: 'hat', level: 25, wdef: 24, luk: 40, dex: 15, price: 4_500, source: src(803) },
  { name: 'Red Guise', slot: 'hat', level: 30, wdef: 27, luk: 50, dex: 20, price: 7_200, source: src(823) },
  { name: 'Red Cloth Vest', slot: 'top', level: 10, wdef: 24, luk: 10, dex: 0, price: 2_000, source: src(948) },
  { name: 'Red Pao', slot: 'top', level: 20, wdef: 32, luk: 30, dex: 10, price: 6_000, source: src(985) },
  { name: 'Brown Sneak', slot: 'top', level: 25, wdef: 36, luk: 40, dex: 15, price: 7_500, source: src(1007) },
  { name: 'Dark Silver Stealer', slot: 'top', level: 30, wdef: 40, luk: 50, dex: 20, price: 12_000, source: src(1028) },
  { name: 'Red Cloth Pants', slot: 'bottom', level: 10, wdef: 17, luk: 10, dex: 0, price: 1_600, source: src(1168) },
  { name: 'Blue Nightshift Pants', slot: 'bottom', level: 15, wdef: 20, luk: 20, dex: 0, price: 2_400, source: src(1184) },
  { name: 'Red Pao Bottoms', slot: 'bottom', level: 20, wdef: 23, luk: 30, dex: 10, price: 4_800, source: src(1201) },
  { name: 'Brown Sneak Pants', slot: 'bottom', level: 25, wdef: 26, luk: 40, dex: 15, price: 6_000, source: src(1222) },
  { name: 'Red Stealer Pants', slot: 'bottom', level: 30, wdef: 29, luk: 50, dex: 20, price: 9_600, source: src(1244) },
  { name: 'Blue Gidder Shoes', slot: 'shoes', level: 10, wdef: 10, luk: 10, dex: 0, price: 1_200, source: src(1315) },
  { name: 'Red Ninja Sandals', slot: 'shoes', level: 15, wdef: 12, luk: 20, dex: 0, price: 1_800, source: src(1327) },
  { name: 'Red Enamel Boots', slot: 'shoes', level: 20, wdef: 14, luk: 30, dex: 10, price: 3_600, source: src(1344) },
]
