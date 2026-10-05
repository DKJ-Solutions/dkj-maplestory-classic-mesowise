// Items voor de slots shield, gloves, cape en earrings (issue #117, gevuld onder #125). Geen NPC verkoopt ze in de
// app, dus ze hebben geen prijs en komen nooit in het upgrade-advies: ze staan alleen in de zoekbalk van "Equip",
// zodat je kunt kiezen wat je draagt in plaats van een eigen item met zijn DEF in te typen.
//
// Opgehaald bij NiaMeowDB (meowdb.com) op 2026-10-04: per item de eigen itempagina (het vereistenblok met REQ LEV en
// JOB, en het statblok met W.DEF en M.DEF). Welke items er zijn, komt uit het overzicht op /msclassic/item-db/all
// (Shield, Cape, Earring en Gloves, elk tot level 30). Alleen items tot level 30, zoals de rest van de app, nooit een
// hele tabel (zie .claude/rules/this-repo.md). Elk item op die pagina's is "Male + Female", dus geen `gender`.
// De stat-eisen (STR, DEX, INT, LUK) zijn op 2026-10-05 van dezelfde itempagina gelezen (#158); zoals in de winkellijsten
// staat alleen een eis die de pagina noemt, en de cape en de earrings noemen er geen.
//
// `jobs` is de jobregel van de pagina; zonder `jobs` heeft de pagina er geen en draagt elke job het. Een "Mage" op
// MeowDB is hier de Magician. Earrings geven alleen M.DEF: hun W.DEF is 0, want hun pagina toont geen W.DEF-regel.
//
// Het shield-slot heeft de app voor de Warrior, de Magician en (sinds #133) de Thief, met zijn wristguards (921 tot 923):
// MeowDB geeft ze als shield. De Bowman heeft het slot alleen met een wapen voor één hand (de wapens onder level 10, #172);
// dan krijgt hij de shields zonder jobregel (Stolen Fence, Pan Lid). Dat bepaalt equipment.ts, niet dit filter: met een boog
// of zonder wapen heeft hij het slot niet en geeft de catalogus er geen items voor.
import type { Job } from '../job'
import type { Source, WornArmor } from './types'

const R = '2026-10-04'
const src = (id: number): Source => ({ url: `https://meowdb.com/msclassic/item-db/${id}`, retrieved: R })

/** Een item zonder prijs voor shield, gloves, cape of earrings, met de jobs die het mogen dragen (geen = iedereen). */
export type Accessory = WornArmor & { jobs?: readonly Job[] }

const W: readonly Job[] = ['warrior']
const M: readonly Job[] = ['magician']
const B: readonly Job[] = ['bowman']
const T: readonly Job[] = ['thief']

/** Per slot (shield, gloves, cape, earrings) van laag naar hoog level. */
export const ACCESSORIES: readonly Accessory[] = [
  { name: 'Stolen Fence', slot: 'shield', level: 5, wdef: 40, source: src(915) },
  { name: 'Wooden Buckler', slot: 'shield', level: 10, wdef: 70, jobs: W, str: 10, source: src(916) },
  { name: 'Pan Lid', slot: 'shield', level: 10, wdef: 44, source: src(917) },
  { name: 'Steel Shield', slot: 'shield', level: 15, wdef: 80, jobs: W, str: 20, source: src(918) },
  { name: 'Mithril Buckler', slot: 'shield', level: 20, wdef: 90, jobs: W, str: 30, dex: 10, source: src(919) },
  { name: 'Mystic Shield', slot: 'shield', level: 22, wdef: 20, mdef: 42, jobs: M, int: 34, luk: 12, source: src(920) },
  { name: 'Seclusion Wristguard', slot: 'shield', level: 22, wdef: 54, jobs: T, dex: 34, luk: 12, source: src(921) },
  { name: 'Nimble Wristguard', slot: 'shield', level: 22, wdef: 54, jobs: T, dex: 12, luk: 34, source: src(922) },
  { name: 'Jurgen Wristguard', slot: 'shield', level: 22, wdef: 54, jobs: T, dex: 12, luk: 34, source: src(923) },
  { name: 'Red Triangular Shield', slot: 'shield', level: 25, wdef: 100, jobs: W, str: 40, dex: 15, source: src(924) },
  { name: 'Red Cross Shield', slot: 'shield', level: 30, wdef: 110, jobs: W, str: 50, dex: 20, source: src(925) },
  { name: 'Work Gloves', slot: 'gloves', level: 10, wdef: 6, source: src(1435) },
  { name: 'Juno', slot: 'gloves', level: 10, wdef: 9, jobs: W, str: 10, source: src(1436) },
  { name: 'Steel Fingerless Gloves', slot: 'gloves', level: 15, wdef: 12, jobs: W, str: 20, source: src(1437) },
  { name: 'Lemona', slot: 'gloves', level: 15, wdef: 3, mdef: 5, jobs: M, int: 20, source: src(1438) },
  { name: 'Basic Archer Gloves', slot: 'gloves', level: 15, wdef: 8, jobs: B, dex: 20, source: src(1439) },
  { name: 'Brown Duo', slot: 'gloves', level: 15, wdef: 8, jobs: T, luk: 20, source: src(1440) },
  { name: 'Blue Duo', slot: 'gloves', level: 15, wdef: 8, jobs: T, luk: 20, source: src(1441) },
  { name: 'Black Duo', slot: 'gloves', level: 15, wdef: 8, jobs: T, luk: 20, source: src(1442) },
  { name: 'Black Cat Gloves', slot: 'gloves', level: 20, wdef: 15, jobs: W, str: 30, dex: 10, source: src(1443) },
  { name: 'Blue Morrican', slot: 'gloves', level: 20, wdef: 4, mdef: 6, jobs: M, int: 30, luk: 10, source: src(1444) },
  { name: 'Green Morrican', slot: 'gloves', level: 20, wdef: 4, mdef: 6, jobs: M, int: 30, luk: 10, source: src(1445) },
  { name: 'Purple Morrican', slot: 'gloves', level: 20, wdef: 4, mdef: 6, jobs: M, int: 30, luk: 10, source: src(1446) },
  { name: 'Blue Diros', slot: 'gloves', level: 20, wdef: 10, jobs: B, str: 10, dex: 30, source: src(1447) },
  { name: 'Red Diros', slot: 'gloves', level: 20, wdef: 10, jobs: B, str: 10, dex: 30, source: src(1448) },
  { name: 'Green Diros', slot: 'gloves', level: 20, wdef: 10, jobs: B, str: 10, dex: 30, source: src(1449) },
  { name: 'Bronze Mischief', slot: 'gloves', level: 20, wdef: 10, jobs: T, dex: 10, luk: 30, source: src(1450) },
  { name: 'Mithril Mischief', slot: 'gloves', level: 20, wdef: 10, jobs: T, dex: 10, luk: 30, source: src(1451) },
  { name: 'Dark Mischief', slot: 'gloves', level: 20, wdef: 10, jobs: T, dex: 10, luk: 30, source: src(1452) },
  { name: 'White Fingerless Gloves', slot: 'gloves', level: 25, wdef: 18, jobs: W, str: 40, dex: 15, source: src(1453) },
  { name: 'Ocean Mesana', slot: 'gloves', level: 25, wdef: 5, mdef: 7, jobs: M, int: 40, luk: 15, source: src(1454) },
  { name: 'Blood Mesana', slot: 'gloves', level: 25, wdef: 5, mdef: 7, jobs: M, int: 40, luk: 15, source: src(1455) },
  { name: 'Dark Mesana', slot: 'gloves', level: 25, wdef: 5, mdef: 7, jobs: M, int: 40, luk: 15, source: src(1456) },
  { name: 'Blue Savata', slot: 'gloves', level: 25, wdef: 12, jobs: B, str: 15, dex: 40, source: src(1457) },
  { name: 'Red Savata', slot: 'gloves', level: 25, wdef: 12, jobs: B, str: 15, dex: 40, source: src(1458) },
  { name: 'Dark Savata', slot: 'gloves', level: 25, wdef: 12, jobs: B, str: 15, dex: 40, source: src(1459) },
  { name: 'Bronze Wolfskin', slot: 'gloves', level: 25, wdef: 12, jobs: T, dex: 15, luk: 40, source: src(1460) },
  { name: 'Mithril Wolfskin', slot: 'gloves', level: 25, wdef: 12, jobs: T, dex: 15, luk: 40, source: src(1461) },
  { name: 'Dark Wolfskin', slot: 'gloves', level: 25, wdef: 12, jobs: T, dex: 15, luk: 40, source: src(1462) },
  { name: 'Bronze Missel', slot: 'gloves', level: 30, wdef: 21, jobs: W, str: 50, dex: 20, source: src(1463) },
  { name: 'Steel Missel', slot: 'gloves', level: 30, wdef: 21, jobs: W, str: 50, dex: 20, source: src(1464) },
  { name: 'Orihalcon Missel', slot: 'gloves', level: 30, wdef: 21, jobs: W, str: 50, dex: 20, source: src(1465) },
  { name: 'Red Lutia', slot: 'gloves', level: 30, wdef: 6, mdef: 8, jobs: M, int: 50, luk: 20, source: src(1466) },
  { name: 'Blue Lutia', slot: 'gloves', level: 30, wdef: 6, mdef: 8, jobs: M, int: 50, luk: 20, source: src(1467) },
  { name: 'Black Lutia', slot: 'gloves', level: 30, wdef: 6, mdef: 8, jobs: M, int: 50, luk: 20, source: src(1468) },
  { name: 'Brown Marker', slot: 'gloves', level: 30, wdef: 14, jobs: B, str: 20, dex: 50, source: src(1469) },
  { name: 'Green Marker', slot: 'gloves', level: 30, wdef: 14, jobs: B, str: 20, dex: 50, source: src(1470) },
  { name: 'Black Marker', slot: 'gloves', level: 30, wdef: 14, jobs: B, str: 20, dex: 50, source: src(1471) },
  { name: 'Steel Sylvia', slot: 'gloves', level: 30, wdef: 14, jobs: T, dex: 20, luk: 50, source: src(1472) },
  { name: 'Silver Sylvia', slot: 'gloves', level: 30, wdef: 14, jobs: T, dex: 20, luk: 50, source: src(1473) },
  { name: 'Gold Sylvia', slot: 'gloves', level: 30, wdef: 14, jobs: T, dex: 20, luk: 50, source: src(1474) },
  { name: 'Old Raggedy Cape', slot: 'cape', level: 25, wdef: 12, mdef: 5, source: src(889) },
  { name: 'Single Earring', slot: 'earrings', level: 15, wdef: 0, mdef: 19, source: src(899) },
  { name: 'Amethyst Earrings', slot: 'earrings', level: 15, wdef: 0, mdef: 19, source: src(900) },
  { name: 'Weighted Earrings', slot: 'earrings', level: 20, wdef: 0, mdef: 22, source: src(901) },
  { name: 'Yellow Square', slot: 'earrings', level: 20, wdef: 0, mdef: 22, source: src(902) },
  { name: 'Gold Earrings', slot: 'earrings', level: 25, wdef: 0, mdef: 24, source: src(903) },
  { name: 'Red Cross Earrings', slot: 'earrings', level: 25, wdef: 0, mdef: 24, source: src(904) },
  { name: 'Leaf Earrings', slot: 'earrings', level: 25, wdef: 0, mdef: 24, source: src(905) },
  { name: 'Lightning Earrings', slot: 'earrings', level: 30, wdef: 0, mdef: 27, source: src(906) },
  { name: 'Emerald Earrings', slot: 'earrings', level: 30, wdef: 0, mdef: 27, source: src(907) },
  { name: 'Star Earrings', slot: 'earrings', level: 30, wdef: 0, mdef: 27, source: src(908) },
]

/** De items uit ACCESSORIES die deze job mag dragen: zonder jobregel, of met deze job erin. */
export const accessoriesFor = (job: Job): readonly WornArmor[] => ACCESSORIES.filter((a) => !a.jobs || a.jobs.includes(job))
