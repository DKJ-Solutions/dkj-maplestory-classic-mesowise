// Items die een Warrior kan dragen maar die geen NPC verkoopt, of die als andere kleur of als mannenversie naast
// een NPC-item bestaan: het Warrior-equivalent van wornItems.ts, met dezelfde regels. Ze staan in de zoekbalk van
// "Je equip", hebben geen prijs en komen dus nooit in het upgrade-advies. Staat de naam ook in NPC_WARRIOR_*,
// dan wint de NPC-regel.
//
// Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-04: per item de eigen itempagina, gelezen uit de ruwe pagina
// (het vereistenblok met REQ LEV en JOB, en het statblok met W.DEF of W.ATK). Alleen items tot level 30, nooit
// een hele tabel (zie .claude/rules/this-repo.md).
//
// Wat erin staat (ruimer dan warrior.ts, zoals wornItems.ts ruimer is dan armor.ts: de speler zegt zelf wat hij
// draagt):
// - Alle kleuren van de Warrior-tops, -broeken en -overalls die Harry in Perion verkoopt (#55, beslissing 2), elk
//   met een jobregel Warrior en "Male only" of "Female only" (`gender`). Per level en geslacht staat één kleur ook
//   in NPC_WARRIOR_ARMOR, en daar wint die regel; de andere kleuren zijn even sterk en staan alleen hier.
// - De items zonder jobregel uit de Thief-lijst (COMMON_WORN_ARMOR in wornItems.ts): de rijen staan maar op één
//   plek en worden hier hergebruikt: 45 rijen, waarvan de pagina op 2026-10-04 geen jobregel heeft. Items met een
//   Thief-jobregel (732 tot 736, 949, 950, 1169, 1170 en 1316) komen er niet in. De White Bandana (719) en de Red
//   Baseball Cap (781) zijn sinds #55 NPC-items, ook in NPC_WARRIOR_ARMOR.
//
// De acht wapens zonder jobregel (Long Sword tot Sky Blue Umbrella) zijn sinds #55 NPC-wapens in warrior.ts.
//
// Niet opgenomen: handschoenen en schilden (niet gelezen).
import type { Source, WornArmor, WornWarriorWeapon } from './types'
import { NPC_WARRIOR_ARMOR } from './warrior'
import { COMMON_WORN_ARMOR } from './wornItems'

const R = '2026-10-04'
const src = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })

const SLOT_RANK = { hat: 0, top: 1, bottom: 2, overall: 3, shoes: 4 } as const

const GENDERED_WARRIOR_ARMOR: readonly WornArmor[] = [
  { name: 'Brown Lolico Armor', slot: 'top', level: 10, wdef: 35, gender: 'male', source: src(942) },
  { name: 'Blue Lolico Armor', slot: 'top', level: 10, wdef: 35, gender: 'male', source: src(943) },
  { name: 'Orange Lolica Armor', slot: 'top', level: 10, wdef: 35, gender: 'female', source: src(951) },
  { name: 'Blueberry Lolica Armor', slot: 'top', level: 10, wdef: 35, gender: 'female', source: src(952) },
  { name: 'Brown Corporal', slot: 'top', level: 15, wdef: 40, gender: 'male', source: src(964) },
  { name: 'Steel Corporal', slot: 'top', level: 15, wdef: 40, gender: 'male', source: src(965) },
  { name: 'Blue Sergeant', slot: 'top', level: 20, wdef: 45, gender: 'male', source: src(979) },
  { name: 'Red Sergeant', slot: 'top', level: 20, wdef: 45, gender: 'male', source: src(980) },
  { name: 'Red Lamelle', slot: 'top', level: 20, wdef: 45, gender: 'female', source: src(988) },
  { name: 'Green Lamelle', slot: 'top', level: 20, wdef: 45, gender: 'female', source: src(989) },
  { name: 'Brown Lamelle', slot: 'top', level: 20, wdef: 45, gender: 'female', source: src(990) },
  { name: 'Silver Master Sergeant', slot: 'top', level: 25, wdef: 50, gender: 'male', source: src(1000) },
  { name: 'Orihalcon Master Sergeant', slot: 'top', level: 25, wdef: 50, gender: 'male', source: src(1001) },
  { name: 'Dark Master Sergeant', slot: 'top', level: 25, wdef: 50, gender: 'male', source: src(1002) },
  { name: 'Blue Shark', slot: 'top', level: 25, wdef: 50, gender: 'female', source: src(1010) },
  { name: 'Sky Shark', slot: 'top', level: 25, wdef: 50, gender: 'female', source: src(1011) },
  { name: 'Red Shark', slot: 'top', level: 25, wdef: 50, gender: 'female', source: src(1012) },
  { name: 'Red Hwarang Shirt', slot: 'top', level: 30, wdef: 55, gender: 'male', source: src(1021) },
  { name: 'Green Hwarang Shirt', slot: 'top', level: 30, wdef: 55, gender: 'male', source: src(1022) },
  { name: 'Brown Lolico Pants', slot: 'bottom', level: 10, wdef: 25, gender: 'male', source: src(1164) },
  { name: 'Blue Lolico Pants', slot: 'bottom', level: 10, wdef: 25, gender: 'male', source: src(1165) },
  { name: 'Rookie Pants', slot: 'bottom', level: 10, wdef: 25, gender: 'female', source: src(1171) },
  { name: 'Sophia Pants', slot: 'bottom', level: 10, wdef: 25, gender: 'female', source: src(1172) },
  { name: 'Brown Corporal Pants', slot: 'bottom', level: 15, wdef: 29, gender: 'male', source: src(1182) },
  { name: 'Steel Corporal Pants', slot: 'bottom', level: 15, wdef: 29, gender: 'male', source: src(1183) },
  { name: 'Steel Sergeant Kilt', slot: 'bottom', level: 20, wdef: 33, gender: 'male', source: src(1197) },
  { name: 'Red Sergeant Kilt', slot: 'bottom', level: 20, wdef: 33, gender: 'male', source: src(1198) },
  { name: 'Red Ramel Skirt', slot: 'bottom', level: 20, wdef: 33, gender: 'female', source: src(1204) },
  { name: 'Green Ramel Skirt', slot: 'bottom', level: 20, wdef: 33, gender: 'female', source: src(1205) },
  { name: 'Brown Ramel Skirt', slot: 'bottom', level: 20, wdef: 33, gender: 'female', source: src(1206) },
  { name: 'Silver Master Sergeant Kilt', slot: 'bottom', level: 25, wdef: 37, gender: 'male', source: src(1219) },
  { name: 'Orihalcon Master Sergeant Kilt', slot: 'bottom', level: 25, wdef: 37, gender: 'male', source: src(1220) },
  { name: 'Dark Master Sergeant Kilt', slot: 'bottom', level: 25, wdef: 37, gender: 'male', source: src(1221) },
  { name: 'Blue Shark Skirt', slot: 'bottom', level: 25, wdef: 37, gender: 'female', source: src(1225) },
  { name: 'Sky Shark Skirt', slot: 'bottom', level: 25, wdef: 37, gender: 'female', source: src(1226) },
  { name: 'Red Shark Skirt', slot: 'bottom', level: 25, wdef: 37, gender: 'female', source: src(1227) },
  { name: 'Red Martial Arts Pants', slot: 'bottom', level: 30, wdef: 41, gender: 'male', source: src(1234) },
  { name: 'Brown Martial Arts Pants', slot: 'bottom', level: 30, wdef: 41, gender: 'male', source: src(1235) },
  { name: 'Black Martial Arts Pants', slot: 'bottom', level: 30, wdef: 41, gender: 'male', source: src(1236) },
  { name: 'White Martial Arts Pants', slot: 'bottom', level: 30, wdef: 41, gender: 'male', source: src(1237) },
  { name: 'Steel Fitted Mail', slot: 'overall', level: 15, wdef: 75, gender: 'female', source: src(1094) },
  { name: 'Blue Kendo Robe', slot: 'overall', level: 20, wdef: 85, gender: 'male', source: src(1095) },
  { name: 'Red Kendo Robe', slot: 'overall', level: 20, wdef: 85, gender: 'male', source: src(1096) },
  { name: 'White Kendo Robe', slot: 'overall', level: 20, wdef: 85, gender: 'male', source: src(1097) },
  { name: 'Black Dragon Robe', slot: 'overall', level: 30, wdef: 105, gender: 'male', source: src(1106) },
  { name: 'Dark Engrit', slot: 'overall', level: 30, wdef: 105, gender: 'female', source: src(1112) },
  { name: 'Red Engrit', slot: 'overall', level: 30, wdef: 105, gender: 'female', source: src(1113) },
  { name: 'Blue Engrit', slot: 'overall', level: 30, wdef: 105, gender: 'female', source: src(1114) },
  { name: 'Yellow Engrit', slot: 'overall', level: 30, wdef: 105, gender: 'female', source: src(1115) },
]

const npcArmorNames = new Set(NPC_WARRIOR_ARMOR.map((a) => a.name))

/**
 * Niet-winkel armor voor een Warrior, per slot (hat, top, bottom, overall, shoes) van laag naar hoog level: de
 * Warrior-tops, -broeken en -overalls van beide geslachten plus de items zonder jobregel die ook de Thief draagt (dezelfde objecten als in
 * wornItems.ts). Een naam uit NPC_WARRIOR_ARMOR staat er niet in.
 */
export const WORN_WARRIOR_ARMOR: readonly WornArmor[] = [...COMMON_WORN_ARMOR, ...GENDERED_WARRIOR_ARMOR]
  .filter((a) => !npcArmorNames.has(a.name))
  .map((a, i) => ({ a, i }))
  .sort((x, y) => SLOT_RANK[x.a.slot] - SLOT_RANK[y.a.slot] || x.a.level - y.a.level || x.i - y.i)
  .map(({ a }) => a)

/**
 * Niet-winkel wapens voor een Warrior, met zoals NPC_WARRIOR_WEAPONS een `kind`, de snelheid en de multipliers van
 * de itempagina. Nu leeg: de acht wapens zonder jobregel die hier stonden (Long Sword tot Sky Blue Umbrella) zijn
 * sinds #55 NPC-wapens in warrior.ts, met eisen en prijs. De lijst blijft voor een gedragen wapen dat geen NPC verkoopt.
 */
export const WORN_WARRIOR_WEAPONS: readonly WornWarriorWeapon[] = []
