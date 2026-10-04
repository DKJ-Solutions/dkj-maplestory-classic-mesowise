// Items die een Thief kan dragen maar die geen NPC verkoopt, of die als andere kleur of als mannen- of
// vrouwenversie naast een NPC-item bestaan. Ze staan in de zoekbalk van "Je equipment", zodat je kunt zoeken
// wat je draagt; ze hebben geen prijs en komen dus nooit in het upgrade-advies (dat gebruikt alleen NPC_ARMOR
// en NPC_CLAWS). Staat de naam ook in de NPC-lijst, dan wint de NPC-regel.
//
// Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-04: per item de eigen itempagina, gelezen uit de ruwe pagina
// (het vereistenblok met REQ LEV en JOB, en het statblok met W.DEF of W.ATK), dus zonder samenvatting ertussen.
// Alleen items die een Thief tot level 30 echt draagt, nooit een hele tabel (zie .claude/rules/this-repo.md).
//
// Wat erin staat, en waarom ruimer dan armor.ts: hier zegt de speler zelf wat hij draagt, dus de vraag of hij
// het kan dragen speelt niet. Daarom staan ook items zonder jobregel (beginnerskleding, Bandana, Gomushin),
// items met een fame-eis en de Qi Pao Skirts erin. Items voor een andere job (Warrior, Mage, Bowman) niet.
//
// Niet opgenomen: de GM-hoeden (Dr. Lim Hat, Nemi Hat, Inkwell Hat, Wizet Invincible Hat, elk +200 WDEF),
// Wizet Plain Suit en Wizet Plain Shoes (geen stat op de pagina), en Black Sneak (id 1009: de pagina toont
// geen W.DEF). Overalls ook niet: de app heeft geen overall-slot. Heet een item hetzelfde als een ander
// (de mannen- en vrouwenversie, of Beginner's Garnier 681 en 2545), dan staat het er één keer in: de stats zijn
// gelijk.
import { SPEED } from './attackSpeed'
import type { Source, WornArmor, WornClaw } from './types'

const R = '2026-10-04'
const src = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })

const { fast5: FAST5, fast4: FAST4 } = SPEED

/** Niet-winkel armor, per slot (hat, top, bottom, shoes) van laag naar hoog level. */
export const WORN_ARMOR: readonly WornArmor[] = [
  { name: 'Brown Skullcap', slot: 'hat', level: 5, wdef: 6, source: src(708) },
  { name: 'Green Skullcap', slot: 'hat', level: 5, wdef: 6, source: src(709) },
  { name: 'Red Skullcap', slot: 'hat', level: 5, wdef: 6, source: src(710) },
  { name: 'Red Headband', slot: 'hat', level: 5, wdef: 6, source: src(711) },
  { name: 'Black Headband', slot: 'hat', level: 5, wdef: 6, source: src(712) },
  { name: 'Green Headband', slot: 'hat', level: 5, wdef: 6, source: src(713) },
  { name: 'Yellow Headband', slot: 'hat', level: 5, wdef: 6, source: src(714) },
  { name: 'Blue Headband', slot: 'hat', level: 5, wdef: 6, source: src(715) },
  { name: 'Black Swimming Cap', slot: 'hat', level: 8, wdef: 8, source: src(716) },
  { name: 'Blue Swimming Cap', slot: 'hat', level: 8, wdef: 8, source: src(717) },
  { name: 'Red Swimming Cap', slot: 'hat', level: 8, wdef: 8, source: src(718) },
  { name: 'White Bandana', slot: 'hat', level: 10, wdef: 15, source: src(719) },
  { name: 'Red Bandana', slot: 'hat', level: 10, wdef: 15, source: src(720) },
  { name: 'Blue Bandana', slot: 'hat', level: 10, wdef: 15, source: src(721) },
  { name: 'Yellow Bandana', slot: 'hat', level: 10, wdef: 15, source: src(722) },
  { name: 'Black Bandana', slot: 'hat', level: 10, wdef: 15, source: src(723) },
  { name: 'Blue Ghetto Beanie', slot: 'hat', level: 10, wdef: 15, source: src(733) },
  { name: 'Brown Ghetto Beanie', slot: 'hat', level: 10, wdef: 15, source: src(734) },
  { name: 'Black Ghetto Beanie', slot: 'hat', level: 10, wdef: 15, source: src(735) },
  { name: 'Green Ghetto Beanie', slot: 'hat', level: 10, wdef: 15, source: src(736) },
  { name: 'Metal Gear', slot: 'hat', level: 15, wdef: 18, source: src(740) },
  { name: 'Yellow Metal Gear', slot: 'hat', level: 15, wdef: 19, source: src(741) },
  { name: 'Blue Metal Gear', slot: 'hat', level: 15, wdef: 19, source: src(742) },
  { name: 'Green Thief Hood', slot: 'hat', level: 15, wdef: 18, source: src(757) },
  { name: 'Blue Thief Hood', slot: 'hat', level: 15, wdef: 18, source: src(758) },
  { name: 'Yellow Thief Hood', slot: 'hat', level: 15, wdef: 18, source: src(759) },
  { name: 'Black Thief Hood', slot: 'hat', level: 15, wdef: 18, source: src(760) },
  { name: 'Old Wisconsin', slot: 'hat', level: 17, wdef: 19, source: src(761) },
  { name: 'Black Baseball Cap', slot: 'hat', level: 22, wdef: 22, source: src(782) },
  { name: 'Brown Bamboo Hat', slot: 'hat', level: 25, wdef: 24, source: src(789) },
  { name: 'Red Starry Bandana', slot: 'hat', level: 25, wdef: 24, source: src(792) },
  { name: 'Ribboned Pig Headband', slot: 'hat', level: 27, wdef: 26, source: src(808) },
  { name: 'Bronze Pride', slot: 'hat', level: 30, wdef: 16, source: src(809) },
  { name: 'Blue Striped Undershirt', slot: 'top', level: 0, wdef: 1, source: src(932) },
  { name: 'White Undershirt', slot: 'top', level: 0, wdef: 6, source: src(933) },
  { name: 'Grey T-Shirt', slot: 'top', level: 0, wdef: 6, source: src(934) },
  { name: 'Undershirt', slot: 'top', level: 0, wdef: 6, source: src(935) },
  { name: 'Pink Tank Top', slot: 'top', level: 0, wdef: 1, source: src(936) },
  { name: 'White Tube Top', slot: 'top', level: 0, wdef: 6, source: src(937) },
  { name: 'Yellow T-Shirt', slot: 'top', level: 0, wdef: 6, source: src(938) },
  { name: 'Green T-Shirt', slot: 'top', level: 0, wdef: 6, source: src(939) },
  { name: 'Red Striped Top', slot: 'top', level: 0, wdef: 6, source: src(940) },
  { name: 'Blue Cloth Vest', slot: 'top', level: 10, wdef: 24, source: src(949) },
  { name: 'Black Cloth Vest', slot: 'top', level: 10, wdef: 24, source: src(950) },
  { name: 'Blue One-lined T-Shirt', slot: 'top', level: 12, wdef: 26, source: src(960) },
  { name: 'Orange Sporty T-Shirt', slot: 'top', level: 12, wdef: 26, source: src(961) },
  { name: 'Pink Starry Shirt', slot: 'top', level: 12, wdef: 26, source: src(962) },
  { name: 'Red Striped T-Shirt', slot: 'top', level: 12, wdef: 26, source: src(963) },
  { name: 'Blue Nightshift', slot: 'top', level: 15, wdef: 28, source: src(968) },
  { name: 'Dark Nightshift', slot: 'top', level: 15, wdef: 28, source: src(969) },
  { name: 'Red Nightshift', slot: 'top', level: 15, wdef: 28, source: src(977) },
  { name: 'Brown Nightshift', slot: 'top', level: 15, wdef: 28, source: src(978) },
  { name: 'Blue Pao', slot: 'top', level: 20, wdef: 32, source: src(986) },
  { name: 'Black Pao', slot: 'top', level: 20, wdef: 32, source: src(987) },
  { name: 'Red Qi Pao', slot: 'top', level: 20, wdef: 32, source: src(997) },
  { name: 'Pink Qi Pao', slot: 'top', level: 20, wdef: 32, source: src(998) },
  { name: 'Blue Qi Pao', slot: 'top', level: 20, wdef: 32, source: src(999) },
  { name: 'Blue Sneak', slot: 'top', level: 25, wdef: 36, source: src(1008) },
  { name: 'Blood Sneak', slot: 'top', level: 25, wdef: 36, source: src(1017) },
  { name: 'Sky Sneak', slot: 'top', level: 25, wdef: 36, source: src(1018) },
  { name: 'Gold Sneak', slot: 'top', level: 25, wdef: 36, source: src(1019) },
  { name: 'Dark Sneak', slot: 'top', level: 25, wdef: 36, source: src(1020) },
  { name: 'Dark Brown Stealer', slot: 'top', level: 30, wdef: 40, source: src(1027) },
  { name: 'Red Gold Stealer', slot: 'top', level: 30, wdef: 40, source: src(1029) },
  { name: 'Silver Black Stealer', slot: 'top', level: 30, wdef: 40, source: src(1030) },
  { name: 'Red Steal', slot: 'top', level: 30, wdef: 40, source: src(1036) },
  { name: 'Blue Steal', slot: 'top', level: 30, wdef: 40, source: src(1037) },
  { name: 'Purple Steal', slot: 'top', level: 30, wdef: 40, source: src(1038) },
  { name: 'Black Steal', slot: 'top', level: 30, wdef: 40, source: src(1039) },
  { name: 'Blue-Striped Boxers', slot: 'bottom', level: 0, wdef: 1, source: src(1156) },
  { name: 'Blue Jean Shorts', slot: 'bottom', level: 0, wdef: 4, source: src(1157) },
  { name: 'Red Miniskirt', slot: 'bottom', level: 0, wdef: 4, source: src(1160) },
  { name: 'Jean Capris', slot: 'bottom', level: 5, wdef: 7, source: src(1163) },
  { name: 'Blue Cloth Pants', slot: 'bottom', level: 10, wdef: 17, source: src(1169) },
  { name: 'Black Cloth Pants', slot: 'bottom', level: 10, wdef: 17, source: src(1170) },
  { name: 'Grey Thick Sweat Pants', slot: 'bottom', level: 12, wdef: 18, source: src(1181) },
  { name: 'Dark Nightshift Pants', slot: 'bottom', level: 15, wdef: 20, source: src(1185) },
  { name: 'Red Nightshift Pants', slot: 'bottom', level: 15, wdef: 20, source: src(1193) },
  { name: 'Brown Nightshift Pants', slot: 'bottom', level: 15, wdef: 20, source: src(1194) },
  { name: 'Ice Jeans', slot: 'bottom', level: 17, wdef: 21, source: src(1195) },
  { name: 'Sandblasted Jeans', slot: 'bottom', level: 17, wdef: 21, source: src(1196) },
  { name: 'Blue Pao Bottoms', slot: 'bottom', level: 20, wdef: 23, source: src(1202) },
  { name: 'Black Pao Bottoms', slot: 'bottom', level: 20, wdef: 23, source: src(1203) },
  { name: 'Red Qi Pao Pants', slot: 'bottom', level: 20, wdef: 23, source: src(1212) },
  { name: 'Blue Qi Pao Pants', slot: 'bottom', level: 20, wdef: 23, source: src(1213) },
  { name: 'Purple Qi Pao Pants', slot: 'bottom', level: 20, wdef: 23, source: src(1214) },
  { name: 'Red Qi Pao Skirt', slot: 'bottom', level: 22, wdef: 24, source: src(1216) },
  { name: 'Blue Qi Pao Skirt', slot: 'bottom', level: 22, wdef: 24, source: src(1217) },
  { name: 'Dark Brown Sneak Pants', slot: 'bottom', level: 25, wdef: 26, source: src(1223) },
  { name: 'Black Sneak Pants', slot: 'bottom', level: 25, wdef: 26, source: src(1224) },
  { name: 'Blood Sneak Pants', slot: 'bottom', level: 25, wdef: 26, source: src(1228) },
  { name: 'Sky Sneak Pants', slot: 'bottom', level: 25, wdef: 26, source: src(1229) },
  { name: 'Gold Sneak Pants', slot: 'bottom', level: 25, wdef: 26, source: src(1230) },
  { name: 'Dark Sneak Pants', slot: 'bottom', level: 25, wdef: 26, source: src(1231) },
  { name: 'Warfare Pants', slot: 'bottom', level: 26, wdef: 27, source: src(1233) },
  { name: 'Dark Brown Stealer Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1242) },
  { name: 'Dark Silver Stealer Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1243) },
  { name: 'Silver / Black Stealer Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1245) },
  { name: 'Red Steal Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1252) },
  { name: 'Blue Steal Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1253) },
  { name: 'Purple Steal Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1254) },
  { name: 'Black Steal Pants', slot: 'bottom', level: 30, wdef: 29, source: src(1255) },
  { name: 'Leather Sandals', slot: 'shoes', level: 0, wdef: 2, source: src(1305) },
  { name: 'Red Rubber Boots', slot: 'shoes', level: 0, wdef: 2, source: src(1306) },
  { name: 'Yellow Rubber Boots', slot: 'shoes', level: 0, wdef: 2, source: src(1307) },
  { name: 'Blue Rubber Boots', slot: 'shoes', level: 0, wdef: 2, source: src(1308) },
  { name: 'Brown Gidder Shoes', slot: 'shoes', level: 10, wdef: 10, source: src(1316) },
  { name: 'White Gomushin', slot: 'shoes', level: 11, wdef: 11, source: src(1317) },
  { name: 'Black Gomushin', slot: 'shoes', level: 11, wdef: 11, source: src(1318) },
  { name: 'Smelly Gomushin', slot: 'shoes', level: 11, wdef: 11, source: src(1319) },
  { name: 'Yellow Ninja Sandals', slot: 'shoes', level: 15, wdef: 12, source: src(1328) },
  { name: 'Blue Ninja Sandals', slot: 'shoes', level: 15, wdef: 12, source: src(1329) },
  { name: 'White Ninja Sandals', slot: 'shoes', level: 15, wdef: 12, source: src(1330) },
  { name: 'Bronze Aroa Boots', slot: 'shoes', level: 16, wdef: 13, source: src(1331) },
  { name: 'Blue Enamel Boots', slot: 'shoes', level: 20, wdef: 14, source: src(1345) },
  { name: 'Black Enamel Boots', slot: 'shoes', level: 20, wdef: 14, source: src(1346) },
  { name: 'Blue Ankle-strap Sandals', slot: 'shoes', level: 21, wdef: 15, source: src(1347) },
]

/**
 * De ids (MeowDB-itempagina) van de rijen in WORN_ARMOR waarvan de pagina geen jobregel heeft, zodat elke job ze
 * kan dragen: de beginnerskleding op level 0 (tops 932 tot 940, broeken 1156, 1157 en 1160, schoenen 1305 tot
 * 1308) en de items die armor.ts en deze kop met naam als "zonder jobregel" noemen: Bandana (719 tot 723),
 * Baseball Cap (782), One-lined T-Shirt (960) en Gomushin (1317 tot 1319), en de op 2026-10-04 op de ruwe
 * itempagina gecontroleerde Skullcaps, Headbands en andere items (708 tot 718, 740 tot 742, 961 tot 963, 1163, 1181
 * en 1233). De Warrior leest ze via
 * COMMON_WORN_ARMOR (zie wornWarrior.ts); de rijen staan maar op één plek.
 * Alleen wat met zekerheid zonder jobregel is staat hier; de overige rijen (o.a. 732 tot 736, 949, 950, 1169, 1170
 * en 1316, die een Thief-jobregel hebben) zijn niet opnieuw op hun pagina gecontroleerd en blijven Thief-only.
 */
const COMMON_WORN_IDS: ReadonlySet<number> = new Set([
  719, 720, 721, 722, 723, 782, 960, 1317, 1318, 1319,
  932, 933, 934, 935, 936, 937, 938, 939, 940, 1156, 1157, 1160, 1305, 1306, 1307, 1308,
  708, 709, 710, 711, 712, 713, 714, 715, 716, 717, 718, 740, 741, 742, 961, 962, 963, 1163, 1181, 1233,
])

/** De rijen uit WORN_ARMOR die geen jobregel hebben (zie COMMON_WORN_IDS); dezelfde objecten, niet gekopieerd. */
export const COMMON_WORN_ARMOR: readonly WornArmor[] = WORN_ARMOR.filter((a) =>
  COMMON_WORN_IDS.has(Number(a.source.url.split('/').pop())),
)

/** Niet-winkel claws, van laag naar hoog level. */
export const WORN_CLAWS: readonly WornClaw[] = [
  { name: "Beginner's Garnier", level: 10, watk: 10, speed: FAST5, source: src(681) },
  { name: 'Mithril Titans', level: 15, watk: 14, speed: FAST4, source: src(683) },
  { name: 'Gold Titans', level: 15, watk: 14, speed: FAST4, source: src(684) },
  { name: 'Bronze Igor', level: 20, watk: 16, speed: FAST4, source: src(685) },
  { name: 'Adamantium Igor', level: 20, watk: 17, speed: FAST4, source: src(687) },
  { name: 'Mithril Guards', level: 30, watk: 23, speed: FAST4, source: src(690) },
]
