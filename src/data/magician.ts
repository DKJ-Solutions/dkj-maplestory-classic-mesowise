// De Magician-gegevens (issue #43, stap 1): wands, staffs en armor uit NPC-winkels, Energy Bolt, Magic Claw en
// de passieven en buffs van de eerste job, HP en MP per level, de accuracy-formule, de constanten van de
// magic-schadeformule en de MP-potions. Nog niet aangesloten op de app of het mob-model; dit is alleen de bron.
// Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-04, per item de itempagina, per skill de skillpagina en per
// regel hieronder de gids waar hij staat. De prijs is wat de winkel vraagt onder "Where to buy", niet de
// "NPC Sell-back" (die is hier niet de helft: tussen 1/2 en 1/4).
//
// Dezelfde regels als warrior.ts en armor.ts, en voor wapens ook:
// - Level 10 tot 30, met een jobregel op de pagina die Mage noemt of zonder jobregel, en een vaste winkelprijs.
// - Eén regel per item. Wat de pagina niet als eis noemt (STR, DEX) staat niet in de data; INT of LUK die niet
//   genoemd wordt staat als 0.
// - Wands en staffs komen van Flora the Fairy, armor van Serabi the Fairy (beide Ellinia); de Magician-job
//   begint op level 10 (Grendel, geen stat-eis).
//
// Zonder jobregel, en dus voor elke klas (Dave, #55, 2026-10-04): Wooden Wand (648), Hardwood Wand (650) en
// Metal Wand (651), ook van Flora, gelezen uit de ruwe pagina. Bij armor de White Bandana (719, Don Hwang in
// Kerning City en Natasha in Lith Harbor) en de Red Baseball Cap (781, Sam in Henesys), zie armor.ts: ze vragen
// geen INT of LUK en hun pagina toont geen MDEF, dus die staan op 0.
//
// Niet opgenomen als wapen, en waarom:
// - Beginner's Wooden Wand (649): niet verhandelbaar en niet te koop. Geen staff op level 30.
//
// Niet opgenomen als armor, en waarom:
// - Tops en broeken alleen voor vrouwen, zonder mannenversie in de gelezen pagina's: Arianne (970 tot en met
//   973, level 15), Fairy Top (1031 en 1032, level 30), Arianne Skirt (1186 tot en met 1189, level 15) en
//   Fairy Skirt (1246 en 1247, level 30). Ze staan er nog niet in, omdat de app de
//   Magician nog niet doorrekent (#43); met `gender` kunnen ze erbij zodra dat model er is (zie #55).
// - Robes alleen voor mannen, zonder vrouwenversie bij Serabi (#76, ruwe pagina's gelezen op 2026-10-04): Plain
//   Robe (1091 tot en met 1093: level 15, INT 20, WDEF 29, MDEF 38, 5.400 meso) en Wizard Robe (1107 en 1110:
//   level 30, INT 50, LUK 20, WDEF 46, MDEF 55, 21.600 meso). Ze kunnen erbij met `gender` (#55) zodra de Magician wordt doorgerekend (#43).
// - Handschoenen, schilden, capes en de winkels in Orbis en Nuri: niet gelezen, dus niet in de data.
//
// Wel opgenomen, volgens armor.ts ("een mannen- en een vrouwenversie met dezelfde stats blijven"): vijf paren
// met identieke eisen, WDEF, MDEF en prijs. Eén regel per paar, met de mannenpagina als bron. Training Shirt
// (944 en 945) en Armine (953 en 954); Split Piece (981 tot en met 983) en Split (991 tot en met 993); Training
// Pants (1166 en 1167) en Armine Skirt (1173 en 1174); Split Pants (1199 en 1200) en Split Skirt (1207 en 1208);
// en de overall Doros Robe (1098 tot en met 1101) en Doroness Robe (1102 tot en met 1104), level 25, INT 40,
// LUK 15, WDEF 40, MDEF 49, 13.500 meso bij Serabi (#76). Alle zeven robe-pagina's zijn ruw gelezen.
//
// Bij de hoeden (727 tot en met 729, 746 tot en met 750, 768 tot en met 770, 813 en 817) en schoenen (1310 tot
// en met 1312, 1322 en 1323, 1337 tot en met 1339, 1354 tot en met 1356) hebben de varianten dezelfde eisen,
// WDEF, MDEF en prijs en verschilt alleen de bonusstat; die negeert de app. Er is er één opgenomen (het eerste
// id); 750, 770, 817, 1312, 1339 en 1356 zijn nagelopen. De pagina van de Apprentice Hat (727) zegt WDEF 8; een
// zoekresultaat zei 5, de pagina wint.
import { SPEED } from './attackSpeed'
import type {
  MagicArmorLevel,
  MagicianArmor,
  MagicianWeapon,
  MagicianWeaponKind,
  Potion,
  Source,
  SpellLevel,
} from './types'

const R = '2026-10-04'
const item = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })
const skill = (name: string): Source => ({ url: `https://meowdb.com/msclassic/skills/magician/${name}`, retrieved: R })
const guide = (name: string): Source => ({ url: `https://meowdb.com/msclassic/guides/${name}`, retrieved: R })

// De staff-pagina's (657 tot en met 661) noemen "Slow (7)" met "Attack cycle 810ms", gemeten op 657 en 661. Dat
// komt niet overeen met de gedeelde tabel (slow7 = 870, zoals de Warrior-wapens 633 en 626 het geven): de
// staff-pagina toont de cyclus van de magic-actie. We leggen vast wat de pagina print, zonder het in
// SPEED.slow7 te dwingen. Spreuken gebruiken toch de vaste cast van 810 ms, en een Magician heeft geen Attack
// Speed Booster in de eerste of tweede job (de pagina).
const STAFF_SPEED = { label: SPEED.slow7.label, attackMs: 810 }

const weapon = (
  id: number,
  name: string,
  kind: MagicianWeaponKind,
  level: number,
  int: number,
  luk: number,
  watk: number,
  matk: number,
  speed: MagicianWeapon['speed'],
  price: number,
): MagicianWeapon => ({ name, kind, level, int, luk, watk, matk, speed, price, source: item(id) })

/** De NPC-wands en -staffs voor een Magician, van laag naar hoog level. */
export const NPC_MAGICIAN_WEAPONS: readonly MagicianWeapon[] = [
  weapon(648, 'Wooden Wand', 'wand', 10, 20, 0, 18, 27, SPEED.normal6, 3_000),
  weapon(657, 'Wooden Staff', 'staff', 10, 20, 0, 20, 24, STAFF_SPEED, 3_000),
  weapon(650, 'Hardwood Wand', 'wand', 15, 30, 0, 23, 34, SPEED.normal6, 5_000),
  weapon(658, 'Sapphire Staff', 'staff', 15, 30, 10, 25, 31, STAFF_SPEED, 5_000),
  weapon(659, 'Emerald Staff', 'staff', 15, 30, 10, 25, 31, STAFF_SPEED, 5_000),
  weapon(651, 'Metal Wand', 'wand', 20, 40, 10, 21, 41, SPEED.normal6, 10_500),
  weapon(660, 'Old Wooden Staff', 'staff', 20, 40, 15, 30, 38, STAFF_SPEED, 10_500),
  weapon(652, 'Ice Wand', 'wand', 25, 50, 15, 24, 48, SPEED.normal6, 13_500),
  weapon(661, 'Wizard Staff', 'staff', 25, 50, 20, 35, 45, STAFF_SPEED, 13_500),
  weapon(653, 'Mithril Wand', 'wand', 30, 60, 20, 27, 55, SPEED.normal6, 22_000),
]

const armor = (
  id: number,
  name: string,
  slot: MagicianArmor['slot'],
  level: number,
  int: number,
  luk: number,
  wdef: number,
  mdef: number,
  price: number,
): MagicianArmor => ({ name, slot, level, wdef, mdef, int, luk, price, source: item(id) })

/** De NPC-armor voor een Magician, per slot (hat, top, bottom, overall, shoes) van laag naar hoog level. Zie de kop voor wat ontbreekt. */
export const NPC_MAGICIAN_ARMOR: readonly MagicianArmor[] = [
  armor(727, 'Apprentice Hat', 'hat', 10, 10, 0, 8, 10, 1_200),
  armor(719, 'White Bandana', 'hat', 10, 0, 0, 15, 0, 1_200),
  armor(746, 'Moon Conehat', 'hat', 15, 20, 0, 10, 12, 1_800),
  armor(768, 'Wizardry Hat', 'hat', 20, 30, 10, 12, 14, 3_600),
  armor(781, 'Red Baseball Cap', 'hat', 22, 0, 0, 22, 0, 3_900),
  armor(813, 'Jester', 'hat', 30, 50, 20, 16, 18, 7_200),
  armor(944, 'Training Shirt / Armine', 'top', 10, 10, 0, 13, 18, 2_000),
  armor(981, 'Split Piece / Split', 'top', 20, 30, 10, 19, 24, 6_000),
  armor(1166, 'Training Pants / Armine Skirt', 'bottom', 10, 10, 0, 9, 12, 1_600),
  armor(1199, 'Split Pants / Split Skirt', 'bottom', 20, 30, 10, 13, 16, 4_800),
  armor(1098, 'Doros Robe / Doroness Robe', 'overall', 25, 40, 15, 40, 49, 13_500),
  armor(1310, 'Basic Boots', 'shoes', 10, 10, 0, 5, 6, 1_200),
  armor(1322, 'Nitty', 'shoes', 15, 20, 0, 6, 7, 1_800),
  armor(1337, 'Jewelry Boots', 'shoes', 20, 30, 10, 7, 8, 3_600),
  armor(1354, 'Wind Shoes', 'shoes', 25, 40, 15, 8, 9, 4_500),
]

/**
 * De MP-potions van Len the Fairy (Ellinia): Orange (239) en Lemon (240). De Blue Potion (273) staat al in
 * POTIONS in spots.ts. Magic Potion (223) is een buff van +10 M.ATT en geen potion. De namen zijn zoals de
 * pagina's ze geven; "Orange" is dus niet de Orange Potion (HP) uit spots.ts.
 */
export const MAGICIAN_MP_POTIONS: readonly Potion[] = [
  { name: 'Orange', hp: 0, mp: 50, price: 50, source: item(239) },
  { name: 'Lemon', hp: 0, mp: 150, price: 150, source: item(240) },
]

const MASTERY = [1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10]

/**
 * Energy Bolt: MP, schade en spell mastery per skill-level (1 tot 20). Raakt 1 mob, 1 hit. De schade springt
 * van 126 op level 19 naar 130 op level 20 (de rest stijgt met 2).
 */
export const ENERGY_BOLT_SOURCE: Source = skill('energy-bolt')
export const ENERGY_BOLT_LEVELS: readonly SpellLevel[] = [
  [8, 90], [8, 92], [8, 94], [8, 96], [9, 98], [9, 100], [9, 102], [10, 104], [10, 106], [11, 108],
  [11, 110], [12, 112], [12, 114], [13, 116], [13, 118], [14, 120], [14, 122], [15, 124], [15, 126], [16, 130],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct, mastery: MASTERY[i] }))
export const ENERGY_BOLT_TARGETS = 1

/**
 * Magic Claw: MP, schade per hit en spell mastery per skill-level (1 tot 20). Raakt 1 mob, 2 hits per mob.
 * Vraagt Energy Bolt 1. De schade is per hit, en zo staat het op de pagina (sectie "How output is calculated",
 * gelezen in de ruwe HTML, issue #90): "Magic Claw creates 2 magic hits using skill power 45 to 65. Each hit scales
 * with INT, Magic Attack, and spell mastery", en "Hits Per Cast: 2". Het klopt ook met 2 x 65 = 130, de Energy
 * Bolt op level 20. De mastery is dezelfde als bij Energy Bolt.
 */
export const MAGIC_CLAW_SOURCE: Source = skill('magic-claw')
export const MAGIC_CLAW_LEVELS: readonly SpellLevel[] = [
  [10, 45], [10, 46], [10, 47], [10, 48], [11, 49], [11, 50], [11, 51], [12, 52], [12, 53], [13, 54],
  [13, 55], [14, 56], [14, 57], [15, 58], [15, 59], [16, 60], [17, 61], [18, 62], [19, 63], [20, 65],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct, mastery: MASTERY[i] }))
export const MAGIC_CLAW_TARGETS = 1
export const MAGIC_CLAW_HITS = 2
/** Het Energy Bolt-level dat Magic Claw vraagt om te kunnen leren (de skillpagina: "Vraagt Energy Bolt 1"). */
export const MAGIC_CLAW_REQUIRES_ENERGY_BOLT = 1

/** De cast-animatie van een spreuk in ms, en met Spell Booster (de skillpagina's van de eerste job). */
export const SPELL_CAST_MS = { normal: 810, withSpellBooster: 720 } as const

/**
 * Magic Guard (buff, level 1 tot 15): het deel van de HP-schade dat naar MP gaat, in procent per skill-level.
 * Het "MP -8" op de pagina (-10 vanaf level 6, -12 vanaf level 11) lees ik als de MP-kosten van de skill, zoals bij
 * elke skill; de pagina zegt niet waarvoor of per wat, dus dat is afgeleid. De sprongen in de procenten
 * (42 naar 49, 61 naar 68) staan zo op de pagina.
 */
export const MAGIC_GUARD = {
  source: skill('magic-guard'),
  damageToMpPct: [30, 33, 36, 39, 42, 49, 52, 55, 58, 61, 68, 71, 74, 77, 80],
  mp: [8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12],
} as const

/**
 * Magic Armor (buff, level 1 tot 20, vraagt Magic Guard 3): extra WDEF en MDEF (hetzelfde getal) als vast getal,
 * wat elke cast aan MP kost en hoe lang hij duurt. Level 20 volgt het patroon niet (DEF 120 waar 116 volgt, 600
 * seconden waar 585 volgt); dat staat zo op de pagina.
 */
export const MAGIC_ARMOR_SOURCE: Source = skill('magic-armor')
export const MAGIC_ARMOR_LEVELS: readonly MagicArmorLevel[] = [
  [8, 40, 300], [8, 44, 315], [8, 48, 330], [8, 52, 345], [8, 56, 360],
  [10, 60, 375], [10, 64, 390], [10, 68, 405], [10, 72, 420], [10, 76, 435],
  [13, 80, 450], [13, 84, 465], [13, 88, 480], [13, 92, 495], [13, 96, 510],
  [16, 100, 525], [16, 104, 540], [16, 108, 555], [16, 112, 570], [16, 120, 600],
].map(([mp, def, seconds], i) => ({ level: i + 1, mp, def, seconds }))

/**
 * Improved MP Recovery (passief, level 1 tot 15): elk level herstelt 1% van je Max MP per 10 seconden, en
 * het MP-herstel van items stijgt, in procent, per skill-level.
 */
export const IMPROVED_MP_RECOVERY = {
  source: skill('improved-mp-recovery'),
  maxMpPctPer10s: 1,
  itemRecoveryPct: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20],
} as const

/** Max MP Increase (passief, level 1 tot 15, vraagt Improved MP Recovery 3): extra Max MP in procent. */
export const MAX_MP_INCREASE = {
  source: skill('max-mp-increase'),
  maxMpPct: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25],
} as const

/**
 * De magic-schadeformule (guides/explaining-the-damage-formula). S = schade% / 100.
 * MagicTotal = floor(totale INT / 2) + M.ATT van de uitrusting + scrolls + buffs.
 * MIN = S x MagicTotal x (1 + INT x m / 100), MAX = S x MagicTotal x (1 + INT / 100),
 * met m = (spell mastery / 10 + 0,1) x 0,8. W.ATT zit niet in de spreuk-formule. Verdediging verlaagt de schade
 * tot Raw x 100 / (DEF + 100) (een factor, geen aftrek), voor fysiek en magisch; een monster heeft geen aparte MDEF in de data.
 * Spreuken kunnen missen: dezelfde hit-check als fysieke aanvallen.
 */
export const MAGIC_DAMAGE = {
  intPerMagicAttack: 2,
  masteryBase: 0.1,
  masteryScale: 0.8,
  defenceNumerator: 100,
  defenceOffset: 100,
  source: guide('explaining-the-damage-formula'),
} as const

/** De damage-gids met de accuracy-formules per klas (sectie "Derived combat stats"). */
export const MAGICIAN_ACCURACY_SOURCE: Source = guide('explaining-the-damage-formula')

/**
 * Het stat-deel van de Magician-accuracy: floor((1,2 x INT + 2 x level + 0,6 x LUK) / 5,1 + 20), met de totale
 * INT en LUK. Geschreven in gehele getallen (alles x 51): zie baseAccuracy in thief.ts voor de reden.
 */
export const magicianAccuracy = (int: number, level: number, luk: number): number =>
  Math.floor((12 * int + 20 * level + 6 * luk + 1020) / 51)

/**
 * Max HP en MP per level-up zijn vast ("zero variance"): de Beginner +16 HP en +12 MP, de Magician +16 HP en
 * +22 MP. De job-advancement geeft eenmalig +150 HP en +350 MP. De eerste level-up met de Magician-waarde is
 * 10 naar 11 (de HP/MP-gids). INT geeft hier geen extra MP (de gids). Basis: 50 HP en 5 MP.
 */
export const MAGICIAN_HP_MP = {
  beginner: { hp: 16, mp: 12 },
  magician: { hp: 16, mp: 22 },
  magicianFromLevel: 10,
  advancement: { hp: 150, mp: 350 },
  source: guide('hp-mp-gain-explained'),
  levelSource: guide('magician-class-guide'),
} as const

/** De Max HP die een level-up geeft, vanaf dit level. (De eenmalige +150 HP van de job-advancement zit er niet in.) */
export const magicianHpPerLevelFrom = (level: number): number =>
  level >= MAGICIAN_HP_MP.magicianFromLevel ? MAGICIAN_HP_MP.magician.hp : MAGICIAN_HP_MP.beginner.hp

/** De Max MP die een level-up geeft, vanaf dit level. (De eenmalige +350 MP van de job-advancement zit er niet in.) */
export const magicianMpPerLevelFrom = (level: number): number =>
  level >= MAGICIAN_HP_MP.magicianFromLevel ? MAGICIAN_HP_MP.magician.mp : MAGICIAN_HP_MP.beginner.mp
