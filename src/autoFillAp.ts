// Base AP automatisch invullen op je equipment (Dave, 5 oktober 2026, #157). Puur, zonder UI-import. De gangbare opbouw:
// de secundaire stat krijgt precies de hoogste eis van wat je draagt of op je level mag dragen (minimaal 4), alle andere AP
// van je level gaan naar de hoofdstat en de overige stats blijven op 4. Ook wat je nog niet draagt telt (Dave, 5 oktober 2026):
// een Thief zonder DEX-item heeft toch DEX nodig voor de claw of armor van zijn volgende upgrade. Alleen de base-velden;
// de extra AP van items en de getypte accuracy blijven staan.
import { apAtLevel, STARTING_AP } from './data/thief'
import type { Stat } from './data/types'
import { catalogItems, EQUIP_SLOTS, itemRequirements, slotsFor, wornName, type Equipment } from './equipment'
import type { Job } from './job'
import { mainStatKey, PROFILE_FIELDS, type ProfileDraft } from './profile'

/** Hoofd- en secundaire stat per job. */
const SECONDARY: Record<Job, Stat> = { thief: 'dex', warrior: 'dex', bowman: 'str', magician: 'luk' }
export const MAIN_SECONDARY = Object.fromEntries((Object.keys(SECONDARY) as Job[]).map((j) => [j, { main: mainStatKey(j), secondary: SECONDARY[j] }])) as Record<Job, { main: Stat; secondary: Stat }>

/** De hoogste base AP die een stat in het profiel kan hebben. */
const STAT_MAX = PROFILE_FIELDS.find((f) => f.key === 'luk')!.max

const whole = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text) : null)
const STATS: readonly Stat[] = ['str', 'dex', 'int', 'luk']

export type AutoFillResult =
  | {
      ok: true
      /** De base AP per stat die erin komen. */
      base: Record<Stat, number>
      /**
       * Het item dat het doel van de secundaire stat bepaalt, gedragen of niet; null als niets meer dan het minimum vraagt. Is er
       * te weinig AP voor dat doel, dan staat het item er toch: zijn eis is dan nog niet gehaald.
       */
      limitedBy: string | null
      /** Per stat die een item verder optilt dan 4 (de secundaire of een derde): het item dat het vraagt. */
      limits: Partial<Record<Stat, string>>
      /** Gedragen items waarvan de app de eisen niet kent (een eigen item): die tellen als geen eis. */
      unknown: string[]
    }
  | { ok: false; reason: 'level' | 'short' | 'max'; unknown: string[]; need?: number; have?: number }

/** De uitkomst als `Partial<ProfileDraft>` met alleen de base-velden (str, dex, int, luk), klaar voor `onChange`. */
export const autoFillPatch = (base: Record<Stat, number>): Partial<ProfileDraft> => ({
  str: String(base.str),
  dex: String(base.dex),
  int: String(base.int),
  luk: String(base.luk),
})

/**
 * De hoogste eis op een stat van alle catalogusitems van een job die je op dit level mag dragen (ammo vraagt geen stat), en het
 * item dat hem vraagt; null als geen item meer vraagt dan het minimum.
 */
function catalogNeed(job: Job, level: number, stat: Stat): { value: number; name: string } | null {
  let best: { value: number; name: string } | null = null
  for (const { slot } of EQUIP_SLOTS) {
    if (slot === 'ammo') continue
    for (const item of catalogItems(slot, job)) {
      if (item.level === undefined || item.level > level) continue
      const v = itemRequirements(slot, { pick: item.name, name: '', stat: '' })?.[stat]
      if (v !== undefined && v > STARTING_AP.perStat && (best === null || v > best.value)) best = { value: v, name: item.name }
    }
  }
  return best
}

/**
 * De base AP die bij je equipment past. De eis op de hoofdstat wordt door de hoofdstat zelf gehaald (die krijgt de rest); een eis
 * op een stat die geen van beide is, tilt die stat ook tot die eis. De secundaire stat gaat ook naar de hoogste eis van wat je op
 * je level mag dragen, zolang je hoofdstat dan nog haalt wat je draagt vraagt; is daar te weinig AP voor, dan krijgt hij wat er
 * past. Is er te weinig AP voor de minimale 4 per stat plus de eisen van wat je draagt, of klopt het level niet, dan is er geen
 * uitkomst en schrijft de aanroeper niets.
 */
export function autoFillAp(job: Job, level: string, equipment: Equipment): AutoFillResult {
  const unknown: string[] = []
  const need: Record<Stat, number> = { str: STARTING_AP.perStat, dex: STARTING_AP.perStat, int: STARTING_AP.perStat, luk: STARTING_AP.perStat }
  const by: Partial<Record<Stat, string>> = {}
  // Een slot dat de job met dit wapen niet draagt (een shield naast een wapen voor twee handen) telt niet mee.
  for (const { slot } of slotsFor(job, equipment.claw.pick, equipment.claw.weaponKind)) {
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
  const future = catalogNeed(job, lvl, secondary)
  if (future !== null && future.value > need[secondary]) {
    const room = total - STATS.filter((s) => s !== secondary && s !== main).reduce((sum, s) => sum + need[s], 0) - need[main]
    const value = Math.min(future.value, room)
    if (value > need[secondary]) {
      need[secondary] = value
      by[secondary] = future.name
    }
  }
  const others = STATS.filter((s) => s !== main).reduce((sum, s) => sum + need[s], 0)
  const mainValue = total - others
  // Een vangnet: met de AP per level van nu blijft de hoofdstat ook op level 200 onder het maximum.
  if (mainValue > STAT_MAX) return { ok: false, reason: 'max', unknown, have: total }
  if (mainValue < need[main]) return { ok: false, reason: 'short', unknown, need: others + need[main], have: total }
  const base = { ...need, [main]: mainValue }
  const limits: Partial<Record<Stat, string>> = {}
  for (const s of STATS) if (s !== main && need[s] > STARTING_AP.perStat && by[s]) limits[s] = by[s]
  return { ok: true, base, limitedBy: need[secondary] > STARTING_AP.perStat ? (by[secondary] ?? null) : null, limits, unknown }
}

/**
 * De melding als er niets is ingevuld, in het Nederlands: waarom. Na een gelukte Auto assign geen zin (null): het scherm laat de
 * veranderde vakken oplichten (Dave, 5 oktober 2026).
 */
export function autoFillMessage(_job: Job, r: AutoFillResult): string | null {
  if (r.ok) return null
  const why =
    r.reason === 'level'
      ? 'Vul eerst een geldig level in.'
      : r.reason === 'max'
        ? `Je level geeft ${r.have} AP, meer dan één stat kan hebben (${STAT_MAX}).`
        : `Je level geeft te weinig AP voor je equipment: je hebt er ${r.have} en je equipment vraagt er ${r.need}.`
  return `${why} Er is niets ingevuld.`
}
