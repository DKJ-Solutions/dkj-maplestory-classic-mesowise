// De equipment die je draagt (Dave, 4 oktober 2026): per slot een claw, hoed, bovenstuk, broek of schoenen.
// Het rekent mee: de claw zet je weapon attack en aanvalssnelheid in het profiel, armor past je WDEF aan, en
// het armor-advies weet zo wat je in een slot al draagt. Puur, zonder UI-import. Alles uit de opslag is
// onbetrouwbaar: wat niet klopt, valt terug op "Weet ik niet".
import { NPC_ARMOR } from './data/armor'
import { NPC_CLAWS } from './data/claws'
import type { ArmorSlot } from './data/types'
import type { Job } from './job'
import type { ProfileDraft } from './profile'

export const EQUIPMENT_KEY = 'mesowise.equipment.v1'
const VERSION = 1
/** De maximale lengte van de naam bij "Ander item". */
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

export const UNKNOWN = 'unknown'
export const NONE = 'none'
export const OTHER = 'other'

/**
 * Wat je in één slot draagt, zoals ingevuld. `pick` is 'unknown' (weet ik niet), 'none' (niets), 'other'
 * (een ander item: `name` en `stat` gelden dan) of de naam van een item uit de winkel.
 */
export interface EquipEntry {
  pick: string
  name: string
  stat: string
}

export type Equipment = Record<EquipSlot, EquipEntry>

const emptyEntry = (): EquipEntry => ({ pick: UNKNOWN, name: '', stat: '' })

/** Niets bekend: zo begint iedereen, ook wie de app al gebruikte. */
export const defaultEquipment = (): Equipment => ({
  claw: emptyEntry(),
  hat: emptyEntry(),
  top: emptyEntry(),
  bottom: emptyEntry(),
  shoes: emptyEntry(),
})

const isArmorSlot = (slot: EquipSlot): slot is ArmorSlot => slot !== 'claw'

/**
 * De winkelitems van een slot voor een job: naam, level en de stat die telt (WATK voor een wapen, WDEF voor
 * armor). Alle winkeldata is nu van de Thief (claws, Thief-armor); voor een andere job is de lijst leeg tot
 * die data er is (issues #42 tot #45), want een Thief-item aanbieden aan een Warrior zou onwaar zijn.
 */
export function shopItems(slot: EquipSlot, job: Job): readonly { name: string; level: number; stat: number }[] {
  if (job !== 'thief') return []
  return isArmorSlot(slot)
    ? NPC_ARMOR.filter((a) => a.slot === slot).map((a) => ({ name: a.name, level: a.level, stat: a.wdef }))
    : NPC_CLAWS.map((c) => ({ name: c.name, level: c.level, stat: c.watk }))
}

const shopItem = (slot: EquipSlot, name: string, job: Job) => shopItems(slot, job).find((i) => i.name === name)

/** WATK of WDEF van wat je draagt; undefined = onbekend, ook bij "Ander item" zonder (geldig) getal: dan weet de app niet wat het stuk geeft. */
export function wornStat(slot: EquipSlot, entry: EquipEntry): number | undefined {
  if (entry.pick === UNKNOWN) return undefined
  if (entry.pick === NONE) return 0
  if (entry.pick === OTHER) {
    const n = Number(entry.stat.trim())
    return entry.stat.trim() !== '' && Number.isFinite(n) ? Math.min(MAX_STAT, Math.max(0, Math.trunc(n))) : undefined
  }
  // Een winkelkeuze bestaat alleen voor de job waarvoor hij geldt (loadEquipment en equipmentForJob zorgen
  // daarvoor), dus hier zoeken we in de Thief-lijst: een andere job heeft nooit een winkelkeuze.
  return shopItem(slot, entry.pick, 'thief')?.stat
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

/** De naam van wat je in dit slot draagt, voor een samenvatting; null bij onbekend of niets. */
export function wornName(entry: EquipEntry): string | null {
  if (entry.pick === UNKNOWN || entry.pick === NONE) return null
  if (entry.pick === OTHER) return entry.name.trim() || 'ander item'
  return entry.pick
}

/** Of dit slot anders is dan in `before` (voor de "was"-badge). */
export const entryChanged = (a: EquipEntry, b: EquipEntry): boolean =>
  a.pick !== b.pick || (a.pick === OTHER && (a.name.trim() !== b.name.trim() || a.stat.trim() !== b.stat.trim()))

/**
 * Het profiel na een wissel in één slot. Claw: je weapon attack wordt die van de nieuwe claw, en bij een
 * claw uit de winkel ook je aanvalssnelheid. Armor: de WDEF in het profiel is het totaal uit je statvenster,
 * dus alleen het verschil tussen het oude en het nieuwe stuk erbij of eraf. Van of naar "weet ik niet" blijft
 * de WDEF staan (van onbekend naar bekend verandert de WDEF niet: dat stuk zat er al in).
 */
export function applyEquipChange(profile: ProfileDraft, slot: EquipSlot, before: EquipEntry, after: EquipEntry): ProfileDraft {
  const next = wornStat(slot, after)
  if (!isArmorSlot(slot)) {
    if (next === undefined) return profile
    const claw = after.pick === OTHER || after.pick === NONE ? undefined : NPC_CLAWS.find((c) => c.name === after.pick)
    return { ...profile, clawWatk: String(next), ...(claw ? { attackMs: String(claw.speed.attackMs) } : {}) }
  }
  const prev = wornStat(slot, before)
  const wdef = profile.wdef.trim()
  if (prev === undefined || next === undefined || !/^\d+$/.test(wdef)) return profile
  return { ...profile, wdef: String(Math.max(0, Number(wdef) + next - prev)) }
}

/**
 * De nieuwe invulling na een keuze in de lijst. Kies je "Ander item" terwijl de app wist wat je droeg, dan
 * begint de stat op die waarde: dat is een wissel van 0 tot je een ander getal typt. Anders begint hij leeg.
 */
export function choosePick(slot: EquipSlot, current: EquipEntry, pick: string): EquipEntry {
  const known = pick === OTHER ? wornStat(slot, current) : undefined
  return { pick, name: '', stat: known === undefined ? '' : String(known) }
}

/**
 * De equipment na een wissel van job: een slot met een winkelitem dat de nieuwe job niet heeft, wordt "weet ik
 * niet". Het profiel blijft zoals het was (van bekend naar onbekend laat WATK en WDEF staan, zie applyEquipChange).
 */
export function equipmentForJob(eq: Equipment, job: Job): Equipment {
  const out = { ...eq }
  for (const { slot } of EQUIP_SLOTS) {
    const { pick } = eq[slot]
    if (pick !== UNKNOWN && pick !== NONE && pick !== OTHER && !shopItem(slot, pick, job)) out[slot] = emptyEntry()
  }
  return out
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

/** Eén bewaard slot; een onbekende of verdwenen keuze wordt "weet ik niet". */
function loadEntry(slot: EquipSlot, v: unknown, job: Job): EquipEntry {
  if (typeof v !== 'object' || v === null) return emptyEntry()
  const raw = v as Record<string, unknown>
  const pick = typeof raw.pick === 'string' ? raw.pick : UNKNOWN
  if (pick === NONE) return { pick, name: '', stat: '' }
  if (pick === OTHER) return { pick, name: str(raw.name, MAX_NAME_LENGTH), stat: str(raw.stat, MAX_STAT_LENGTH) }
  if (pick !== UNKNOWN && shopItem(slot, pick, job)) return { pick, name: '', stat: '' }
  return emptyEntry()
}

/** De bewaarde equipment voor deze job; een ontbrekend of onbruikbaar slot (ook een winkelitem dat deze job niet heeft) is "weet ik niet". */
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
