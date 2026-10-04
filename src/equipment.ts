// De equipment die je draagt (Dave, 4 oktober 2026): per slot een claw, hoed, bovenstuk, broek of schoenen.
// Het rekent mee: de claw zet je weapon attack en aanvalssnelheid in het profiel, armor past je WDEF aan, en
// het armor-advies weet zo wat je in een slot al draagt. Je draagt altijd iets (Dave, 4 oktober 2026): er is
// geen keuze "weet ik niet" of "niets", alleen een slot dat nog niet is ingevuld. Puur, zonder UI-import. Alles
// uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op "nog niet ingevuld". Je zoekt wat je draagt in
// een catalogus per slot (NPC-items plus items zonder prijs); klopt de stat in het spel niet met de database,
// dan corrigeer je hem in de popup achter het potlood: wat je in je spel ziet, telt.
import { NPC_ARMOR } from './data/armor'
import { NPC_CLAWS } from './data/claws'
import type { ArmorSlot } from './data/types'
import { WORN_ARMOR, WORN_CLAWS } from './data/wornItems'
import type { Job } from './job'
import type { ProfileDraft } from './profile'

export const EQUIPMENT_KEY = 'mesowise.equipment.v1'
const VERSION = 1
/** De maximale lengte van de naam bij een eigen item. */
export const MAX_NAME_LENGTH = 40
const MAX_STAT_LENGTH = 12
const MAX_STAT = 999

export type EquipSlot = 'claw' | ArmorSlot

/** De slots in de volgorde waarin het scherm ze toont. */
export const EQUIP_SLOTS: readonly { slot: EquipSlot; label: string }[] = [
  { slot: 'claw', label: 'Weapon' },
  { slot: 'hat', label: 'Hat' },
  { slot: 'top', label: 'Top' },
  { slot: 'bottom', label: 'Bottom' },
  { slot: 'shoes', label: 'Shoes' },
]

/** Nog niet ingevuld: de begintoestand van een slot. Geen keuze in de lijst; terugkiezen kan niet. */
export const UNKNOWN = 'unknown'
export const OTHER = 'other'

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
  hat: emptyEntry(),
  top: emptyEntry(),
  bottom: emptyEntry(),
  shoes: emptyEntry(),
})

const isArmorSlot = (slot: EquipSlot): slot is ArmorSlot => slot !== 'claw'

/** Hoe het scherm de stat van een slot noemt: ATT voor het wapen en DEF voor armor, zoals het spel. */
export const statName = (slot: EquipSlot): string => (isArmorSlot(slot) ? 'DEF' : 'ATT')

/** Een item in de catalogus van een slot: naam, level en de stat die telt (WATK voor een claw, WDEF voor armor). */
export interface CatalogItem {
  name: string
  level: number
  stat: number
  /** Alleen een claw: de tijd per aanval met Lucky Seven, zodat de aanvalssnelheid mee verandert. */
  attackMs?: number
}

/** Hoeveel zoekresultaten het scherm toont. */
export const MAX_RESULTS = 8

/**
 * De catalogus van een slot voor een job: de NPC-items, dan de items zonder prijs; staat een naam twee keer in,
 * dan wint de NPC-regel. Alle itemdata is nu van de Thief (claws, Thief-armor, de draagbare items); voor een
 * andere job is de lijst leeg tot die data er is (issues #42 tot #45), want een Thief-item aanbieden aan een
 * Warrior zou onwaar zijn.
 */
export function catalogItems(slot: EquipSlot, job: Job): readonly CatalogItem[] {
  if (job !== 'thief') return []
  const items: CatalogItem[] = isArmorSlot(slot)
    ? [...NPC_ARMOR, ...WORN_ARMOR].filter((a) => a.slot === slot).map((a) => ({ name: a.name, level: a.level, stat: a.wdef }))
    : [...NPC_CLAWS, ...WORN_CLAWS].map((c) => ({ name: c.name, level: c.level, stat: c.watk, attackMs: c.speed.attackMs }))
  return items.filter((i, n) => items.findIndex((j) => j.name === i.name) === n)
}

const catalogItem = (slot: EquipSlot, name: string, job: Job) => catalogItems(slot, job).find((i) => i.name === name)

// Een catalogusitem in een slot bestaat alleen voor de job waarvoor hij geldt (loadEquipment en equipmentForJob
// zorgen daarvoor), dus bij het rekenen zoeken we in de Thief-lijst: een andere job heeft nooit een catalogusitem.
const thiefItem = (slot: EquipSlot, name: string) => catalogItem(slot, name, 'thief')

/** De catalogusitems waarvan de naam de tekst bevat, zonder hoofdletters en spaties rond de tekst; een lege tekst geeft alles. */
export function searchCatalog(slot: EquipSlot, job: Job, query: string): readonly CatalogItem[] {
  const q = query.trim().toLowerCase()
  return catalogItems(slot, job).filter((i) => i.name.toLowerCase().includes(q))
}

/** Een getal uit een invulveld, geheel en binnen 0..999; undefined bij leeg of onleesbaar. */
function parseStat(text: string): number | undefined {
  const t = text.trim()
  const n = Number(t)
  return t !== '' && Number.isFinite(n) ? Math.min(MAX_STAT, Math.max(0, Math.trunc(n))) : undefined
}

/** De waarde uit de database van wat je draagt; undefined bij nog niet ingevuld, een eigen item of een naam die niet (meer) bestaat. */
export const databaseStat = (slot: EquipSlot, entry: EquipEntry): number | undefined =>
  entry.pick === UNKNOWN || entry.pick === OTHER ? undefined : thiefItem(slot, entry.pick)?.stat

/** De eigen waarde bij een catalogusitem als die geldig is en afwijkt van de database; anders undefined. */
export function statOverride(slot: EquipSlot, entry: EquipEntry): number | undefined {
  const db = databaseStat(slot, entry)
  const own = parseStat(entry.stat)
  return db !== undefined && own !== undefined && own !== db ? own : undefined
}

/** WATK of WDEF van wat je draagt; undefined = onbekend, ook bij een eigen item zonder (geldig) getal: dan weet de app niet wat het stuk geeft. */
export function wornStat(slot: EquipSlot, entry: EquipEntry): number | undefined {
  if (entry.pick === UNKNOWN) return undefined
  if (entry.pick === OTHER) return parseStat(entry.stat)
  const db = databaseStat(slot, entry)
  return db === undefined ? undefined : (parseStat(entry.stat) ?? db)
}

/** De WDEF per armorslot waarvan de app weet wat je draagt. */
export function wornWdef(eq: Equipment): Partial<Record<ArmorSlot, number>> {
  const out: Partial<Record<ArmorSlot, number>> = {}
  for (const { slot } of EQUIP_SLOTS) {
    if (!isArmorSlot(slot)) continue
    const w = wornStat(slot, eq[slot])
    if (w !== undefined) out[slot] = w
  }
  return out
}

/** De naam van wat je in dit slot draagt, voor een samenvatting; null als het slot nog niet is ingevuld. */
export function wornName(entry: EquipEntry): string | null {
  if (entry.pick === UNKNOWN) return null
  if (entry.pick === OTHER) return entry.name.trim() || 'eigen item'
  return entry.pick
}

/** Hoe een keuze heet in de "was"-badge; een eigen stat bij een catalogusitem staat erbij. */
export function entryLabel(slot: EquipSlot, entry: EquipEntry): string {
  if (entry.pick === UNKNOWN) return 'nog niet ingevuld'
  if (entry.pick === OTHER) return entry.name.trim() || 'Eigen item'
  const own = statOverride(slot, entry)
  return own === undefined ? entry.pick : `${entry.pick} (aangepast: ${own})`
}

/** Of dit slot anders is dan in `before` (voor de "was"-badge). Bij elke keuze telt een andere stat; de naam alleen bij een eigen item. */
export const entryChanged = (a: EquipEntry, b: EquipEntry): boolean =>
  a.pick !== b.pick || (a.pick !== UNKNOWN && a.stat.trim() !== b.stat.trim()) || (a.pick === OTHER && a.name.trim() !== b.name.trim())

/**
 * Het profiel na een wissel in één slot. Claw: je weapon attack wordt die van de nieuwe claw, en bij een
 * andere claw uit de catalogus ook je aanvalssnelheid (pas je alleen de WATK van dezelfde claw aan, dan blijft
 * een zelf ingevulde aanvalssnelheid staan). Armor: de WDEF in het profiel is het totaal uit je statvenster,
 * dus alleen het verschil tussen het oude en het nieuwe stuk erbij of eraf. Vul je een slot voor het eerst in,
 * dan blijft de WDEF staan: dat stuk zat er al in.
 */
export function applyEquipChange(profile: ProfileDraft, slot: EquipSlot, before: EquipEntry, after: EquipEntry): ProfileDraft {
  const next = wornStat(slot, after)
  if (!isArmorSlot(slot)) {
    if (next === undefined) return profile
    const attackMs = after.pick === OTHER || after.pick === before.pick ? undefined : thiefItem('claw', after.pick)?.attackMs
    return { ...profile, clawWatk: String(next), ...(attackMs !== undefined ? { attackMs: String(attackMs) } : {}) }
  }
  const prev = wornStat(slot, before)
  const wdef = profile.wdef.trim()
  if (prev === undefined || next === undefined || !/^\d+$/.test(wdef)) return profile
  return { ...profile, wdef: String(Math.max(0, Number(wdef) + next - prev)) }
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
    if (pick !== UNKNOWN && pick !== OTHER && !catalogItem(slot, pick, job)) out[slot] = emptyEntry()
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
  if (pick !== UNKNOWN && catalogItem(slot, pick, job)) {
    const stat = str(raw.stat, MAX_STAT_LENGTH).trim()
    return { pick, name: '', stat: statOverride(slot, { pick, name: '', stat }) === undefined ? '' : stat }
  }
  return emptyEntry()
}

/** De bewaarde equipment; een ontbrekend of onbruikbaar slot is "nog niet ingevuld". */
export function loadEquipment(storage: Storage | null | undefined, job: Job): Equipment {
  const out = defaultEquipment()
  try {
    const raw = storage?.getItem(EQUIPMENT_KEY)
    if (!raw) return out
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return out
    const slots = (data as { slots?: unknown }).slots
    if (typeof slots !== 'object' || slots === null) return out
    for (const { slot } of EQUIP_SLOTS) out[slot] = loadEntry(slot, (slots as Record<string, unknown>)[slot], job)
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
