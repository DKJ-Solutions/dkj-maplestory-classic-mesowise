// De Bowman-gegevens (issue #44, stap 1): bogen, kruisbogen, pijlen en armor uit NPC-winkels, Arrow Blow en
// Double Shot, de passieven en de buff van de eerste job, HP en MP per level, de accuracy-formule en de
// constanten van de projectiel-schadeformule. Nog niet aangesloten op de app of het mob-model; dit is alleen de
// bron. Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-04, per item de itempagina, per skill de skillpagina en
// per regel hieronder de gids waar hij staat; elk getal is in twee leesrondes gelijk bevonden
// (de itempagina's twee keer letterlijk; skills, gidsen en HP/MP eerst als samenvatting, daarna letterlijk). De prijs is wat de
// winkel vraagt onder "Where to buy", niet de "NPC Sell-back" (die is hier niet de helft: tussen 1/2 en 1/4).
//
// Dezelfde regels als magician.ts en armor.ts, en voor wapens ook:
// - Level 10 tot 30, met een jobregel op de pagina die Bowman noemt en een vaste winkelprijs.
// - Eén regel per item. Wat de pagina niet als eis noemt (STR, meestal) staat als 0.
// - Bogen en kruisbogen komen van Karl (Henesys Weapon Store), armor van Sam (Armor Seller); de Bowman-job
//   begint op level 10 (geen stat-eis, volgens de klassegids; één samenvattende lezing).
//
// Niet opgenomen als wapen, en waarom:
// - Beginner's War Bow (664): niet verhandelbaar en niet te koop.
// - 669, 670, 671 en 677 tot en met 679: boven level 30.
//
// Zonder jobregel, en dus voor elke klas (Dave, #55, 2026-10-04): de White Bandana (719, Don Hwang in Kerning City
// en Natasha in Lith Harbor) en de Red Baseball Cap (781, Sam), zie armor.ts. Ze vragen geen DEX of STR.
//
// Niet opgenomen als armor, en waarom:
// - Brown Skullcap (708): geen jobregel, maar level 5, onder de grens van 10.
// - Items met fame-eis: Whitebottom Boots (1364 tot en met 1367, fame 20) en Old Wisconsin (761, fame 10).
// - Overalls: er zijn er geen in de winkel van Sam. Shoes op level 25 en 30 staan niet in de gelezen lijst.
// - Handschoenen, schilden en capes: niet gelezen, dus niet in de data.
//
// Wel opgenomen, volgens armor.ts ("een mannen- en een vrouwenversie met dezelfde stats blijven"): paren met
// identieke eisen, WDEF en prijs. Eén regel per paar, met de mannenpagina als bron; het id staat hier tussen
// haakjes. Tops: Archer Top (946) en Avelin (955, 956); Leather Hoodwear (966, 967) en Able Armor (974 tot en met
// 976); Hard Leather Top (984) en Shivermail (994 tot en met 996); Bennis Chainmail (1003 tot en met 1006) en
// Yellow Bennis Chainmail (1016); Hunter's Armor (1023, 1026) en Huntress Armor (1034, 1035). Bottoms level 30:
// Hunter's Pants (1238, 1241) en Huntress Pants (1249, 1250).
// Waar er een uniseks-bottom is (level 10: Archer Pants 1180, level 20: Hard Leather Pants 1215, level 25: Bennis
// Chain Pants 1232) staat die, en de rok met dezelfde stats telt niet apart: Avelin Skirt (1175, 1176) en
// Shivermail Skirt (1209 tot en met 1211).
//
// Level 15 bottom (Dave, #107, 2026-10-04): alleen de Able-rokken (1190 tot en met 1192), "Female only", zonder
// uniseks- of mannenversie (Sam, https://meowdb.com/msclassic/npcs/211, heeft geen andere level-15 bottom). De app
// vraagt het geslacht sinds #55, dus de Green Able Armor Skirt (1190) staat erin met `gender: 'female'`; een
// mannelijke Bowman heeft op level 15 geen bottom in de winkel. De andere kleuren (Brown Able Skirt 1191, Grey Able
// Skirt 1192) hebben dezelfde eisen, WDEF en prijs en staan in GENDERED_WORN_BOWMAN_ARMOR. Gelezen uit de ruwe
// itempagina's, twee keer. Andere Bowman-stukken die alleen om hun geslacht ontbraken zijn er niet: elke top en
// bottom van Sam staat hierboven als paar of uniseks-stuk.
//
// Bij de hoeden (730 en 731, 751 tot en met 755, 771 tot en met 775, 798 tot en met 802, 818 en 822) en schoenen
// (1313 en 1314, 1324 tot en met 1326, 1340 tot en met 1343) hebben de varianten dezelfde eisen, WDEF en prijs
// en verschilt alleen de bonusstat; die negeert de app. Er is er één opgenomen (het eerste id).
//
// Niet opgenomen als pijl, en waarom:
// - Bronze Arrows for Bows (210) en for Crossbows (214): 2 meso per pijl, +1 W.ATT, maar alleen te koop bij
//   Raymond met de citizenship-rang "Helpful Stranger" of hoger. Ze staan apart, in HELPFUL_STRANGER_ARROWS: de
//   speler zet ze aan als hij die rang heeft (Dave, 4 oktober 2026, #64).
// - Iron (211, 215), Adamantium en Mithril (212, 216): alleen te maken, niet te koop.
import { SPEED } from './attackSpeed'
import type {
  Arrow,
  BowmanArmor,
  BowmanWeapon,
  BowmanWeaponKind,
  FocusLevel,
  Gender,
  SkillLevel,
  Source,
  WornArmor,
} from './types'

const R = '2026-10-04'
const item = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })
const skill = (name: string): Source => ({ url: `https://meowdb.com/msclassic/skills/bowman/${name}`, retrieved: R })
const guide = (name: string): Source => ({ url: `https://meowdb.com/msclassic/guides/${name}`, retrieved: R })
const npc = (id: number): Source => ({ url: `https://meowdb.com/msclassic/npcs/${id}`, retrieved: R })

// De Balanche (674) staat als "Normal (6)" met een cyclus van 840 ms, op de itempagina en op de Arrow
// Blow-pagina ("Crossbow Normal (6): 840 ms"). De gedeelde tabel heeft normal6 = 810, en dat is de waarde van een
// boog. We leggen vast wat de pagina print, zonder SPEED.normal6 te veranderen.
const BALANCHE_SPEED = { label: SPEED.normal6.label, attackMs: 840 }

const weapon = (
  id: number,
  name: string,
  kind: BowmanWeaponKind,
  level: number,
  str: number,
  dex: number,
  watk: number,
  speed: BowmanWeapon['speed'],
  price: number,
): BowmanWeapon => ({ name, kind, level, str, dex, watk, speed, price, source: item(id) })

/** De NPC-bogen en -kruisbogen voor een Bowman, eerst alle bogen en dan alle kruisbogen, van laag naar hoog level. */
export const NPC_BOWMAN_WEAPONS: readonly BowmanWeapon[] = [
  weapon(663, 'War Bow', 'bow', 10, 0, 25, 30, SPEED.normal6, 5_000),
  weapon(665, 'Composite Bow', 'bow', 15, 15, 35, 35, SPEED.normal6, 7_000),
  weapon(666, "Hunter's Bow", 'bow', 20, 20, 45, 42, SPEED.normal6, 13_500),
  weapon(667, 'Battle Bow', 'bow', 25, 25, 55, 44, SPEED.fast5, 16_500),
  weapon(668, 'Ryden', 'bow', 30, 30, 65, 50, SPEED.normal6, 26_000),
  weapon(672, 'Crossbow', 'crossbow', 10, 0, 25, 32, SPEED.slow7, 5_000),
  weapon(673, 'Battle Crossbow', 'crossbow', 15, 0, 35, 37, SPEED.slow7, 7_000),
  weapon(674, 'Balanche', 'crossbow', 20, 10, 45, 39, BALANCHE_SPEED, 13_500),
  weapon(675, 'Mountain Crossbow', 'crossbow', 25, 15, 55, 47, SPEED.slow7, 16_500),
  weapon(676, 'Eagle Crow', 'crossbow', 30, 20, 65, 52, SPEED.slow7, 26_000),
]

/**
 * De gewone pijlen: 1 meso per pijl, geen W.ATT op de pagina (staat als 0). Te koop bij Luna (Henesys Dept
 * Store) en elf anderen, onder wie Arturo, voor dezelfde prijs; de prijs is per pijl, de stack van de pagina is geen
 * koopmaat. Het projectiel-W.ATT telt mee in de totale W.ATT (de damage-gids). Bronze en beter: zie de kop.
 */
export const NPC_ARROWS: readonly Arrow[] = [
  { name: 'Arrows for Bows', watk: 0, pricePerArrow: 1, for: 'bow', source: item(209) },
  { name: 'Arrows for Crossbows', watk: 0, pricePerArrow: 1, for: 'crossbow', source: item(213) },
]

/**
 * De bronze pijlen: +1 W.ATT voor 2 meso per pijl. Alleen Raymond (Henesys Town Hall) verkoopt ze, en zijn winkel
 * zet "(Helpful Stranger+)" achter beide; de itempagina's noemen die eis niet. Volgens de klasgids is Helpful
 * Stranger grade 3, "which needs level 22 and 2,000 citizenship contribution". De app kent de rang van een speler
 * niet, dus ze tellen pas mee als hij ze aanzet (#64); uit staan alleen NPC_ARROWS.
 */
export const HELPFUL_STRANGER_ARROWS: readonly Arrow[] = [
  { name: 'Bronze Arrows for Bows', watk: 1, pricePerArrow: 2, for: 'bow', source: item(210) },
  { name: 'Bronze Arrows for Crossbows', watk: 1, pricePerArrow: 2, for: 'crossbow', source: item(214) },
]

/** Waar de rang-eis van de bronze pijlen staat: Raymonds winkel ("Helpful Stranger+"), en de klasgids voor wat die rang vraagt. */
export const HELPFUL_STRANGER_SOURCES: readonly Source[] = [npc(232), guide('bowman-class-guide')]

const armor = (
  id: number,
  name: string,
  slot: BowmanArmor['slot'],
  level: number,
  str: number,
  dex: number,
  wdef: number,
  price: number,
  gender?: Gender,
): BowmanArmor => ({ name, slot, level, str, dex, wdef, price, source: item(id), ...(gender ? { gender } : {}) })

/**
 * De NPC-armor voor een Bowman, per slot (hat, top, bottom, shoes) van laag naar hoog level. Zie de kop voor wat
 * ontbreekt. Alleen de level-15 bottom is voor één geslacht (#107); de andere tops en bottoms hebben een even sterk
 * stuk voor het andere geslacht of zijn uniseks.
 */
export const NPC_BOWMAN_ARMOR: readonly BowmanArmor[] = [
  armor(730, 'Winter Hat', 'hat', 10, 0, 10, 15, 1_200),
  armor(719, 'White Bandana', 'hat', 10, 0, 0, 15, 1_200),
  armor(751, 'Feather Hat', 'hat', 15, 0, 20, 18, 1_800),
  armor(771, 'Robin Hat', 'hat', 20, 10, 30, 21, 3_600),
  armor(781, 'Red Baseball Cap', 'hat', 22, 0, 0, 22, 3_900),
  armor(798, 'Hunter', 'hat', 25, 15, 40, 24, 4_500),
  armor(818, 'Hawkeye', 'hat', 30, 20, 50, 27, 7_200),
  armor(946, 'Archer Top / Avelin', 'top', 10, 0, 10, 24, 2_000),
  armor(966, 'Leather Hoodwear / Able Armor', 'top', 15, 0, 20, 28, 3_000),
  armor(984, 'Hard Leather Top / Shivermail', 'top', 20, 10, 30, 32, 6_000),
  armor(1003, 'Bennis Chainmail / Yellow Bennis Chainmail', 'top', 25, 15, 40, 36, 7_500),
  armor(1023, "Hunter's Armor / Huntress Armor", 'top', 30, 20, 50, 40, 12_000),
  armor(1180, 'Archer Pants', 'bottom', 10, 0, 10, 17, 1_600),
  armor(1190, 'Green Able Armor Skirt', 'bottom', 15, 0, 20, 20, 2_400, 'female'),
  armor(1215, 'Hard Leather Pants', 'bottom', 20, 10, 30, 23, 4_800),
  armor(1232, 'Bennis Chain Pants', 'bottom', 25, 15, 40, 26, 6_000),
  armor(1238, "Hunter's Pants / Huntress Pants", 'bottom', 30, 20, 50, 29, 9_600),
  armor(1313, 'Hard Leather Boots', 'shoes', 10, 0, 10, 10, 1_200),
  armor(1324, 'Woodsman Boots', 'shoes', 15, 0, 20, 12, 1_800),
  armor(1340, 'Huntertop', 'shoes', 20, 10, 30, 14, 3_600),
]

/**
 * De andere kleuren van de level-15 Able-rok (#107): even sterk en even duur als de Green Able Armor Skirt in
 * NPC_BOWMAN_ARMOR, alleen een andere bonusstat (die negeert de app). Ze staan in de zoekbalk van "Equip",
 * zonder prijs, zoals de kleuren in wornWarrior.ts.
 */
export const GENDERED_WORN_BOWMAN_ARMOR: readonly WornArmor[] = [
  { name: 'Brown Able Skirt', slot: 'bottom', level: 15, wdef: 20, gender: 'female', source: item(1191) },
  { name: 'Grey Able Skirt', slot: 'bottom', level: 15, wdef: 20, gender: 'female', source: item(1192) },
]

/**
 * Arrow Blow: MP en schade per skill-level (1 tot 20). "1 hit per target", 1 target, 1 pijl per cast. Het aantal
 * pijlen per cast komt uit de klasgids (bowman-class-guide), niet van de skillpagina. Bereik 350 px (tot 470).
 * Geen eigen cast-tijd: de aanvalscyclus van het wapen. De schade springt van 232 op level 19 naar 240 op
 * level 20 (de rest stijgt met 4).
 */
export const ARROW_BLOW_SOURCE: Source = skill('arrow-blow')
export const ARROW_BLOW_LEVELS: readonly SkillLevel[] = [
  [6, 160], [6, 164], [6, 168], [6, 172], [7, 176], [7, 180], [7, 184], [8, 188], [8, 192], [9, 196],
  [9, 200], [10, 204], [10, 208], [11, 212], [11, 216], [12, 220], [12, 224], [13, 228], [13, 232], [14, 240],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct }))
export const ARROW_BLOW_TARGETS = 1
export const ARROW_BLOW_HITS = 1
export const ARROW_BLOW_ARROWS = 1

/**
 * Double Shot (vraagt Arrow Blow 1): MP en schade per skill-level (1 tot 20). Tot 2 targets en "1 hit per target"
 * op de skillpagina, 2 pijlen per cast (klasgids). De gids zegt ook "two hits on one mob"; dat spreekt de
 * skillpagina tegen, en de skillpagina wint. Bereik 300 px (tot 420). De schade springt van 116 op level 19
 * naar 120 op level 20 (de rest stijgt met 2).
 */
export const DOUBLE_SHOT_SOURCE: Source = skill('double-shot')
export const DOUBLE_SHOT_LEVELS: readonly SkillLevel[] = [
  [8, 80], [8, 82], [8, 84], [8, 86], [9, 88], [9, 90], [9, 92], [10, 94], [10, 96], [11, 98],
  [11, 100], [12, 102], [12, 104], [13, 106], [13, 108], [14, 110], [14, 112], [15, 114], [15, 116], [16, 120],
].map(([mp, damagePct], i) => ({ level: i + 1, mp, damagePct }))
export const DOUBLE_SHOT_TARGETS = 2
export const DOUBLE_SHOT_HITS = 1
export const DOUBLE_SHOT_ARROWS = 2

/**
 * Critical Shot (passief, level 1 tot 15): de kans op een critical in procent (5 tot en met 18, +1 per level,
 * en 20 op level 15) en de extra critical-schade (+1 tot en met +15).
 */
export const CRITICAL_SHOT = {
  source: skill('critical-shot'),
  critPct: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20],
  critDamage: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
} as const

/** The Eye of Amazon (passief, level 1 tot 15): alleen extra bereik, +50 op level 1 en +5 per level (+120 op level 15). */
export const EYE_OF_AMAZON = {
  source: skill('the-eye-of-amazon'),
  range: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120],
} as const

/**
 * Focus (buff, level 1 tot 20, vraagt The Eye of Amazon 3): extra accuracy (+1 per level), extra evasion (de
 * kolom heet "Evasion": +5 op level 1, +1 per level, en +25 op level 20, een extra sprong op het laatste level zoals
 * bij Arrow Blow), MP per cast (8, 10, 13 en 16 per blok van vijf levels) en de duur (70 tot 110, 130 tot 170,
 * 195 tot 235 en 260 tot 300 seconden, steeds +10 per level).
 */
export const FOCUS_SOURCE: Source = skill('focus')
export const FOCUS_LEVELS: readonly FocusLevel[] = Array.from({ length: 20 }, (_, i) => {
  const block = Math.floor(i / 5)
  return {
    level: i + 1,
    accuracy: i + 1,
    evasion: i === 19 ? 25 : 5 + i,
    mp: [8, 10, 13, 16][block],
    seconds: [70, 130, 195, 260][block] + (i % 5) * 10,
  }
})

/**
 * Blessing of Amazon bestaat niet op MeowDB (de pagina geeft 404) en zit dus niet in de data.
 */

/**
 * De projectiel-schadeformule (guides/explaining-the-damage-formula). S = schade% / 100, DEX is de primaire stat
 * en STR de secundaire:
 * MIN = S x TotalWATK x (0,8 + (DEX x m x 2,5 + STR) / 100 + AP / 50),
 * MAX = S x TotalWATK x (1,0 + (DEX x 2,5 + STR) / 100 + AP / 50),
 * met m de mastery (alleen in MIN). De rij "Bow / Crossbow / Claw" geeft Shoot = 2,5. Het projectiel-W.ATT zit in
 * TotalWATK. Verdediging verlaagt de schade zoals bij de andere klassen.
 */
export const BOWMAN_DAMAGE = {
  shootMultiplier: 2.5,
  statDiv: 100,
  apDiv: 50,
  primary: 'dex',
  secondary: 'str',
  source: guide('explaining-the-damage-formula'),
} as const

/**
 * De basismastery m = (masteryniveau / 10 + 0,1) x 0,8, en bij niveau 0 is dat 0,08 ("Mastery at Lv 0 = ... =
 * 0.08", gids). Dat de eerste-job Bowman op niveau 0 zit is AFGELEID: de gids noemt de Bowman daar niet en geen
 * enkele gelezen pagina geeft zijn mastery-niveau.
 */
export const BOWMAN_MASTERY_BASE = 0.08

/** De damage-gids met de accuracy-formules per klas (sectie "Derived combat stats"). */
export const BOWMAN_ACCURACY_SOURCE: Source = guide('explaining-the-damage-formula')

/**
 * Het stat-deel van de Bowman-accuracy: floor(Common / 4,8 + 20), met Common = 1,2 x DEX + 2 x level + 0,6 x LUK
 * (de totale DEX en LUK). Geschreven in gehele getallen (alles x 48): zie baseAccuracy in thief.ts voor de reden.
 */
export const bowmanAccuracy = (dex: number, level: number, luk: number): number =>
  Math.floor((12 * dex + 20 * level + 6 * luk + 960) / 48)

/**
 * Max HP en MP per level-up zijn vast: de Beginner +16 HP en +12 MP, de Bowman +22 HP en +17 MP. De
 * job-advancement geeft eenmalig +250 HP en +250 MP. De eerste level-up met de Bowman-waarde is 10 naar 11; dat
 * is AFGELEID, want de gids heeft geen voorbeeldrij voor level 10 of 11 van een Bowman.
 */
export const BOWMAN_HP_MP = {
  beginner: { hp: 16, mp: 12 },
  bowman: { hp: 22, mp: 17 },
  bowmanFromLevel: 10,
  advancement: { hp: 250, mp: 250 },
  source: guide('hp-mp-gain-explained'),
  levelSource: guide('bowman-class-guide'),
} as const

/** De Max HP die een level-up geeft, vanaf dit level. (De eenmalige +250 HP van de job-advancement zit er niet in.) */
export const bowmanHpPerLevelFrom = (level: number): number =>
  level >= BOWMAN_HP_MP.bowmanFromLevel ? BOWMAN_HP_MP.bowman.hp : BOWMAN_HP_MP.beginner.hp

/** De Max MP die een level-up geeft, vanaf dit level. (De eenmalige +250 MP van de job-advancement zit er niet in.) */
export const bowmanMpPerLevelFrom = (level: number): number =>
  level >= BOWMAN_HP_MP.bowmanFromLevel ? BOWMAN_HP_MP.bowman.mp : BOWMAN_HP_MP.beginner.mp
