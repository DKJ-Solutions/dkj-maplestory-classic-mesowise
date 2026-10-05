// Base AP automatisch invullen op je equipment (Dave, 5 oktober 2026, #157). Puur, zonder UI-import. De gangbare opbouw:
// de secundaire stat krijgt precies de hoogste eis van wat je draagt (minimaal 4), alle andere AP van je level gaan naar
// de hoofdstat en de overige stats blijven op 4. Alleen de base-velden; de extra AP van items, en de getypte accuracy, blijven staan.
import { apAtLevel, STARTING_AP } from './data/thief'
import type { Stat } from './data/types'
import { EQUIP_SLOTS, itemRequirements, wornName, type Equipment } from './equipment'
import type { Job } from './job'
import type { ProfileDraft } from './profile'

/** Hoofd- en secundaire stat per job. */
export const MAIN_SECONDARY: Record<Job, { main: Stat; secondary: Stat }> = {
  thief: { main: 'luk', secondary: 'dex' },
  warrior: { main: 'str', secondary: 'dex' },
  bowman: { main: 'dex', secondary: 'str' },
  magician: { main: 'int', secondary: 'luk' },
}

const whole = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text) : null)
const STATS: readonly Stat[] = ['str', 'dex', 'int', 'luk']

export type AutoFillResult =
  | {
      ok: true
      /** De base AP per stat die erin komen. */
      base: Record<Stat, number>
      /** Het item dat de eis op de secundaire stat bepaalt; null als niets meer dan het minimum vraagt. */
      limitedBy: string | null
      /** Gedragen items waarvan de app de eisen niet kent (eigen item, of een item zonder prijs): die tellen als geen eis. */
      unknown: string[]
    }
  | { ok: false; reason: 'level' | 'short'; unknown: string[]; need?: number; have?: number }

/** De uitkomst als `Partial<ProfileDraft>` met alleen de base-velden (str, dex, int, luk), klaar voor `onChange`. */
export const autoFillPatch = (base: Record<Stat, number>): Partial<ProfileDraft> => ({
  str: String(base.str),
  dex: String(base.dex),
  int: String(base.int),
  luk: String(base.luk),
})

/**
 * De base AP die bij je equipment past. De eis op de hoofdstat wordt door de hoofdstat zelf gehaald (die krijgt de rest); een eis
 * op een stat die geen van beide is, tilt die stat ook tot die eis. Is er te weinig AP voor de minimale 4 per stat plus de eisen,
 * of klopt het level niet, dan is er geen uitkomst en schrijft de aanroeper niets.
 */
export function autoFillAp(job: Job, level: string, equipment: Equipment): AutoFillResult {
  const unknown: string[] = []
  const need: Record<Stat, number> = { str: STARTING_AP.perStat, dex: STARTING_AP.perStat, int: STARTING_AP.perStat, luk: STARTING_AP.perStat }
  const by: Partial<Record<Stat, string>> = {}
  for (const { slot } of EQUIP_SLOTS) {
    const entry = equipment[slot]
    const name = wornName(entry)
    if (name === null || slot === 'ammo') continue
    const req = itemRequirements(slot, entry)
    if (req === undefined) {
      unknown.push(name)
      continue
    }
    for (const s of STATS) {
      const v = req[s]
      if (v !== undefined && v > need[s]) {
        need[s] = v
        by[s] = name
      }
    }
  }
  const lvl = whole(level)
  if (lvl === null || lvl < 1 || lvl > 200) return { ok: false, reason: 'level', unknown }
  const { main, secondary } = MAIN_SECONDARY[job]
  const total = apAtLevel(lvl)
  const others = STATS.filter((s) => s !== main).reduce((sum, s) => sum + need[s], 0)
  const mainValue = total - others
  if (mainValue < need[main]) return { ok: false, reason: 'short', unknown, need: others + need[main], have: total }
  const base = { ...need, [main]: mainValue }
  return { ok: true, base, limitedBy: need[secondary] > STARTING_AP.perStat ? (by[secondary] ?? null) : null, unknown }
}

/** De melding bij het resultaat, in het Nederlands: wat erin kwam (hoofd- en secundaire stat), of waarom er niets is ingevuld. */
export function autoFillMessage(job: Job, r: AutoFillResult): string {
  const unknownNote = r.unknown.length > 0 ? ` De eisen van ${r.unknown.join(', ')} ken ik niet: die tellen als geen eis.` : ''
  if (!r.ok) {
    const why = r.reason === 'level' ? 'Vul eerst een geldig level in.' : `Je level geeft te weinig AP voor je equipment: dat vraagt ${r.need}, je hebt er ${r.have}.`
    return `${why} Er is niets ingevuld.${unknownNote}`
  }
  const { main, secondary } = MAIN_SECONDARY[job]
  const sec = `${secondary.toUpperCase()} ${r.base[secondary]}${r.limitedBy ? ` (voor ${r.limitedBy})` : ''}`
  return `Ingevuld: ${sec}, ${main.toUpperCase()} ${r.base[main]}.${unknownNote}`
}
