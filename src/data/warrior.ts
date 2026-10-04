// De Warrior-gegevens (issue #42, stap 1): wapens en armor uit NPC-winkels, Power Strike, Slash Blast en de
// passieven, HP en MP per level, de accuracy-formule en de multiplier van een basisaanval. Nog niet aangesloten
// op de app of het mob-model; dit is alleen de bron. Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-04, per
// item de itempagina, per skill de skillpagina en per regel hieronder de gids waar hij staat. De prijs is wat
// de winkel vraagt onder "Where to buy" (bij alle winkels van een item gelijk), niet de "NPC Sell-back".
//
// Dezelfde regels als armor.ts, en voor wapens ook:
// - Level 10 tot 30, met een jobregel op de pagina die Warrior noemt (ook "Warrior/Mage", "Warrior/Thief",
//   "Warrior/Bowman/Thief") of zonder jobregel, en een vaste winkelprijs.
// - Eén regel per item. Wat de pagina niet als eis noemt (meestal DEX) staat als 0.
//
// Zonder jobregel, en dus voor elke klas (Dave, #55, 2026-10-04): Long Sword (543), Double Axe (577), Steel Pipe
// (588), Leather Purse (589), Red Brick (591), Hard Briefcase (594), Plunger (597) en Sky Blue Umbrella (550),
// gelezen uit de ruwe pagina. Steel Pipe en Sky Blue Umbrella vragen geen STR, dus die staat op 0. De M.ATK van
// de Sky Blue Umbrella (12) laat de app weg: een Warrior gebruikt hem niet. Bij armor zijn dat de White Bandana
// (719) en de Red Baseball Cap (781), zie armor.ts.
//
// Niet opgenomen als armor, en waarom:
// - Alle Warrior-tops en -broeken die ik heb gelezen zijn alleen voor mannen ("Male only"), en geen enkele
//   pagina noemt een vrouwenversie. Onder de regel van armor.ts (de app kent het geslacht niet) vallen ze er
//   dus uit. Tops: 942 en 943 (Lolico Armor, level 10), 964 en 965 (Corporal, 15), 979 en 980 (Sergeant, 20),
//   1000 en 1001 (Master Sergeant, 25), 1021 en 1022 (Hwarang Shirt, 30). Broeken: 1164 en 1165 (Lolico Pants,
//   10), 1182 en 1183 (Corporal Pants, 15), 1197 en 1198 (Sergeant Kilt, 20), 1219 en 1220 (Master Sergeant
//   Kilt, 25), 1234 en 1235 (Martial Arts Pants, 30). Een vrouwenversie, als die bestaat, zit niet in de
//   gelezen pagina's.
// - Overalls: ArmorSlot kent ze sinds #50, maar er staat nog geen Warrior-overall in de data. 1094 Steel Fitted Mail (level 15, alleen vrouwen) en 1095, 1096 en 1097
//   (Kendo Robe, level 20, alleen mannen).
// - Handschoenen en schilden: niet gelezen, dus niet in de data.
//
// Bij de hoeden (762 en 765) en schoenen (1320 en 1321, 1334 tot en met 1336) hebben de varianten dezelfde
// eisen, WDEF en prijs en verschilt alleen de bonusstat (STR, DEX, ACC, HP, Jump, Speed); die negeert de app.
import { SPEED } from './attackSpeed'
import type {
  IronBodyLevel,
  PreciseStrikesLevel,
  SkillLevel,
  SlashBlastLevel,
  Source,
  WarriorArmor,
  WarriorWeapon,
  WarriorWeaponKind,
} from './types'

const R = '2026-10-04'
const item = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })
const skill = (name: string): Source => ({ url: `https://meowdb.com/msclassic/skills/warrior/${name}`, retrieved: R })

// De aanvalssnelheden en hun "Attack cycle" zonder Booster, zoals de itempagina's ze geven.
const { fast4: FAST4, fast5: FAST5, normal6: NORMAL6, slow7: SLOW7 } = SPEED
// Spear en polearm hebben twee cycli: `attackMs` is die van de zwaai (Swing), `stabMs` die van de steek (Stab).
const SLOW7_TWO_CYCLE = { ...SPEED.slow7, stabMs: SPEED.normal6.attackMs }
const SLOW8_POLEARM = { ...SPEED.slow8, stabMs: SPEED.slow7.attackMs }

// De weapon multipliers van de basisaanval per soort (zwaaien en steken), van de itempagina's en de
// damage-gids (sectie "Weapon actions and multipliers").
export const MULT: Record<WarriorWeaponKind, { swing: number; stab: number }> = {
  '1h-sword': { swing: 1.8, stab: 1.8 },
  '2h-sword': { swing: 2.5, stab: 2.5 },
  '1h-axe': { swing: 2.4, stab: 1.2 },
  '1h-blunt': { swing: 2.4, stab: 1.2 },
  '2h-axe': { swing: 3.0, stab: 2.0 },
  '2h-blunt': { swing: 3.0, stab: 2.0 },
  spear: { swing: 1.5, stab: 3.5 },
  polearm: { swing: 3.5, stab: 1.5 },
}

const weapon = (
  id: number,
  name: string,
  kind: WarriorWeaponKind,
  level: number,
  str: number,
  dex: number,
  watk: number,
  speed: WarriorWeapon['speed'],
  price: number,
): WarriorWeapon => ({ name, kind, level, watk, str, dex, speed, mult: MULT[kind], price, source: item(id) })

/** De NPC-wapens voor een Warrior, van laag naar hoog level. */
export const NPC_WARRIOR_WEAPONS: readonly WarriorWeapon[] = [
  weapon(543, 'Long Sword', '1h-sword', 10, 20, 0, 27, FAST4, 3_000),
  weapon(577, 'Double Axe', '1h-axe', 10, 20, 0, 27, FAST4, 3_000),
  weapon(588, 'Steel Pipe', '1h-blunt', 10, 0, 0, 29, FAST5, 3_000),
  weapon(608, 'Wooden Sword', '2h-sword', 10, 25, 0, 30, FAST5, 5_000),
  weapon(617, 'Metal Axe', '2h-axe', 10, 25, 0, 30, FAST5, 5_000),
  weapon(625, 'Wooden Mallet', '2h-blunt', 10, 25, 0, 32, NORMAL6, 5_000),
  weapon(633, 'Spear', 'spear', 10, 25, 0, 32, SLOW7_TWO_CYCLE, 5_000),
  weapon(640, 'Pole Arm', 'polearm', 10, 15, 0, 35, SLOW8_POLEARM, 5_000),
  weapon(589, 'Leather Purse', '1h-blunt', 12, 15, 0, 31, FAST5, 3_800),
  weapon(545, 'Sabre', '1h-sword', 15, 30, 10, 32, FAST4, 5_000),
  weapon(578, 'Battle Axe', '1h-axe', 15, 30, 10, 32, FAST4, 5_000),
  weapon(590, 'Mace', '1h-blunt', 15, 20, 0, 34, FAST5, 5_000),
  weapon(634, 'Fork on a Stick', 'spear', 15, 25, 0, 37, SLOW7_TWO_CYCLE, 7_000),
  weapon(641, 'Iron Ball', 'polearm', 15, 35, 15, 40, SLOW8_POLEARM, 7_000),
  weapon(626, 'Heavy Mace', '2h-blunt', 15, 35, 15, 40, SLOW7, 16_500),
  weapon(591, 'Red Brick', '1h-blunt', 15, 10, 0, 31, FAST4, 5_000),
  weapon(593, 'Square Shovel', '1h-blunt', 17, 11, 11, 36, FAST5, 6_200),
  weapon(595, 'Iron Mace', '1h-blunt', 20, 30, 0, 39, FAST5, 10_500),
  weapon(547, 'Viking Sword', '1h-sword', 20, 40, 15, 37, FAST4, 10_500),
  weapon(548, 'Machete', '1h-sword', 20, 40, 15, 37, FAST4, 10_500),
  weapon(610, 'Two-Handed Sword', '2h-sword', 20, 45, 20, 40, FAST5, 13_500),
  weapon(618, 'Iron Axe', '2h-axe', 20, 45, 20, 35, FAST5, 13_500),
  weapon(627, 'Square Hammer', '2h-blunt', 20, 45, 20, 42, SLOW7, 13_500),
  weapon(642, 'Studded Polearm', 'polearm', 20, 45, 20, 42, SLOW7_TWO_CYCLE, 13_500),
  weapon(594, 'Hard Briefcase', '1h-blunt', 20, 30, 0, 39, FAST5, 10_500),
  weapon(596, 'Pointed Shovel', '1h-blunt', 22, 16, 16, 41, FAST5, 11_700),
  weapon(580, 'Mithril Axe', '1h-axe', 25, 50, 20, 45, FAST5, 13_500),
  weapon(549, 'Eloon', '1h-sword', 25, 50, 20, 42, FAST4, 13_500),
  weapon(598, 'Fusion Mace', '1h-blunt', 25, 40, 0, 41, FAST4, 13_500),
  weapon(611, 'Broadsword', '2h-sword', 25, 55, 25, 45, FAST5, 16_500),
  weapon(620, 'Two-Handed Axe', '2h-axe', 25, 55, 25, 45, FAST5, 16_500),
  weapon(597, 'Plunger', '1h-blunt', 25, 40, 0, 44, FAST5, 13_500),
  weapon(550, 'Sky Blue Umbrella', '1h-sword', 27, 0, 0, 33, FAST4, 14_700),
  weapon(602, 'War Hammer', '1h-blunt', 30, 60, 25, 49, FAST5, 22_000),
  weapon(551, 'Gladius', '1h-sword', 30, 65, 30, 47, FAST4, 22_000),
  weapon(581, "Fireman's Axe", '1h-axe', 30, 60, 25, 47, FAST4, 22_000),
  weapon(613, 'Scimitar', '2h-sword', 30, 65, 30, 53, NORMAL6, 26_000),
  weapon(621, 'Blue Axe', '2h-axe', 30, 65, 30, 50, FAST5, 26_000),
  weapon(644, 'Mithril Pole Arm', 'polearm', 30, 65, 30, 55, SLOW8_POLEARM, 26_000),
]

const armor = (
  id: number,
  name: string,
  slot: WarriorArmor['slot'],
  level: number,
  str: number,
  dex: number,
  wdef: number,
  price: number,
): WarriorArmor => ({ name, slot, level, wdef, str, dex, price, source: item(id) })

/** De NPC-armor voor een Warrior, per slot (hat, shoes) van laag naar hoog level. Tops en broeken: zie de kop. */
export const NPC_WARRIOR_ARMOR: readonly WarriorArmor[] = [
  armor(724, 'Bronze Koif', 'hat', 10, 10, 0, 22, 1_200),
  armor(719, 'White Bandana', 'hat', 10, 0, 0, 15, 1_200),
  armor(737, 'Bronze Helmet', 'hat', 12, 15, 0, 24, 1_400),
  armor(743, 'Bronze Full Helm', 'hat', 15, 20, 0, 26, 1_800),
  armor(762, 'Bronze Football Helmet', 'hat', 20, 30, 10, 30, 3_600),
  armor(765, 'Bronze Viking Helm', 'hat', 20, 30, 10, 30, 3_600),
  armor(781, 'Red Baseball Cap', 'hat', 22, 0, 0, 22, 3_900),
  armor(786, 'Steel Sharp Helm', 'hat', 22, 34, 12, 32, 3_900),
  armor(795, 'Iron Burgernet Helm', 'hat', 25, 40, 15, 34, 4_500),
  armor(812, 'Jousting Helmet', 'hat', 30, 50, 20, 38, 7_200),
  armor(1320, 'Bronze Grieves', 'shoes', 15, 20, 0, 18, 1_800),
  armor(1321, 'Steel Grieves', 'shoes', 15, 20, 0, 18, 1_800),
  armor(1334, 'Brown High Boots', 'shoes', 20, 30, 10, 21, 3_600),
  armor(1335, 'Orange High Boots', 'shoes', 20, 30, 10, 21, 3_600),
  armor(1336, 'Blue High Boots', 'shoes', 20, 30, 10, 21, 3_600),
]

/**
 * Een basisaanval kiest uit drie zwaai-acties en twee steek-acties: 60% zwaai en 40% steek (de damage-gids,
 * "Weapon actions and multipliers"; de itempagina's zeggen hetzelfde). Skills die de gewone aanval gebruiken
 * (Power Strike, Slash Blast) volgen dezelfde verdeling.
 */
export const MELEE_ACTION_SPLIT = {
  swing: 0.6,
  stab: 0.4,
  source: { url: 'https://meowdb.com/msclassic/guides/explaining-the-damage-formula', retrieved: R } satisfies Source,
} as const

// De verdeling in tienden: in gehele getallen rekenen houdt 0,6 x 2,4 + 0,4 x 1,2 precies op 1,92.
const SWING_TENTHS = Math.round(MELEE_ACTION_SPLIT.swing * 10)
const STAB_TENTHS = 10 - SWING_TENTHS

/**
 * De verwachte multiplier van een basisaanval: 0,6 x zwaai + 0,4 x steek. De gids noemt dezelfde waarden:
 * 1,92 voor 1H Axe en Blunt, 2,60 voor 2H Axe en Blunt, 2,30 voor Spear, 2,70 voor Polearm (en 1,8 en 2,5 voor
 * de zwaarden). Geschreven in tienden en op honderdsten afgerond, zodat 0,6 x 2,4 + 0,4 x 1,2 geen 1,9199999
 * wordt.
 */
export const effectiveMultiplier = (mult: { swing: number; stab: number }): number =>
  Math.round((SWING_TENTHS * mult.swing + STAB_TENTHS * mult.stab) * 10) / 100

/**
 * De gemiddelde tijd van een basisaanval in ms, zonder Booster: gewogen met dezelfde 60/40 als de multiplier.
 * Bij zwaard, bijl en stomp is er maar een cyclus; bij spear en polearm is het 0,6 x zwaai + 0,4 x steek.
 */
export const averageAttackMs = (speed: WarriorWeapon['speed']): number =>
  (SWING_TENTHS * speed.attackMs + STAB_TENTHS * (speed.stabMs ?? speed.attackMs)) / 10

/** Power Strike: MP en schade per skill-level (1 tot 20). Raakt 1 mob, 1 hit. */
export const POWER_STRIKE_SOURCE: Source = skill('power-strike')
export const POWER_STRIKE_LEVELS: readonly SkillLevel[] = [
  [4, 160], [4, 165], [4, 170], [4, 175], [5, 180], [5, 185], [5, 190], [6, 195], [6, 200], [7, 205],
  [7, 210], [8, 215], [8, 220], [9, 225], [9, 230], [10, 235], [10, 240], [11, 245], [11, 250], [12, 260],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct }))
export const POWER_STRIKE_TARGETS = 1

/** Slash Blast: HP, MP en schade per skill-level (1 tot 20). Raakt tot 4 mobs, 1 hit per mob. Vraagt Power Strike 1. */
export const SLASH_BLAST_SOURCE: Source = skill('slash-blast')
export const SLASH_BLAST_LEVELS: readonly SlashBlastLevel[] = [
  [3, 4, 70], [3, 4, 73], [3, 4, 76], [3, 4, 79], [4, 5, 82], [4, 5, 85], [4, 5, 88], [5, 6, 91], [5, 6, 94], [5, 7, 97],
  [5, 7, 100], [6, 8, 103], [6, 8, 106], [6, 9, 109], [6, 9, 112], [7, 10, 115], [7, 10, 118], [7, 11, 121], [7, 11, 124], [8, 12, 130],
].map(([hp, mp, damagePct], i) => ({ level: i + 1, hp, mp, damagePct }))
export const SLASH_BLAST_TARGETS = 4

/**
 * Improved HP Recovery (passief, level 1 tot 15): extra HP-herstel van items, in procent, per skill-level.
 * Het herstelt ook HP elke 10 seconden; hoeveel, staat niet op de pagina.
 */
export const IMPROVED_HP_RECOVERY = {
  source: skill('improved-hp-recovery'),
  itemRecoveryPct: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20],
} as const

/** Max HP Increase (passief, level 1 tot 15, vraagt Improved HP Recovery 3): extra Max HP in procent van de basis. */
export const MAX_HP_INCREASE = {
  source: skill('max-hp-increase'),
  maxHpPct: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25],
} as const

/**
 * Iron Body (buff, level 1 tot 20, vraagt Max HP Increase 3): extra Weapon Defense in procent. Elke cast kost
 * 15 MP; de duur is 300 seconden op level 1, 15 erbij per level tot 570 op level 19, en 600 op level 20.
 */
export const IRON_BODY_SOURCE: Source = skill('iron-body')
export const IRON_BODY_LEVELS: readonly IronBodyLevel[] = Array.from({ length: 20 }, (_, i) => ({
  level: i + 1,
  wdefPct: i < 19 ? 5 + i : 25,
  mp: 15,
  seconds: i < 19 ? 300 + 15 * i : 600,
}))

/** Precise Strikes (passief, level 1 tot 15): extra accuracy en extra kans op een critical hit in procent. */
export const PRECISE_STRIKES_SOURCE: Source = skill('precise-strikes')
export const PRECISE_STRIKES_LEVELS: readonly PreciseStrikesLevel[] = [
  [5, 1], [6, 1], [7, 1], [8, 2], [9, 2], [10, 2], [11, 3], [12, 3], [13, 3], [14, 3], [15, 4], [16, 4], [17, 4], [18, 4], [20, 5],
].map(([accuracy, critPct], i) => ({ level: i + 1, accuracy, critPct }))

/**
 * Max HP en MP per level-up zijn vast ("zero variance" in de steekproef): de Beginner +16 HP en +12 MP, de
 * Warrior +28 HP en +12 MP. De job-advancement geeft eenmalig +350 HP en +150 MP en heelt niet (de HP/MP-gids).
 * `warriorFromLevel` is afgeleid, niet als zin gelezen: de Warrior-gids (guides/warrior-class-guide) zegt dat
 * je op level 10 naar Perion gaat voor de advancement, en de HP/MP-gids geeft een Beginner op level 10 met 194
 * HP en 113 MP en een Warrior op level 11 met 572 HP en 275 MP. Dat klopt precies met 194 + 350 + 28 en
 * 113 + 150 + 12, dus de level-up van 10 naar 11 is de eerste met de Warrior-waarde.
 */
export const WARRIOR_HP_MP = {
  beginner: { hp: 16, mp: 12 },
  warrior: { hp: 28, mp: 12 },
  warriorFromLevel: 10,
  advancement: { hp: 350, mp: 150 },
  source: { url: 'https://meowdb.com/msclassic/guides/hp-mp-gain-explained', retrieved: R } satisfies Source,
  levelSource: { url: 'https://meowdb.com/msclassic/guides/warrior-class-guide', retrieved: R } satisfies Source,
} as const

/** De Max HP die een level-up geeft, vanaf dit level. (De eenmalige +350 HP van de job-advancement zit er niet in.) */
export const warriorHpPerLevelFrom = (level: number): number =>
  level >= WARRIOR_HP_MP.warriorFromLevel ? WARRIOR_HP_MP.warrior.hp : WARRIOR_HP_MP.beginner.hp

/** De Max MP die een level-up geeft, vanaf dit level. (De eenmalige +150 MP van de job-advancement zit er niet in.) */
export const warriorMpPerLevelFrom = (level: number): number =>
  level >= WARRIOR_HP_MP.warriorFromLevel ? WARRIOR_HP_MP.warrior.mp : WARRIOR_HP_MP.beginner.mp

/** De damage-gids met de accuracy-formules per klas (sectie "Derived combat stats"). */
export const WARRIOR_ACCURACY_SOURCE: Source = {
  url: 'https://meowdb.com/msclassic/guides/explaining-the-damage-formula',
  retrieved: R,
}

/**
 * Het stat-deel van de Warrior-accuracy: floor(Common / 2,5 + 10) met Common = 1,2 x DEX + 2 x level +
 * 0,6 x LUK, met de totale DEX en LUK. Accuracy uit skills en items (Precise Strikes) komt er los bij.
 * Geschreven in gehele getallen (alles x 25): zie baseAccuracy in thief.ts voor de reden. Het voorbeeld in
 * de gids (DEX 30, level 30, LUK 4) geeft 49.
 */
export const warriorAccuracy = (dex: number, level: number, luk: number): number =>
  Math.floor((12 * dex + 20 * level + 6 * luk + 250) / 25)
