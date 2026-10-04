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
import { NPC_ARMOR } from './data/armor'
import { BOWMAN_ARMOR, BOWMAN_WEAPONS, isBronzeArrow, WORN_BOWMAN_ARMOR } from './bowmanGear'
import { HELPFUL_STRANGER_ARROWS, NPC_ARROWS } from './data/bowman'
import { NPC_CLAWS } from './data/claws'
import { THROWING_STARS } from './data/thief'
import type { ArmorPiece, ArmorSlot, Weapon, WornArmor, WornClaw } from './data/types'
import { WORN_ARMOR, WORN_CLAWS } from './data/wornItems'
import { WORN_WARRIOR_ARMOR } from './data/wornWarrior'
import type { Job } from './job'
import type { ProfileDraft } from './profile'
import { MAGICIAN_ARMOR, MAGICIAN_WEAPONS, WORN_MAGICIAN_ARMOR } from './magicianGear'
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
  { slot: 'top', label: 'Top' },
  { slot: 'bottom', label: 'Bottom' },
  { slot: 'overall', label: 'Overall' },
  { slot: 'shoes', label: 'Shoes' },
  { slot: 'gloves', label: 'Gloves' },
  { slot: 'cape', label: 'Cape' },
  { slot: 'earrings', label: 'Earrings' },
]

/** Of een job het slot heeft. */
const hasSlot = (job: Job, slot: EquipSlot): boolean => {
  // Ammo alleen voor de Thief (stars) en de Bowman (pijlen); een Warrior of Magician gooit niets.
  if (slot === 'ammo') return job === 'thief' || job === 'bowman'
  // Een shield (issue #117) alleen naast een wapen voor één hand: een boog of kruisboog vraagt beide handen. Een claw niet:
  // de Thief draagt in het shield-slot zijn wristguards (issue #133; Seclusion, Nimble en Jurgen Wristguard op NiaMeowDB).
  if (slot === 'shield') return job !== 'bowman'
  return true
}

/** De slots die een job heeft, in de volgorde van het scherm. */
export const slotsFor = (job: Job): readonly { slot: EquipSlot; label: string }[] => EQUIP_SLOTS.filter((s) => hasSlot(job, s.slot))

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
}

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
  /** Alleen een Warrior-wapen: de verwachte weapon multiplier van een basisaanval, zodat die mee verandert. */
  mult?: number
  /** Alleen armor: de MDEF van de pagina, 0 als die er geen noemt (#91). */
  mdef?: number
}

/** Hoeveel zoekresultaten het scherm toont. */
export const MAX_RESULTS = 8

/**
 * De winkelitems en de items zonder prijs per job die de app kent: de Thief (claws, Thief-armor, de draagbare
 * items), de Warrior (zijn wapens en armor uit de winkel, plus de items zonder prijs: wornWarrior.ts en de
 * items zonder jobregel die ook de Thief draagt), de Bowman (bogen, kruisbogen en armor uit de winkel, plus de items
 * zonder jobregel, zie bowmanGear.ts) en de Magician (zijn wands, staffs en armor uit de winkel, plus de items zonder
 * jobregel, zie magicianGear.ts; het getal van zijn wapen is de M.ATT). Een naam mag bij meer jobs staan, maar dan is het hetzelfde
 * item (dezelfde stat en bron; een test bewaakt dat). Elke job heeft zijn winkellijst; een item van een andere job aanbieden zou onwaar zijn.
 */
const SHOP: Partial<Record<Job, { weapons: readonly Weapon[]; armor: readonly ArmorPiece[]; wornWeapons: readonly (WornClaw & { mult?: number })[]; wornArmor: readonly WornArmor[] }>> = {
  thief: { weapons: NPC_CLAWS, armor: NPC_ARMOR, wornWeapons: WORN_CLAWS, wornArmor: WORN_ARMOR },
  warrior: { weapons: WARRIOR_WEAPONS, armor: WARRIOR_ARMOR, wornWeapons: WORN_WARRIOR_CLAWS, wornArmor: WORN_WARRIOR_ARMOR },
  bowman: { weapons: BOWMAN_WEAPONS, armor: BOWMAN_ARMOR, wornWeapons: [], wornArmor: WORN_BOWMAN_ARMOR },
  magician: { weapons: MAGICIAN_WEAPONS, armor: MAGICIAN_ARMOR, wornWeapons: [], wornArmor: WORN_MAGICIAN_ARMOR },
}

/**
 * De catalogus van een slot voor een job: de NPC-items, dan de items zonder prijs; staat een naam twee keer in,
 * dan wint de NPC-regel. De bronze pijlen van een Bowman staan er alleen in met `helpfulStranger` (#64): zonder die
 * rang kan hij ze niet kopen, dus de lijst biedt ze dan niet aan.
 */
export function catalogItems(slot: EquipSlot, job: Job, helpfulStranger = false): readonly CatalogItem[] {
  // Het ammo-slot: stars voor een Thief, pijlen voor een Bowman (de Bowman-data van issue #44); een Warrior heeft het niet.
  if (slot === 'ammo') {
    if (job === 'thief') return THROWING_STARS.map((t) => ({ name: t.name, level: t.level, stat: t.watk }))
    if (job === 'bowman') return [...NPC_ARROWS, ...(helpfulStranger ? HELPFUL_STRANGER_ARROWS : [])].map((a) => ({ name: a.name, stat: a.watk }))
    return []
  }
  const shop = SHOP[job]
  if (!shop) return []
  const items: CatalogItem[] = isArmorSlot(slot)
    ? [...shop.armor, ...shop.wornArmor].filter((a) => a.slot === slot).map((a) => ({ name: a.name, level: a.level, stat: a.wdef, mdef: a.mdef ?? 0 }))
    : [...shop.weapons, ...shop.wornWeapons].map((c) => ({
        name: c.name,
        level: c.level,
        stat: c.watk,
        attackMs: c.speed.attackMs,
        ...(c.mult !== undefined ? { mult: c.mult } : {}),
      }))
  return items.filter((i, n) => items.findIndex((j) => j.name === i.name) === n)
}

// Opzoeken kent ook de bronze pijlen: wat je draagt blijft bestaan, ook als de lijst het niet (meer) aanbiedt.
const catalogItem = (slot: EquipSlot, name: string, job: Job) => catalogItems(slot, job, true).find((i) => i.name === name)

// Een catalogusitem in een slot bestaat alleen voor de job waarvoor hij geldt (loadEquipment en equipmentForJob
// zorgen daarvoor), en een naam die bij twee jobs staat is hetzelfde item (een test bewaakt dat): bij het rekenen zoeken
// we dus in de lijsten van alle jobs.
const anyItem = (slot: EquipSlot, name: string): CatalogItem | undefined =>
  (Object.keys(SHOP) as Job[]).map((j) => catalogItem(slot, name, j)).find((i) => i !== undefined)

/** De catalogusitems waarvan de naam de tekst bevat, zonder hoofdletters en spaties rond de tekst; een lege tekst geeft alles. */
export function searchCatalog(slot: EquipSlot, job: Job, query: string, helpfulStranger = false): readonly CatalogItem[] {
  const q = query.trim().toLowerCase()
  return catalogItems(slot, job, helpfulStranger).filter((i) => i.name.toLowerCase().includes(q))
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

/** De WDEF per armorslot waarvan de app weet wat je draagt, en of je een overall draagt, ook met onbekende WDEF (#118). */
export function wornWdef(eq: Equipment): WornWdef {
  const out: WornWdef = {}
  for (const { slot } of EQUIP_SLOTS) {
    if (!isArmorSlot(slot)) continue
    const w = wornStat(slot, eq[slot])
    if (w !== undefined) out[slot] = w
  }
  if (isFilled(eq.overall)) out.overallWorn = true
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
 * Geen wapen van de app heeft MDEF, dus het wapen telt niet. Shield, gloves, cape en earrings (issue #117) tellen ook niet: die
 * vul je als eigen item, waarvan de app alleen de WDEF vraagt, dus hun MDEF is nooit bekend. Null zolang van één van die slots de MDEF onbekend is:
 * een som met een gat erin zou een te laag getal tonen.
 */
export function wornMdef(eq: Equipment): number | null {
  const body: readonly ArmorSlot[] = isEmptyEntry(eq.overall) ? ['top', 'bottom'] : ['overall']
  let sum = 0
  for (const slot of ['hat', ...body, 'shoes'] as const) {
    const m = slotMdef(slot, eq[slot])
    if (m === undefined) return null
    sum += m
  }
  return sum
}

/** De naam van wat je in dit slot draagt, voor een samenvatting; null als het slot nog niet is ingevuld. */
export function wornName(entry: EquipEntry): string | null {
  if (isEmptyEntry(entry)) return null
  if (entry.pick === OTHER) return entry.name.trim() || 'eigen item'
  return entry.pick
}

/** Hoe een keuze heet in de "was"-badge; een eigen stat bij een catalogusitem staat erbij. */
export function entryLabel(slot: EquipSlot, entry: EquipEntry): string {
  if (entry.pick === UNKNOWN) return 'nog niet ingevuld'
  if (entry.pick === NONE) return 'niets'
  if (entry.pick === OTHER) return entry.name.trim() || 'Eigen item'
  const own = statOverride(slot, entry)
  return own === undefined ? entry.pick : `${entry.pick} (aangepast: ${own})`
}

/** Of dit slot anders is dan in `before` (voor de "was"-badge). Bij elke keuze telt een andere stat; de naam alleen bij een eigen item. */
export const entryChanged = (a: EquipEntry, b: EquipEntry): boolean =>
  a.pick !== b.pick || (a.pick !== UNKNOWN && a.stat.trim() !== b.stat.trim()) || (a.pick === OTHER && a.name.trim() !== b.name.trim())

const isArrow = (name: string): boolean => NPC_ARROWS.some((a) => a.name === name) || isBronzeArrow(name)

/** Het profiel met de pijlkeuze zoals de equipment ze toont: bronze alleen als de bronze pijl in het ammo-slot staat. */
export const syncArrow = (profile: ProfileDraft, eq: Equipment): ProfileDraft => ({ ...profile, bronzeArrows: isBronzeArrow(eq.ammo.pick) ? '1' : '0' })

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
 * ander wapen uit de catalogus ook je aanvalssnelheid (en bij een Warrior-wapen zijn weapon multiplier; pas je
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
    if (next === undefined) return profile
    const item = after.pick === OTHER || after.pick === before.pick ? undefined : anyItem('claw', after.pick)
    return {
      ...profile,
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
 */
export function changeEquipment(profile: ProfileDraft, eq: Equipment, slot: EquipSlot, after: EquipEntry): { equipment: Equipment; profile: ProfileDraft } {
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
 * De nieuwe invulling na een keuze in de zoekbalk. Een catalogusitem begint met de waarde uit de database.
 * Kies je een eigen item (met de getypte naam) terwijl de app wist wat je droeg, dan begint de stat op die
 * waarde: dat is een wissel van 0 tot je een ander getal typt. Anders begint hij leeg.
 */
export function choosePick(slot: EquipSlot, current: EquipEntry, pick: string, name = ''): EquipEntry {
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
    if (pick !== UNKNOWN && pick !== OTHER && pick !== NONE && !catalogItem(slot, pick, job)) out[slot] = emptyEntry()
  }
  return out
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

/** Eén bewaard slot; een onbekende of verdwenen keuze (ook het oude "niets") wordt "nog niet ingevuld". Een eigen stat bij een catalogusitem blijft alleen als hij geldig is en afwijkt van de database. */
function loadEntry(slot: EquipSlot, v: unknown, job: Job): EquipEntry {
  if (typeof v !== 'object' || v === null) return emptyEntry()
  const raw = v as Record<string, unknown>
  const pick = typeof raw.pick === 'string' ? raw.pick : UNKNOWN
  if (pick === OTHER) return { pick, name: str(raw.name, MAX_NAME_LENGTH), stat: str(raw.stat, MAX_STAT_LENGTH) }
  if (pick === NONE && (slot === 'top' || slot === 'bottom')) return { ...emptyEntry(), pick }
  if (pick !== UNKNOWN && catalogItem(slot, pick, job)) {
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
    for (const { slot } of EQUIP_SLOTS) out[slot] = loadEntry(slot, (slots as Record<string, unknown>)[slot], job)
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
        return [slot, { pick: e.pick, name: e.name.slice(0, MAX_NAME_LENGTH), stat: e.stat.slice(0, MAX_STAT_LENGTH) }]
      }),
    )
    storage.setItem(EQUIPMENT_KEY, JSON.stringify({ version: VERSION, slots }))
    return true
  } catch {
    return false
  }
}
