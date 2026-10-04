// Het karakterprofiel (eerst alleen de Thief): de invulvelden, het omzetten naar getallen en het
// bewaren in localStorage. Alles uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op de
// standaardwaarde. Het voorbeeldprofiel is een lv-10-Thief volgens het levelplan.
import type { Character } from './calc/mobModel'
import { isSkillKey, THIEF_SKILLS, type SkillKey } from './data/skills'
import { ATTACK_MS, SUBI } from './data/thief'

export const PROFILE_KEY = 'mesowise.profile.v1'
const VERSION = 1
const MAX_FIELD_LENGTH = 12

/** Een getalveld van het profiel, met zijn label en grenzen. */
export interface ProfileField {
  key: ProfileKey
  label: string
  min: number
  max: number
  integer: boolean
}

/** De stats van het profiel, met hun label en grenzen. */
const STAT_FIELDS = [
  { key: 'level', label: 'Level', min: 1, max: 200, integer: true },
  { key: 'hp', label: 'Max HP', min: 1, max: 30_000, integer: true },
  { key: 'str', label: 'STR', min: 0, max: 999, integer: true },
  { key: 'dex', label: 'DEX', min: 0, max: 999, integer: true },
  { key: 'luk', label: 'LUK', min: 0, max: 999, integer: true },
  { key: 'clawWatk', label: 'Weapon attack van je claw', min: 0, max: 999, integer: true },
  { key: 'accuracy', label: 'Accuracy', min: 0, max: 999, integer: true },
  { key: 'avoid', label: 'Avoid', min: 0, max: 999, integer: true },
  { key: 'wdef', label: 'WDEF', min: 0, max: 9_999, integer: true },
  { key: 'attackMs', label: 'Tijd per aanval (ms)', min: 100, max: 5_000, integer: false },
] as const

/** De gezette skillpunten: per skill van 0 (nog niet geleerd) tot het maximum uit de spelgegevens. */
const SKILL_FIELDS: readonly ProfileField[] = THIEF_SKILLS.map((s) => ({ key: s.key, label: s.name, min: 0, max: s.max, integer: true }))

export type ProfileKey = (typeof STAT_FIELDS)[number]['key'] | SkillKey

/** Alle getalvelden: eerst de stats, dan de skills. */
export const PROFILE_FIELDS: readonly ProfileField[] = [...STAT_FIELDS, ...SKILL_FIELDS]
export type ProfileDraft = Record<ProfileKey, string>

/** Een ingevuld profiel, als getallen. */
export type Profile = Record<ProfileKey, number>

/** Een voorbeeld-Thief op lv 10 (de stats uit het model in issue #15); vul je eigen karakter in. */
export const DEFAULT_PROFILE: ProfileDraft = {
  level: '10',
  hp: '444',
  str: '4',
  dex: '25',
  luk: '40',
  clawWatk: '10',
  accuracy: '33',
  avoid: '23',
  wdef: '72',
  attackMs: String(ATTACK_MS.fast5),
  threeSnails: '0',
  nimbleFeet: '0',
  recovery: '0',
  nimbleBody: '0',
  keenEyes: '0',
  doubleStab: '0',
  disorder: '0',
  darkSight: '0',
  luckySeven: '1',
}

/** Of het profiel nog precies het voorbeeld is (de speler heeft niets ingevuld). */
export function isDefaultProfile(d: ProfileDraft): boolean {
  return PROFILE_FIELDS.every((f) => d[f.key] === DEFAULT_PROFILE[f.key])
}

/**
 * Het profiel als getallen, of een melding in gewoon Nederlands bij het eerste veld dat niet klopt. `key`
 * zegt welk veld, zodat het scherm de melding toont bij de kaart waar dat veld staat.
 */
export function parseProfile(d: ProfileDraft): { profile: Profile } | { error: string; key: ProfileKey } {
  const out = {} as Profile
  for (const f of PROFILE_FIELDS) {
    const text = d[f.key].trim()
    const n = text === '' ? NaN : Number(text)
    const where = isSkillKey(f.key) ? 'je skillpunten' : 'je karakter'
    if (!Number.isFinite(n)) return { error: `Vul bij ${where} "${f.label}" in.`, key: f.key }
    if (n < f.min || n > f.max) return { error: `"${f.label}" moet tussen ${f.min} en ${f.max} liggen.`, key: f.key }
    if (f.integer && !Number.isInteger(n)) return { error: `"${f.label}" moet een heel getal zijn.`, key: f.key }
    out[f.key] = n
  }
  return { profile: out }
}

/** Het profiel in de vorm van het mob-model: de stars zijn Subi's, dus hun weapon attack telt mee. */
export function toCharacter(p: Profile): Character {
  return {
    level: p.level,
    hp: p.hp,
    str: p.str,
    dex: p.dex,
    luk: p.luk,
    watk: p.clawWatk + SUBI.watk,
    accuracy: p.accuracy,
    avoid: p.avoid,
    wdef: p.wdef,
    attackMs: p.attackMs,
  }
}

/** Het bewaarde profiel; een ontbrekend of onbruikbaar veld krijgt de standaardwaarde. */
export function loadProfile(storage: Storage | null | undefined): ProfileDraft {
  const out = { ...DEFAULT_PROFILE }
  try {
    const raw = storage?.getItem(PROFILE_KEY)
    if (!raw) return out
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return out
    const fields = (data as { fields?: unknown }).fields
    if (typeof fields !== 'object' || fields === null) return out
    for (const f of PROFILE_FIELDS) {
      const v = (fields as Record<string, unknown>)[f.key]
      if (typeof v === 'string') out[f.key] = v.slice(0, MAX_FIELD_LENGTH)
    }
    return out
  } catch {
    return out
  }
}

/** Bewaar het profiel zoals ingevuld; true als het gelukt is. Mislukken breekt de app niet. */
export function saveProfile(storage: Storage | null | undefined, d: ProfileDraft): boolean {
  try {
    if (!storage) return false
    const fields = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, d[f.key].slice(0, MAX_FIELD_LENGTH)]))
    storage.setItem(PROFILE_KEY, JSON.stringify({ version: VERSION, fields }))
    return true
  } catch {
    return false
  }
}
