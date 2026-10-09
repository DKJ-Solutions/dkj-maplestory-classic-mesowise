// De equipment die je draagt (Dave, 4 oktober 2026): per slot een claw, je ammo (stars, of pijlen bij een Bowman,
// issue #65), hoed, top, bottom, overall (top en bottom in één stuk, issue #50), schoenen, en een shield, gloves, cape
// en earrings (issue #117). Elk slot mag leeg blijven.
// Het rekent mee: de claw zet je weapon attack en aanvalssnelheid in het profiel, je stars hun weapon attack en
// herlaadprijs, armor past je WDEF aan, en
// het armor-advies weet zo wat je in een slot al draagt. Je draagt altijd iets (Dave, 4 oktober 2026): er is
// geen keuze "weet ik niet" of "niets", alleen een slot dat nog niet is ingevuld. Puur, zonder UI-import. Alles
// uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op "nog niet ingevuld". Je zoekt wat je draagt in
// een catalogus per slot (NPC-items plus items zonder prijs); klopt de stat in het spel niet met de database,
// dan corrigeer je hem in de popup achter het potlood: wat je in je spel ziet, telt.
import type { WornWdef } from './armorUpgrade'
import { accessoriesFor } from './data/accessories'
import { BEGINNER_WEAPONS, BEGINNER_WORN_WARRIOR_WEAPONS, BEGINNER_WORN_WEAPONS, isBeginnerDagger } from './data/beginnerWeapons'
import { NPC_ARMOR } from './data/armor'
import { BOWMAN_ARMOR, BOWMAN_WEAPONS, isBronzeArrow, WORN_BOWMAN_ARMOR } from './bowmanGear'
import { HELPFUL_STRANGER_ARROWS, NPC_ARROWS, NPC_BOWMAN_WEAPONS } from './data/bowman'
import { NPC_CLAWS } from './data/claws'
import { isNpcDagger, NPC_DAGGERS } from './data/daggers'
import { THROWING_STARS } from './data/thief'
import type { ArmorPiece, ArmorSlot, Gender, Requires, Stat, Weapon, WornArmor, WornClaw } from './data/types'
import { fitsGender } from './gender'
import { WORN_ARMOR, WORN_CLAWS } from './data/wornItems'
import { FREE_MAGICIAN_WEAPON, NPC_MAGICIAN_WEAPONS } from './data/magician'
import { NPC_WARRIOR_WEAPONS } from './data/warrior'
import { WORN_WARRIOR_ARMOR, WORN_WARRIOR_WEAPONS } from './data/wornWarrior'
import type { Job } from './job'
import type { ProfileDraft } from './profile'
import { FREE_MAGICIAN_WORN_WEAPON, MAGICIAN_ARMOR, MAGICIAN_WEAPONS, WORN_MAGICIAN_ARMOR } from './magicianGear'
import { FREE_WEAPON_LEVEL, freeJobWeaponName, meetsFreeWeaponRequirements, typedAttackBeatsFreeWeapon } from './freeJobWeapon'
import { WARRIOR_ARMOR, WARRIOR_WEAPONS, WORN_WARRIOR_CLAWS } from './warriorGear'

export const EQUIPMENT_KEY = 'mesowise.equipment.v1'
const VERSION = 1
/** De maximale lengte van de naam bij een eigen item. */
export const MAX_NAME_LENGTH = 40
const MAX_STAT_LENGTH = 12
const MAX_STAT = 999

export type EquipSlot = 'claw' | 'ammo' | ArmorSlot

/** De slots in de volgorde waarin het scherm ze toont. */
export const EQUIP_SLOTS: readonly { slot: EquipSlot; label: string }[] = [
  { slot: 'claw', label: 'Weapon' },
  { slot: 'ammo', label: 'Ammo' },
  { slot: 'shield', label: 'Shield' },
  { slot: 'hat', label: 'Hat' },
  { slot: 'shoes', label: 'Shoes' },
  { slot: 'top', label: 'Top' },
  { slot: 'bottom', label: 'Bottom' },
  { slot: 'overall', label: 'Overall' },
  { slot: 'gloves', label: 'Gloves' },
  { slot: 'cape', label: 'Cape' },
  { slot: 'earrings', label: 'Earrings' },
]

/** De wapens onder level 10: wapens voor één hand die elke job kan vasthouden, ook een Bowman (#172). */
const isBeginnerWeapon = (weapon: string): boolean => BEGINNER_WORN_WEAPONS.some((w) => w.name === weapon)

/**
 * Of de Thief een claw vasthoudt (#188): een wapen in zijn wapenslot dat geen dagger is en geen wapen onder level 10, of een eigen
 * wapen dat hij een claw noemt (`kind`, #176). Een leeg slot of een onbekend wapen is geen claw.
 */
const holdsClaw = (weapon: string, kind?: WeaponKind): boolean => {
  if (weapon === OTHER) return kind === 'claw'
  return weapon !== '' && weapon !== UNKNOWN && weapon !== NONE && !isDaggerPick(weapon) && !isBeginnerWeapon(weapon)
}

/**
 * Of een job het slot heeft, zoals de catalogus het ziet; `weapon` is de pick in het wapenslot (claw): voor het shield-slot van de
 * Bowman en de Thief telt wat hij vasthoudt. `kind` zegt bij een eigen wapen van een Thief of het een dagger of een claw is (#176);
 * zonder `kind` is het onbekend. Wat het scherm toont en meetelt is strenger: het shield alleen naast een wapen voor één hand (wearsSlot).
 */
const hasSlot = (job: Job, slot: EquipSlot, weapon = '', kind?: WeaponKind): boolean => {
  // Ammo alleen voor de Thief (stars) en de Bowman (pijlen); een Warrior of Magician gooit niets.
  if (slot === 'ammo') return job === 'thief' || job === 'bowman'
  // Een shield (issue #117) alleen naast een wapen voor één hand: een boog of kruisboog vraagt beide handen. Een claw niet:
  // de Thief draagt in het shield-slot zijn wristguards (issue #133; Seclusion, Nimble en Jurgen Wristguard op NiaMeowDB).
  // De Bowman heeft het slot dus alleen met een wapen onder level 10 (Sword, Hand Axe, Wooden Club, Razor, Fruit Knife; #172).
  // Met een boog, een leeg wapenslot of een eigen wapen heeft hij het niet.
  // Ook een claw vraagt beide handen (Dave, 6 oktober 2026, #188; claws hebben itemnummers 147xxxx, de reeks van de wapens voor twee
  // handen, net als bogen en kruisbogen): de Thief draagt zijn wristguards alleen naast een dagger of een wapen onder level 10.
  if (slot === 'shield') return job === 'bowman' ? isBeginnerWeapon(weapon) : job !== 'thief' || !holdsClaw(weapon, kind)
  return true
}

/**
 * De wapens voor één hand: de wapens onder level 10, de daggers, de Warrior-wapens voor één hand (1H Sword, Axe en Blunt) en de
 * wands. Een staff, een Warrior-wapen voor twee handen, een spear, een polearm, een claw en een boog of kruisboog vragen beide handen.
 */
const ONE_HANDED: ReadonlySet<string> = new Set([
  ...BEGINNER_WORN_WEAPONS.map((w) => w.name),
  ...NPC_DAGGERS.map((w) => w.name),
  ...[...NPC_WARRIOR_WEAPONS, ...WORN_WARRIOR_WEAPONS].filter((w) => w.kind.startsWith('1h-')).map((w) => w.name),
  ...NPC_MAGICIAN_WEAPONS.filter((w) => w.kind === 'wand').map((w) => w.name),
])

/**
 * Of je een wapen voor één hand vasthoudt (Dave, 7 oktober 2026): alleen dan staat er een shield-rij. Een leeg wapenslot telt niet,
 * en een eigen wapen alleen als een Thief het een dagger noemt (#176): van een ander eigen wapen weet de app de handen niet.
 */
const holdsOneHanded = (weapon: string, kind?: WeaponKind): boolean => (weapon === OTHER ? kind === 'dagger' : ONE_HANDED.has(weapon))

/**
 * Of het slot op het scherm staat en meetelt: een slot dat de job heeft (hasSlot), en het shield alleen naast een wapen voor één
 * hand (Dave, 7 oktober 2026). De catalogus kijkt alleen naar hasSlot, zodat opzoeken op naam ook zonder wapen werkt.
 */
const wearsSlot = (job: Job, slot: EquipSlot, weapon = '', kind?: WeaponKind): boolean =>
  hasSlot(job, slot, weapon, kind) && (slot !== 'shield' || holdsOneHanded(weapon, kind))

/** Of een job het slot draagt met het wapen dat in `eq` staat: het shield hangt af van het wapen. */
const hasSlotFor = (eq: Equipment, job: Job, slot: EquipSlot): boolean => wearsSlot(job, slot, eq.claw.pick, effectiveKind(eq.claw))

/** De soort van een eigen wapen zoals de app ermee rekent: zonder keuze een claw (#176). Alleen bij een eigen wapen. */
const effectiveKind = (weapon: EquipEntry): WeaponKind | undefined => (weapon.pick === OTHER ? (weapon.weaponKind ?? 'claw') : undefined)

/** De slots die een job draagt, in de volgorde van het scherm; `weapon` is de pick in het wapenslot (het shield alleen naast een wapen voor één hand). */
export const slotsFor = (job: Job, weapon = '', kind?: WeaponKind): readonly { slot: EquipSlot; label: string }[] => EQUIP_SLOTS.filter((s) => wearsSlot(job, s.slot, weapon, kind))

/** Hoe het scherm een slot noemt. Het ammo-slot heet voor elke job "Ammo" (Dave, 4 oktober 2026). */
export const slotLabel = (slot: EquipSlot): string => EQUIP_SLOTS.find((s) => s.slot === slot)?.label ?? slot

// Elk slot mag leeg blijven (Dave, 4 oktober 2026, #117): het scherm noemt er geen apart "optioneel". Een leeg ammo-slot
// rekent met Subi zolang je nooit een star koos.

/** Nog niet ingevuld: de begintoestand van een slot. Geen keuze in de lijst; terugkiezen kan niet. */
export const UNKNOWN = 'unknown'
export const OTHER = 'other'
/**
 * Bekend leeg (issue #50, niet 'none': dat is het vervallen "niets" uit oude opslag): de helft van top en bottom die vrijkomt als je een overall inruilt voor een top of bottom.
 * Anders dan UNKNOWN weet de app dat daar niets zit, dus 0 WDEF. Het scherm toont het als een leeg slot; je kiest het niet zelf.
 */
export const NONE = 'empty'

/**
 * Wat je in één slot draagt, zoals ingevuld. `pick` is 'unknown' (nog niet ingevuld), 'other' (een ander
 * item: `name` en `stat` gelden dan) of de naam van een item uit de catalogus. Bij een catalogusitem is `stat`
 * een eigen waarde die de database overschrijft; leeg = de waarde uit de database.
 */
export interface EquipEntry {
  pick: string
  name: string
  stat: string
  /** Alleen een eigen wapen ('other' in het wapenslot): of het een dagger of een claw is (#176). Ontbreekt = claw, zoals oude opslag. */
  weaponKind?: WeaponKind
}

/** Een eigen wapen weet de app niet te herkennen: een Thief kiest zelf of het een dagger (Double Stab) of een claw (Lucky Seven) is (#176). */
export type WeaponKind = 'dagger' | 'claw'

export type Equipment = Record<EquipSlot, EquipEntry>

const emptyEntry = (): EquipEntry => ({ pick: UNKNOWN, name: '', stat: '' })

/** Nog niets ingevuld: zo begint iedereen, ook wie de app al gebruikte. */
export const defaultEquipment = (): Equipment => ({
  claw: emptyEntry(),
  ammo: emptyEntry(),
  hat: emptyEntry(),
  top: emptyEntry(),
  bottom: emptyEntry(),
  overall: emptyEntry(),
  shoes: emptyEntry(),
  shield: emptyEntry(),
  gloves: emptyEntry(),
  cape: emptyEntry(),
  earrings: emptyEntry(),
})

/** Of het scherm dit slot als leeg toont: nog niet ingevuld, of bekend leeg. */
export const isEmptyEntry = (e: EquipEntry): boolean => e.pick === UNKNOWN || e.pick === NONE

const isArmorSlot = (slot: EquipSlot): slot is ArmorSlot => slot !== 'claw' && slot !== 'ammo'

/** Hoe het scherm de stat van het wapen en van armor noemt, zoals het spel: overal dezelfde namen (#58). */
export const STAT_NAME = { weapon: 'ATT', armor: 'DEF' } as const

/** De naam van de stat van het wapen: ATT, en bij een Magician M.ATT: voor hem telt zijn Magic Attack (zie magicianGear.ts). */
export const weaponStatName = (job: Job): string => (job === 'magician' ? 'M.ATT' : STAT_NAME.weapon)

/** De naam van de stat van een slot: ATT (M.ATT bij een Magician) voor het wapen en DEF voor armor. */
export const statName = (slot: EquipSlot, job: Job = 'thief'): string => (isArmorSlot(slot) ? STAT_NAME.armor : weaponStatName(job))

/** Een item in de catalogus van een slot: naam, level en de stat die telt (WATK voor een claw of stars, WDEF voor armor). */
export interface CatalogItem {
  name: string
  /** Het level dat het item vraagt; pijlen vragen er geen. */
  level?: number
  stat: number
  /** Alleen een claw: de tijd per aanval met Lucky Seven, zodat de aanvalssnelheid mee verandert. */
  attackMs?: number
  /** Een Warrior-wapen of een wapen onder level 10: de verwachte weapon multiplier van een basisaanval, zodat die mee verandert. */
  mult?: number
  /** Alleen armor: de MDEF van de pagina, 0 als die er geen noemt (#91). */
  mdef?: number
  /** Alleen een wapen: de soort zoals de zoekbalk hem toont, "CLAW", "DAGGER", "BOW", "1H SWORD" (Dave, 6 oktober 2026, #188). */
  type?: string
  /** Alleen een wapen: de snelheid uit het spel zonder getal, "FAST", "FASTER", "NORMAL" (#188). */
  speed?: string
  /** Alleen armor voor één geslacht (#55, #188): de zoekbalk toont hem dan alleen bij dat geslacht. */
  gender?: Gender
  /**
   * Alleen armor: slot, level, WDEF, MDEF en de naam zonder kleur (colourless). Kleuren van hetzelfde stuk hebben dezelfde sleutel,
   * ook als hun stat-eis verschilt (Blue Cloth Pants vraagt DEX, Black Cloth Pants LUK); de zoekbalk toont ze als één, en je kiest de
   * eerste, met zijn eis (Dave, 6 oktober 2026, #188). Een ander stuk met dezelfde stats (Leather Sandals naast Rubber Boots) of een
   * ander materiaal (Bronze en Steel Grieves) blijft apart.
   */
  variant?: string
}

/** Hoeveel zoekresultaten het scherm toont. */
export const MAX_RESULTS = 8

/**
 * De winkelitems en de items zonder prijs per job die de app kent: de Thief (claws en daggers, #170; Thief-armor, de draagbare
 * items), de Warrior (zijn wapens en armor uit de winkel, plus de items zonder prijs: wornWarrior.ts en de
 * items zonder jobregel die ook de Thief draagt), de Bowman (bogen, kruisbogen en armor uit de winkel, plus de items
 * zonder jobregel, zie bowmanGear.ts) en de Magician (zijn wands, staffs en armor uit de winkel, plus de items zonder
 * jobregel, zie magicianGear.ts; het getal van zijn wapen is de M.ATT). Een naam mag bij meer jobs staan, maar dan is het hetzelfde
 * item (dezelfde stat en bron; een test bewaakt dat). Elke job krijgt ook de items voor shield, gloves, cape en earrings
 * die hij mag dragen (accessories.ts, #125), en Thief, Warrior en Bowman de wapens onder level 10 (data/beginnerWeapons.ts):
 * wie nog Beginner is, draagt er een. Elke job heeft zijn winkellijst; een item van een andere job aanbieden zou onwaar zijn.
 */
const SHOP: Partial<Record<Job, { weapons: readonly Weapon[]; armor: readonly ArmorPiece[]; wornWeapons: readonly (WornClaw & { mult?: number })[]; wornArmor: readonly WornArmor[] }>> = {
  thief: { weapons: [...NPC_CLAWS, ...NPC_DAGGERS], armor: NPC_ARMOR, wornWeapons: [...BEGINNER_WORN_WEAPONS, ...WORN_CLAWS], wornArmor: [...WORN_ARMOR, ...accessoriesFor('thief')] },
  warrior: { weapons: WARRIOR_WEAPONS, armor: WARRIOR_ARMOR, wornWeapons: [...BEGINNER_WORN_WARRIOR_WEAPONS, ...WORN_WARRIOR_CLAWS], wornArmor: [...WORN_WARRIOR_ARMOR, ...accessoriesFor('warrior')] },
  bowman: { weapons: BOWMAN_WEAPONS, armor: BOWMAN_ARMOR, wornWeapons: BEGINNER_WORN_WEAPONS, wornArmor: [...WORN_BOWMAN_ARMOR, ...accessoriesFor('bowman')] },
  magician: { weapons: MAGICIAN_WEAPONS, armor: MAGICIAN_ARMOR, wornWeapons: [FREE_MAGICIAN_WORN_WEAPON], wornArmor: [...WORN_MAGICIAN_ARMOR, ...accessoriesFor('magician')] },
}

/**
 * De soort en de snelheid van elk wapen zoals het spel ze noemt, op naam (#188): de bronlijsten dragen ze (`kind`, `speed`); de claws
 * en de daggers van de Thief staan in hun eigen lijst. Zo blijven ze bij een wapen ook waar een winkellijst alleen de rekenvelden
 * overhoudt (een wand rekent met de vaste cast van een spreuk, maar zijn eigen snelheid staat op de itempagina).
 */
const speedWord = (label: string): string => label.split(' ')[0].toUpperCase()
const WEAPON_INFO: ReadonlyMap<string, { type: string; speed: string }> = new Map([
  ...[...NPC_CLAWS, ...WORN_CLAWS].map((c) => [c.name, { type: 'CLAW', speed: speedWord(c.speed.label) }] as const),
  ...NPC_DAGGERS.map((d) => [d.name, { type: 'DAGGER', speed: speedWord(d.speed.label) }] as const),
  ...[...BEGINNER_WEAPONS, ...NPC_WARRIOR_WEAPONS, ...WORN_WARRIOR_WEAPONS, ...NPC_BOWMAN_WEAPONS, ...NPC_MAGICIAN_WEAPONS, FREE_MAGICIAN_WEAPON].map(
    (w) => [w.name, { type: w.kind.replace('-', ' ').toUpperCase(), speed: speedWord(w.speed.label) }] as const,
  ),
])

/**
 * De catalogus van een slot voor een job: de NPC-items, dan de items zonder prijs; staat een naam twee keer in,
 * dan wint de NPC-regel. De bronze pijlen van een Bowman staan er alleen in met `helpfulStranger` (#64): zonder die
 * rang kan hij ze niet kopen, dus de lijst biedt ze dan niet aan.
 */
export function catalogItems(slot: EquipSlot, job: Job, helpfulStranger = false, weapon = ''): readonly CatalogItem[] {
  // Een slot dat de job niet heeft, heeft voor hem geen items (#125): anders bleef bij een wissel van job een shield staan
  // in een slot dat hij niet ziet, en telde dat mee in zijn WDEF. Bij de Bowman en de Thief hangt het shield-slot af van `weapon`
  // (#172, #188); de regel van het scherm (alleen naast een wapen voor één hand) staat in wearsSlot, zodat opzoeken op naam ook zonder wapen werkt.
  if (!hasSlot(job, slot, weapon)) return []
  // Het ammo-slot: stars voor een Thief, pijlen voor een Bowman (de Bowman-data van issue #44); een Warrior heeft het niet.
  if (slot === 'ammo') {
    if (job === 'thief') return THROWING_STARS.map((t) => ({ name: t.name, level: t.level, stat: t.watk }))
    if (job === 'bowman') return [...NPC_ARROWS, ...(helpfulStranger ? HELPFUL_STRANGER_ARROWS : [])].map((a) => ({ name: a.name, stat: a.watk }))
    return []
  }
  const shop = SHOP[job]
  if (!shop) return []
  const items: CatalogItem[] = isArmorSlot(slot)
    ? [...shop.armor, ...shop.wornArmor]
        .filter((a) => a.slot === slot)
        .map((a) => ({
          name: a.name,
          level: a.level,
          stat: a.wdef,
          mdef: a.mdef ?? 0,
          ...(a.gender ? { gender: a.gender } : {}),
          variant: [a.slot, a.level, a.wdef, a.mdef ?? 0, colourless(a.name)].join('|'),
        }))
    : [...shop.weapons, ...shop.wornWeapons].map((c) => ({
        name: c.name,
        level: c.level,
        stat: c.watk,
        attackMs: c.speed.attackMs,
        ...(WEAPON_INFO.get(c.name) ?? { speed: speedWord(c.speed.label) }),
        ...(c.mult !== undefined ? { mult: c.mult } : {}),
      }))
  const unique = items.filter((i, n) => items.findIndex((j) => j.name === i.name) === n)
  // Wapens op level, laagste eerst (stabiel: bij gelijk level blijft de volgorde van de lijsten): de zoekbalk toont er maar
  // MAX_RESULTS, en wie nog Beginner is moet de wapens onder level 10 zien zonder te typen.
  return isArmorSlot(slot) ? unique : [...unique].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
}

// Opzoeken kent ook de bronze pijlen: wat je draagt blijft bestaan, ook als de lijst het niet (meer) aanbiedt.
const catalogItem = (slot: EquipSlot, name: string, job: Job, weapon = '') => catalogItems(slot, job, true, weapon).find((i) => i.name === name)

// Een catalogusitem in een slot bestaat alleen voor de job waarvoor hij geldt (loadEquipment en equipmentForJob
// zorgen daarvoor), en een naam die bij twee jobs staat is hetzelfde item (een test bewaakt dat): bij het rekenen zoeken
// we dus in de lijsten van alle jobs.
/** Het level dat een item uit de catalogus vraagt om het te dragen (#188); undefined bij een eigen item of een item zonder level (pijlen). */
export const itemLevel = (slot: EquipSlot, name: string): number | undefined => anyItem(slot, name)?.level

/**
 * De naam van een stuk zonder zijn kleur (#188): heeft het kleuren met precies dezelfde stats en dezelfde naam zonder kleurwoorden
 * (dezelfde `variant`), dan die naam ("Red Rubber Boots", "Blue Rubber Boots" → "Rubber Boots"); anders de naam zelf.
 */
export function familyName(slot: EquipSlot, name: string): string {
  const item = anyItem(slot, name)
  if (item?.variant === undefined) return name
  const all = (Object.keys(SHOP) as Job[]).flatMap((j) => catalogItems(slot, j, true))
  const names = new Set(all.filter((i) => i.variant === item.variant).map((i) => i.name))
  if (names.size < 2) return name
  // Is de naam zonder kleur die van een ander stuk (Metal Gear, DEF 18, naast Yellow en Blue Metal Gear, DEF 19), dan blijft de kleur staan (#188).
  const base = colourless(name)
  return all.some((i) => i.name === base && i.variant !== item.variant) ? name : base
}

/** De kleurwoorden waarmee een itemnaam begint ("Dark Brown", "Silver / Black"); een materiaal (Bronze, Steel) is geen kleur. */
const COLOURS = new Set(['red', 'blue', 'yellow', 'green', 'black', 'white', 'brown', 'dark', 'pink', 'purple', 'grey', 'gray', 'gold', 'sky', 'blood', 'silver', 'orange', 'light', 'navy', '/'])

/** Een itemnaam zonder de kleurwoorden vooraan: "Dark Brown Stealer Pants" → "Stealer Pants". Blijft er niets over, dan de naam zelf. */
const colourless = (name: string): string => {
  const words = name.split(' ')
  let i = 0
  while (i < words.length - 1 && COLOURS.has(words[i].toLowerCase())) i++
  return words.slice(i).join(' ')
}

/** Een itemnaam zonder kleur en met het level dat hij vraagt erachter, zoals het scherm hem toont: "Steel Titans (Lv. 15)" (Dave, 6 oktober 2026, #188). */
export const nameWithLevel = (slot: EquipSlot, name: string): string => {
  const level = itemLevel(slot, name)
  const shown = familyName(slot, name)
  return level === undefined ? shown : `${shown} (Lv. ${level})`
}

const anyItem = (slot: EquipSlot, name: string): CatalogItem | undefined =>
  (Object.keys(SHOP) as Job[]).map((j) => catalogItem(slot, name, j)).find((i) => i !== undefined)

/** Een catalogusitem op naam, uit de lijsten van alle jobs (zie hierboven); undefined bij een eigen item of een naam die in geen lijst staat. */
export const catalogInfo = (slot: EquipSlot, name: string): CatalogItem | undefined => anyItem(slot, name)

/**
 * Wat de lijsten van alle jobs van het stuk in een slot weten (Dave, 8 oktober 2026): voor itemRequirements en shopPrice. De winkelregels staan voor de items zonder prijs,
 * dus bij dezelfde naam wint de winkelregel; undefined bij munitie, een leeg slot, een eigen item of een naam die in geen lijst staat.
 */
function shopItem(slot: EquipSlot, entry: EquipEntry): Weapon | ArmorPiece | WornArmor | WornClaw | undefined {
  if (slot === 'ammo' || isEmptyEntry(entry) || entry.pick === OTHER) return undefined
  const shops = Object.values(SHOP) as NonNullable<(typeof SHOP)[Job]>[]
  const inSlot = <T extends { slot: ArmorSlot }>(list: readonly T[]) => list.filter((a) => a.slot === slot)
  const lists: (Weapon | ArmorPiece | WornArmor | WornClaw)[] = isArmorSlot(slot)
    ? [...shops.flatMap((shop) => inSlot(shop.armor)), ...shops.flatMap((shop) => inSlot(shop.wornArmor))]
    : [...shops.flatMap((shop) => shop.weapons), ...shops.flatMap((shop) => shop.wornWeapons)]
  return lists.find((i) => i.name === entry.pick)
}

/**
 * De stat-eisen van wat je in een slot draagt (een eis die de pagina niet noemt staat er niet). Winkelitems en items zonder prijs
 * kennen hun eisen (#158; bij dezelfde naam wint de winkelregel); undefined bij een leeg slot, een eigen item of een naam die in
 * geen lijst staat: daarvan weet de app niet wat het vraagt. Ammo vraagt alleen een level.
 */
export function itemRequirements(slot: EquipSlot, entry: EquipEntry): Partial<Requires<Stat>> | undefined {
  const found = shopItem(slot, entry)
  if (!found) return undefined
  const out: Partial<Requires<Stat>> = {}
  for (const s of ['str', 'dex', 'int', 'luk'] as const) if (found[s] !== undefined) out[s] = found[s]
  return out
}

/**
 * De winkelprijs van wat je in een slot draagt (Dave, 8 oktober 2026), voor de kolom Shop in Profile. Alleen een winkelwapen of winkelarmor heeft er een;
 * undefined bij een leeg slot, een eigen item, een item zonder prijs (drop of Free Market) en munitie, die je per stuk koopt.
 */
export const shopPrice = (slot: EquipSlot, entry: EquipEntry): number | undefined => {
  const found = shopItem(slot, entry)
  return found !== undefined && 'price' in found ? found.price : undefined
}

/** De catalogusitems waarvan de naam de tekst bevat, zonder hoofdletters en spaties rond de tekst; een lege tekst geeft alles. */
export function searchCatalog(slot: EquipSlot, job: Job, query: string, helpfulStranger = false, weapon = '', maxLevel?: number, gender: Gender | null = null): readonly CatalogItem[] {
  const q = query.trim().toLowerCase()
  const items = catalogItems(slot, job, helpfulStranger, weapon)
  // Kleuren van hetzelfde stuk (dezelfde `variant`) staan als één in de lijst, onder hun gedeelde naam (#188); de eerste
  // (een winkelitem gaat voor) is wat je kiest. Je vindt het stuk ook met de naam van een andere kleur.
  const out: CatalogItem[] = []
  const seen = new Set<string>()
  for (const i of items) {
    // Met `maxLevel` (je character-level, #188) alleen wat je op dat level kunt dragen; een item zonder level (pijlen) altijd.
    if (maxLevel !== undefined && (i.level ?? 0) > maxLevel) continue
    // Met een gekozen geslacht (#188) geen stuk dat alleen voor het andere is.
    if (gender !== null && !fitsGender(i, gender)) continue
    if (i.variant !== undefined) {
      if (seen.has(i.variant)) continue
      const colours = items.filter((j) => j.variant === i.variant)
      if (!colours.some((j) => j.name.toLowerCase().includes(q)) && !familyName(slot, i.name).toLowerCase().includes(q)) continue
      seen.add(i.variant)
      out.push(i)
    } else if (i.name.toLowerCase().includes(q)) out.push(i)
  }
  // Hoogste level bovenaan (Dave, 6 oktober 2026, #188): het beste wat je kunt dragen staat eerst. Stabiel, dus bij gelijk level blijft de
  // volgorde van de catalogus (een winkelitem eerst); een item zonder level (pijlen) onderaan.
  return [...out].sort((a, b) => (b.level ?? -1) - (a.level ?? -1))
}

/** Een getal uit een invulveld, geheel en binnen 0..999; undefined bij leeg of onleesbaar. */
function parseStat(text: string): number | undefined {
  const t = text.trim()
  const n = Number(t)
  return t !== '' && Number.isFinite(n) ? Math.min(MAX_STAT, Math.max(0, Math.trunc(n))) : undefined
}

/** De waarde uit de database van wat je draagt; undefined bij nog niet ingevuld, een eigen item of een naam die niet (meer) bestaat. */
export const databaseStat = (slot: EquipSlot, entry: EquipEntry): number | undefined =>
  entry.pick === UNKNOWN || entry.pick === OTHER ? undefined : anyItem(slot, entry.pick)?.stat

/** De eigen waarde bij een catalogusitem als die geldig is en afwijkt van de database; anders undefined. */
export function statOverride(slot: EquipSlot, entry: EquipEntry): number | undefined {
  const db = databaseStat(slot, entry)
  const own = parseStat(entry.stat)
  return db !== undefined && own !== undefined && own !== db ? own : undefined
}

/** WATK of WDEF van wat je draagt; undefined = onbekend, ook bij een eigen item zonder (geldig) getal: dan weet de app niet wat het stuk geeft. */
export function wornStat(slot: EquipSlot, entry: EquipEntry): number | undefined {
  if (entry.pick === UNKNOWN) return undefined
  if (entry.pick === NONE) return 0
  if (entry.pick === OTHER) return parseStat(entry.stat)
  const db = databaseStat(slot, entry)
  return db === undefined ? undefined : (parseStat(entry.stat) ?? db)
}

/**
 * De WDEF per armorslot waarvan de app weet wat je draagt, en of je een overall draagt, ook met onbekende WDEF (#118). Een slot
 * dat de job met dit wapen niet heeft, telt niet mee: een shield dat een Bowman met een boog nog bewaard heeft (#172).
 */
export function wornWdef(eq: Equipment, job: Job): WornWdef {
  const out: WornWdef = {}
  for (const { slot } of EQUIP_SLOTS) {
    if (!isArmorSlot(slot) || !hasSlotFor(eq, job, slot)) continue
    const w = wornStat(slot, eq[slot])
    if (w !== undefined) out[slot] = w
  }
  if (isFilled(eq.overall)) out.overallWorn = true
  if (!hasSlotFor(eq, job, 'shield')) out.noShield = true
  return out
}

/** De MDEF van wat je in één armorslot draagt; undefined = onbekend: nog niet ingevuld, of een eigen item (daarvan vraagt de app alleen de WDEF). */
function slotMdef(slot: ArmorSlot, entry: EquipEntry): number | undefined {
  if (entry.pick === NONE) return 0
  if (entry.pick === UNKNOWN || entry.pick === OTHER) return undefined
  return anyItem(slot, entry.pick)?.mdef
}

/**
 * De Magic Def uit je equipment (#91): de MDEF van je hat, je body (een overall, of top en bottom samen) en je shoes.
 * Geen wapen van de app heeft MDEF, dus het wapen telt niet. Null zolang van één van die slots de MDEF onbekend is:
 * een som met een gat erin zou een te laag getal tonen. Shield, gloves, cape en earrings (issue #117) tellen mee als je er
 * een item uit de catalogus draagt (#125: earrings geven vooral MDEF); leeg of een eigen item (waarvan de app alleen de WDEF
 * vraagt) telt als 0 en maakt de som niet onbekend, want die slots mogen leeg blijven.
 */
export function wornMdef(eq: Equipment, job: Job): number | null {
  const body: readonly ArmorSlot[] = isEmptyEntry(eq.overall) ? ['top', 'bottom'] : ['overall']
  let sum = 0
  for (const slot of ['hat', ...body, 'shoes'] as const) {
    const m = slotMdef(slot, eq[slot])
    if (m === undefined) return null
    sum += m
  }
  for (const slot of ['shield', 'gloves', 'cape', 'earrings'] as const) {
    if (hasSlotFor(eq, job, slot)) sum += slotMdef(slot, eq[slot]) ?? 0
  }
  return sum
}

/** De naam van wat je in dit slot draagt, voor een samenvatting; null als het slot nog niet is ingevuld. */
export function wornName(entry: EquipEntry): string | null {
  if (isEmptyEntry(entry)) return null
  if (entry.pick === OTHER) return entry.name.trim() || 'eigen item'
  return entry.pick
}

const isArrow = (name: string): boolean => NPC_ARROWS.some((a) => a.name === name) || isBronzeArrow(name)

/** Het profiel met de pijlkeuze zoals de equipment ze toont: bronze alleen als de bronze pijl in het ammo-slot staat. */
export const syncArrow = (profile: ProfileDraft, eq: Equipment): ProfileDraft => ({ ...profile, bronzeArrows: isBronzeArrow(eq.ammo.pick) ? '1' : '0' })

/** Of dit wapen een dagger is: een onder level 10 rekent met LUK als hoofdstat (#171), een NPC-dagger met Double Stab (#170). */
const isDaggerPick = (pick: string): boolean => isBeginnerDagger(pick) || isNpcDagger(pick)

/** Of het wapen in dit wapenslot een dagger is: een catalogusitem volgens de lijst, een eigen item volgens de keuze die je maakte (#176). */
const isDaggerEntry = (e: EquipEntry): boolean => (e.pick === OTHER ? e.weaponKind === 'dagger' : isDaggerPick(e.pick))

/** Het eigen wapen met de gekozen soort (#176); de rest van het slot blijft. */
/**
 * Of je een wapen voor afstand vasthoudt (Dave, 6 oktober 2026, #188): een claw (Thief) of een boog of kruisboog (Bowman). Een leeg
 * wapenslot, een dagger, een wapen onder level 10 en een eigen wapen dat een Thief een dagger noemt (#176) zijn het niet; een eigen
 * wapen van een Bowman wel (zoals bij het shield, #172). Alleen dan heeft het scherm een Ammo-slot.
 */
export function hasRangedWeapon(job: Job, weapon: EquipEntry): boolean {
  if (job === 'thief') return holdsClaw(weapon.pick, effectiveKind(weapon))
  if (job !== 'bowman' || isEmptyEntry(weapon)) return false
  return weapon.pick === OTHER || !isBeginnerWeapon(weapon.pick)
}

/** De slots die het scherm toont: die van de job (slotsFor), met Ammo alleen naast een wapen voor afstand (#188). */
export const shownSlots = (job: Job, weapon: EquipEntry): readonly EquipSlot[] =>
  slotsFor(job, weapon.pick, effectiveKind(weapon))
    .map(({ slot }) => slot)
    .filter((slot) => slot !== 'ammo' || hasRangedWeapon(job, weapon))

export const withWeaponKind = (e: EquipEntry, kind: WeaponKind): EquipEntry => ({ ...e, weaponKind: kind })

/**
 * Het profiel met de pijlkeuze en de dagger zoals de equipment ze toont (#170): een dagger alleen als er een in het wapenslot staat.
 * Na een wissel van job (of bij het laden) kan het wapenslot leeg zijn geworden; zonder dit rekende een terugkeer naar de Thief
 * stilletjes met Double Stab, zonder dat er een dagger in zijn hand staat.
 */
export const syncWithEquipment = (profile: ProfileDraft, eq: Equipment): ProfileDraft => ({
  ...syncArrow(profile, eq),
  dagger: isDaggerEntry(eq.claw) ? '1' : '0',
})

/**
 * De schakelaar "Ik heb Helpful Stranger" (#64) om of uit. Uit terwijl je bronze pijlen droeg: het ammo-slot valt terug op
 * de gewone pijl van dezelfde soort (boog of kruisboog), zodat het getal weer dat van de gewone pijl is.
 */
/** Het ammo-slot zonder bronze pijl: een bronze pijl wordt de gewone pijl van dezelfde soort (boog of kruisboog). */
function withoutBronze(ammo: EquipEntry): EquipEntry {
  const bronze = HELPFUL_STRANGER_ARROWS.find((a) => a.name === ammo.pick)
  if (!bronze) return ammo
  return { pick: (NPC_ARROWS.find((a) => a.for === bronze.for) ?? NPC_ARROWS[0]).name, name: '', stat: '' }
}

export function setHelpfulStranger(profile: ProfileDraft, eq: Equipment, on: boolean): { profile: ProfileDraft; equipment: Equipment } {
  const withSwitch = { ...profile, helpfulStranger: on ? '1' : '0' }
  if (on || !isBronzeArrow(eq.ammo.pick)) return { profile: withSwitch, equipment: eq }
  const equipment = { ...eq, ammo: withoutBronze(eq.ammo) }
  return { profile: syncArrow(withSwitch, equipment), equipment }
}

/**
 * Het profiel na een wissel in één slot. Claw: je weapon attack wordt die van de nieuwe claw, en bij een
 * ander wapen uit de catalogus ook je aanvalssnelheid (en bij een Warrior-wapen of een wapen onder level 10 zijn weapon multiplier, en of het een dagger is; pas je
 * alleen de WATK van hetzelfde wapen aan, dan blijven een zelf ingevulde aanvalssnelheid en multiplier staan). Armor: de WDEF in het profiel is het totaal uit je statvenster,
 * dus alleen het verschil tussen het oude en het nieuwe stuk erbij of eraf. Vul je een slot voor het eerst in,
 * dan blijft de WDEF staan: dat stuk zat er al in.
 */
export function applyEquipChange(profile: ProfileDraft, slot: EquipSlot, before: EquipEntry, after: EquipEntry): ProfileDraft {
  const next = wornStat(slot, after)
  if (slot === 'ammo') {
    // Elke wissel zet of het de bronze pijl is (W.ATT en prijs van de pijl volgen daaruit, zie parseProfile), ook een leeg
    // slot of een eigen item: dan telt de gewone pijl. Stars zetten hun weapon attack, en een andere star uit de lijst
    // ook zijn herlaadprijs. Een eigen item laat de herlaadprijs staan: die weet de app niet.
    const base = { ...profile, bronzeArrows: isBronzeArrow(after.pick) ? '1' : '0' }
    if (isArrow(after.pick) || next === undefined) return base
    const star = after.pick === before.pick ? undefined : THROWING_STARS.find((t) => t.name === after.pick)
    return { ...base, starWatk: String(next), ...(star ? { starRecharge: String(star.rechargePerStar) } : {}) }
  }
  if (!isArmorSlot(slot)) {
    // Een dagger onder level 10 rekent met LUK als hoofdstat (#171), een NPC-dagger met Double Stab (#170): elk ander nieuw wapen,
    // ook een eigen item, zet het uit.
    // Een eigen wapen is een dagger of een claw naar de keuze in het slot (#176); alleen die keuze wijzigen zet de dagger dus ook om.
    const dagger = isDaggerEntry(after) ? '1' : '0'
    const sameWeapon = after.pick === before.pick && (after.pick !== OTHER || isDaggerEntry(after) === isDaggerEntry(before))
    const withDagger = sameWeapon || profile.dagger === dagger ? profile : { ...profile, dagger }
    if (next === undefined) return withDagger
    const item = after.pick === OTHER || after.pick === before.pick ? undefined : anyItem('claw', after.pick)
    return {
      ...withDagger,
      clawWatk: String(next),
      ...(item?.attackMs !== undefined ? { attackMs: String(item.attackMs) } : {}),
      ...(item?.mult !== undefined ? { weaponMult: String(item.mult) } : {}),
    }
  }
  return shiftWdef(profile, next, [wornStat(slot, before)])
}

/**
 * Het profiel met de WDEF verschoven: `next` erbij en alles wat het vervangt (`replaced`) eraf. Is er iets onbekend
 * (of de WDEF in het profiel ongeldig), dan blijft het profiel zoals het was.
 */
function shiftWdef(profile: ProfileDraft, next: number | undefined, replaced: readonly (number | undefined)[]): ProfileDraft {
  const wdef = profile.wdef.trim()
  if (next === undefined || replaced.some((v) => v === undefined) || !/^\d+$/.test(wdef)) return profile
  const prev = replaced.reduce<number>((sum, v) => sum + (v ?? 0), 0)
  return { ...profile, wdef: String(Math.max(0, Number(wdef) + next - prev)) }
}

const isFilled = (e: EquipEntry): boolean => e.pick !== UNKNOWN

/**
 * Welke slots een nieuw stuk in `slot` vervangt (Dave, 4 oktober 2026, issue #50). Een overall beslaat top en bottom:
 * een overall erin vervangt wat je op top en bottom droeg, en een top of bottom erin vervangt een overall die je droeg
 * (de andere helft is dan leeg). Zonder overall in het spel is het gewoon het slot zelf.
 */
export function displacedSlots(eq: Equipment, slot: EquipSlot): readonly EquipSlot[] {
  if (slot === 'overall') return isFilled(eq.overall) ? ['overall'] : ['top', 'bottom']
  if (slot === 'top' || slot === 'bottom') return isFilled(eq.overall) ? ['overall'] : [slot]
  return [slot]
}

/**
 * De equipment en het profiel na een nieuwe invulling van één slot, met de overall-regel: kies je een overall, dan
 * worden top en bottom "nog niet ingevuld" (de overall beslaat ze); kies je een top of bottom terwijl je een overall
 * draagt, dan wordt de overall "nog niet ingevuld" en de andere helft "bekend leeg" (NONE, 0 WDEF). De WDEF in het
 * profiel gaat met het verschil tussen alles wat je vervangt en het nieuwe stuk, en het stuk telt één keer.
 * Bewust anders dan het advies: is van een vervangen slot de stat onbekend (nooit ingevuld, of een eigen item zonder
 * getal), dan blijft de WDEF in het profiel staan, want je beschrijft wat je al droeg en de app weet niet wat eraf
 * moet. Het advies telt een onbekende helft juist als leeg (zie armorUpgrade.ts), de grootste besparing die kan.
 * Een shield dat het nieuwe wapen niet toelaat komt eraf (#172): wissel je een wapen voor één hand voor een wapen voor
 * twee handen (of een leeg of eigen wapen), dan wordt het shield "nog niet ingevuld" en gaat zijn WDEF van het profiel af, zoals in het spel.
 * Is de stat van dat shield onbekend, dan blijft de WDEF staan (zie hierboven).
 */
export function changeEquipment(profile: ProfileDraft, eq: Equipment, slot: EquipSlot, after: EquipEntry, job: Job): { equipment: Equipment; profile: ProfileDraft } {
  if (slot === 'claw' && isFilled(eq.shield) && hasSlotFor(eq, job, 'shield') && !wearsSlot(job, 'shield', after.pick, effectiveKind(after))) {
    const bare: Equipment = { ...eq, shield: emptyEntry() }
    return changeEquipment(shiftWdef(profile, 0, [wornStat('shield', eq.shield)]), bare, slot, after, job)
  }
  const out: Equipment = { ...eq, [slot]: after }
  const displaced = displacedSlots(eq, slot)
  if (isFilled(after)) {
    // Een overall naast een top of bottom kan niet: de overall beslaat ze.
    if (slot === 'overall') {
      out.top = emptyEntry()
      out.bottom = emptyEntry()
    } else if (slot === 'top' || slot === 'bottom') {
      if (isFilled(eq.overall)) out[slot === 'top' ? 'bottom' : 'top'] = { ...emptyEntry(), pick: NONE }
      out.overall = emptyEntry()
    }
  }
  if (!isArmorSlot(slot) || (displaced.length === 1 && displaced[0] === slot)) {
    return { equipment: out, profile: applyEquipChange(profile, slot, eq[slot], after) }
  }
  return { equipment: out, profile: shiftWdef(profile, wornStat(slot, after), displaced.map((s) => wornStat(s, eq[s]))) }
}

/**
 * Equip boven je level kun je niet dragen (Dave, 8 oktober 2026, #264): de stand zoals de berekening hem ziet, zonder elk stuk dat een hoger level vraagt
 * dan je character heeft (een Steel Titans van level 15 op level 10), met zijn ATT of DEF eraf zoals bij een slot dat je zelf leegmaakt. De opslag
 * verandert niet: het stuk blijft bewaard en telt weer mee zodra je level hoog genoeg is. Een wapen laat een lege hand
 * achter: 0 weapon attack, zoals Cheapest met een leeg wapenslot rekent (#202). Een eigen item kent de app niet, dat blijft. `dropped` zegt welke
 * slots leeg werden; zonder heel level verandert er niets.
 */
export function dropAboveLevel(profile: ProfileDraft, eq: Equipment, job: Job): { equipment: Equipment; profile: ProfileDraft; dropped: EquipSlot[] } {
  // Een leeg of ongeldig levelveld is geen level 0: dan verandert er niets.
  const text = profile.level.trim()
  const level = text === '' ? NaN : Number(text)
  if (!Number.isInteger(level) || level < 1) return { equipment: eq, profile, dropped: [] }
  let out = { equipment: eq, profile }
  const dropped: EquipSlot[] = []
  for (const { slot } of EQUIP_SLOTS) {
    const name = wornName(out.equipment[slot])
    const needs = name === null ? undefined : itemLevel(slot, name)
    if (needs === undefined || needs <= level) continue
    out = changeEquipment(out.profile, out.equipment, slot, choosePick(slot, out.equipment[slot], NONE), job)
    if (slot === 'claw') out = { ...out, profile: { ...out.profile, clawWatk: '0' } }
    dropped.push(slot)
  }
  return { ...out, dropped }
}

/**
 * De startkleding (Dave, 8 oktober 2026): elk karakter begint met een top, een bottom en schoenen. De stukken staan met hun bron in
 * data/wornItems.ts; welke het precies zijn kies je bij het maken van je karakter, de app neemt de gewone keuze per geslacht.
 */
export const STARTER_CLOTHES: { readonly top: Readonly<Record<Gender, string>>; readonly bottom: Readonly<Record<Gender, string>>; readonly shoes: string } = {
  top: { male: 'White Undershirt', female: 'White Tube Top' },
  bottom: { male: 'Blue Jean Shorts', female: 'Red Miniskirt' },
  shoes: 'Leather Sandals',
}

/**
 * De hoed van de quest Lucas's Reply op Maple Island (Dave, 8 oktober 2026; meowdb.com/msclassic/quest-tracker/1008, gelezen 2026-10-08): een
 * Beginner krijgt willekeurig een van zeven hoeden van level 5 met 6 DEF. Ze zijn gelijk, dus de app rekent met de eerste, de Brown Skullcap (708).
 */
export const QUEST_HAT = 'Brown Skullcap'

/** Het mes dat je als Beginner krijgt (Dave, 8 oktober 2026): de Fruit Knife (559, level 8, dagger). Alleen op level 8 en 9; vanaf level 10 het wapen van je job (freeJobWeapon.ts). */
export const BEGINNER_KNIFE = 'Fruit Knife'
const BEGINNER_LAST_LEVEL = 9

/**
 * Wat je echt draagt, zoals de berekening het ziet (Dave, 8 oktober 2026): zonder equip boven je level (dropAboveLevel, #264), en wat je in het begin
 * gratis krijgt in een leeg slot: je startkleding (STARTER_CLOTHES; een top of bottom alleen zonder overall, zonder geslacht alleen de schoenen), vanaf
 * level 5 de questhoed (QUEST_HAT), op level 8 en 9 de Fruit Knife (BEGINNER_KNIFE) voor een job die hem kan dragen, en vanaf level 10 het gratis wapen van je
 * 1e job (freeJobWeapon.ts, Dave, 9 oktober 2026: de Beginner's Garnier van een Thief, de Beginner's Wooden Wand van een Magician; een Warrior en een Bowman krijgen er
 * geen), maar alleen als je het kunt dragen (zijn LUK- of INT-eis) en je geen hogere weapon attack typte dan het wapen geeft (anders draag je iets beters, en wint wat je typte). Een slot dat nog niet was ingevuld laat je WDEF staan (die rekent al met wat je droeg); een slot dat leeg raakte, krijgt de DEF erbij. Het wapen zet wel
 * zijn eigen weapon attack: een leeg wapenslot is op dat level dat wapen, ook als je zelf een getal had getypt. Draag je al een wapen (ook een Fruit Knife), dan blijft het
 * staan: of het gratis jobwapen beter is, beslist het wapenadvies van Cheapest (clawUpgrade.ts), niet deze stap.
 * Met `checkRequirements` uit (freshStart: Cheapest bouwt je AP zelf op, het standaardprofiel zegt daar niets over) telt alleen de typregel, niet de stat-eis.
 */
export function wearableSetup(profile: ProfileDraft, eq: Equipment, job: Job, gender: Gender | null, checkRequirements = true): { equipment: Equipment; profile: ProfileDraft; dropped: EquipSlot[] } {
  const below = dropAboveLevel(profile, eq, job)
  let out = { equipment: below.equipment, profile: below.profile }
  const text = profile.level.trim()
  const level = text === '' ? NaN : Number(text)
  const free: [EquipSlot, string | null][] = [
    ['top', gender ? STARTER_CLOTHES.top[gender] : null],
    ['bottom', gender ? STARTER_CLOTHES.bottom[gender] : null],
    ['shoes', STARTER_CLOTHES.shoes],
    ['hat', QUEST_HAT],
    ['claw', level >= FREE_WEAPON_LEVEL ? freeJobWeaponName(job) : level <= BEGINNER_LAST_LEVEL && catalogItems('claw', job).some((i) => i.name === BEGINNER_KNIFE) ? BEGINNER_KNIFE : null],
  ]
  for (const [slot, name] of free) {
    if (name === null || wornName(out.equipment[slot]) !== null) continue
    // Het gratis jobwapen alleen als je het kunt dragen (zijn stat-eis) en je niet een hogere weapon attack typte dan het geeft: dan draag je waarschijnlijk iets beters (Dave, 9 oktober 2026).
    if (slot === 'claw' && name === freeJobWeaponName(job) && ((checkRequirements && !meetsFreeWeaponRequirements(job, out.profile)) || typedAttackBeatsFreeWeapon(job, out.profile))) continue
    if ((slot === 'top' || slot === 'bottom') && wornName(out.equipment.overall) !== null) continue
    // Wat een level vraagt (de hoed 5, het mes 8), alleen met een geldig level dat hoog genoeg is.
    const needs = itemLevel(slot, name) ?? 0
    if (needs > 0 && !(Number.isInteger(level) && needs <= level)) continue
    // Viel er een overall af (boven je level), dan zijn top en bottom echt leeg en komt de DEF van de startkleding erbij (Victor, 8 oktober 2026).
    const before = (slot === 'top' || slot === 'bottom') && below.dropped.includes('overall') ? { ...emptyEntry(), pick: NONE } : out.equipment[slot]
    out = changeEquipment(out.profile, { ...out.equipment, [slot]: before }, slot, choosePick(slot, before, name), job)
  }
  return { ...out, dropped: below.dropped }
}

/**
 * De nieuwe invulling na een keuze in de zoekbalk. Een catalogusitem begint met de waarde uit de database.
 * Kies je een eigen item (met de getypte naam) terwijl de app wist wat je droeg, dan begint de stat op die
 * waarde: dat is een wissel van 0 tot je een ander getal typt. Anders begint hij leeg.
 */
export function choosePick(slot: EquipSlot, current: EquipEntry, pick: string, name = ''): EquipEntry {
  // "Empty" (Dave, 6 oktober 2026, #188): een armorslot is dan bekend leeg (0 DEF, de DEF van het stuk gaat eraf); een wapen of
  // ammo is weer nog niet ingevuld, zodat het profiel zijn weapon attack en stars houdt (een leeg ammo-slot rekent met Subi, #117).
  if (pick === NONE) return isArmorSlot(slot) ? { ...emptyEntry(), pick: NONE } : emptyEntry()
  if (pick !== OTHER) return { pick, name: '', stat: '' }
  const known = wornStat(slot, current)
  return { pick, name: name.trim().slice(0, MAX_NAME_LENGTH), stat: known === undefined ? '' : String(known) }
}

/**
 * Een gecorrigeerde stat wordt vastgelegd (Opslaan of Enter): de entry met de getypte stat, of null als er niets
 * te doen valt. Bij een eigen item geldt een leeg of onleesbaar getal niet. Bij een catalogusitem betekent leeg
 * "weer de database", en een getal gelijk aan de database wordt ook leeg bewaard: dat is geen aanpassing.
 * Bewaard wordt het getal zoals het meetelt (afgekapt en begrensd), zodat rij, popup en opslag hetzelfde tonen.
 */
export function commitStat(slot: EquipSlot, entry: EquipEntry, text: string): EquipEntry | null {
  if (entry.pick === UNKNOWN) return null
  const n = parseStat(text)
  if (entry.pick === OTHER) return n === undefined ? null : { ...entry, stat: String(n) }
  const db = databaseStat(slot, entry)
  if (db === undefined || (text.trim() !== '' && n === undefined)) return null
  return { ...entry, stat: n === undefined || n === db ? '' : String(n) }
}

/**
 * De equipment na een wissel van job: een slot met een catalogusitem dat de nieuwe job niet heeft, wordt "nog niet
 * ingevuld". Het profiel blijft zoals het was (van bekend naar onbekend laat WATK en WDEF staan, zie applyEquipChange).
 */
export function equipmentForJob(eq: Equipment, job: Job): Equipment {
  const out = { ...eq }
  for (const { slot } of EQUIP_SLOTS) {
    const { pick } = eq[slot]
    if (pick !== UNKNOWN && pick !== OTHER && pick !== NONE && !catalogItem(slot, pick, job, out.claw.pick)) out[slot] = emptyEntry()
  }
  // De soort van een eigen wapen hoort bij de Thief (#176): een andere job rekent anders stil met een dagger, net als een NPC-dagger die hierboven verdwijnt.
  if (job !== 'thief' && out.claw.weaponKind !== undefined) {
    const { weaponKind: _dropped, ...claw } = out.claw
    out.claw = claw
  }
  // Een shield dat de nieuwe job met zijn wapen niet draagt (Dave, 7 oktober 2026), wordt "nog niet ingevuld", net als hierboven.
  if (!hasSlotFor(out, job, 'shield')) out.shield = emptyEntry()
  return out
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

/** Eén bewaard slot; een onbekende of verdwenen keuze (ook het oude "niets") wordt "nog niet ingevuld". Een eigen stat bij een catalogusitem blijft alleen als hij geldig is en afwijkt van de database. */
function loadEntry(slot: EquipSlot, v: unknown, job: Job, weapon: string): EquipEntry {
  if (typeof v !== 'object' || v === null) return emptyEntry()
  const raw = v as Record<string, unknown>
  const pick = typeof raw.pick === 'string' ? raw.pick : UNKNOWN
  if (pick === OTHER) {
    const base = { pick, name: str(raw.name, MAX_NAME_LENGTH), stat: str(raw.stat, MAX_STAT_LENGTH) }
    // De soort geldt alleen voor het wapen van een Thief; oude opslag heeft hem niet en laadt als claw (#176).
    return slot === 'claw' && job === 'thief' && raw.weaponKind === 'dagger' ? { ...base, weaponKind: 'dagger' } : base
  }
  if (pick === NONE && (slot === 'top' || slot === 'bottom')) return { ...emptyEntry(), pick }
  if (pick !== UNKNOWN && catalogItem(slot, pick, job, weapon)) {
    const stat = str(raw.stat, MAX_STAT_LENGTH).trim()
    return { pick, name: '', stat: statOverride(slot, { pick, name: '', stat }) === undefined ? '' : stat }
  }
  return emptyEntry()
}

/** De bewaarde equipment; een ontbrekend of onbruikbaar slot is "nog niet ingevuld". */
export function loadEquipment(storage: Storage | null | undefined, job: Job, helpfulStranger = false): Equipment {
  const out = defaultEquipment()
  try {
    const raw = storage?.getItem(EQUIPMENT_KEY)
    if (!raw) return out
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return out
    const slots = (data as { slots?: unknown }).slots
    if (typeof slots !== 'object' || slots === null) return out
    // Het wapenslot (claw) staat voorop in EQUIP_SLOTS: het shield van een Bowman wordt geladen met het wapen dat hij net kreeg (#172).
    for (const { slot } of EQUIP_SLOTS) out[slot] = loadEntry(slot, (slots as Record<string, unknown>)[slot], job, out.claw.pick)
    // Een shield naast een wapen voor twee handen of een leeg wapenslot (Dave, 7 oktober 2026) blijft niet verborgen bewaard.
    if (!hasSlotFor(out, job, 'shield')) out.shield = emptyEntry()
    // Opslag van voor de overall (issue #50) heeft het slot niet: dat laadt als leeg. Staat er wel een overall naast
    // een top of bottom (handmatig bewerkt), dan wint de overall, want die beslaat ze.
    if (isFilled(out.overall)) {
      out.top = emptyEntry()
      out.bottom = emptyEntry()
    }
    // Profiel en equipment staan in aparte opslag: zonder Helpful Stranger in het profiel is een bewaarde bronze pijl de gewone (#64).
    if (!helpfulStranger) out.ammo = withoutBronze(out.ammo)
    return out
  } catch {
    return out
  }
}

/** Bewaar de equipment zoals ingevuld; true als het gelukt is. Mislukken breekt de app niet. */
export function saveEquipment(storage: Storage | null | undefined, eq: Equipment): boolean {
  try {
    if (!storage) return false
    const slots = Object.fromEntries(
      EQUIP_SLOTS.map(({ slot }) => {
        const e = eq[slot]
        return [slot, { pick: e.pick, name: e.name.slice(0, MAX_NAME_LENGTH), stat: e.stat.slice(0, MAX_STAT_LENGTH), ...(slot === 'claw' && e.weaponKind === 'dagger' && e.pick === OTHER ? { weaponKind: e.weaponKind } : {}) }]
      }),
    )
    storage.setItem(EQUIPMENT_KEY, JSON.stringify({ version: VERSION, slots }))
    return true
  } catch {
    return false
  }
}
