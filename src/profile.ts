// Het karakterprofiel (Thief en Warrior): de invulvelden, het omzetten naar getallen en het
// bewaren in localStorage. Alles uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op de
// standaardwaarde. Het voorbeeldprofiel is een lv-10-Thief volgens het levelplan.
import type { Character } from './calc/mobModel'
import { isSkillKey, skillInfo, THIEF_SKILLS, WARRIOR_SKILLS, type SkillInfo, type SkillKey } from './data/skills'
import { ATTACK_MS, SUBI } from './data/thief'
import { STAT_NAME } from './equipment'
import type { Job } from './job'

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
const STATS = [
  { key: 'level', label: 'Level', min: 1, max: 200, integer: true },
  { key: 'hp', label: 'Max HP', min: 1, max: 30_000, integer: true },
  { key: 'str', label: 'STR', min: 0, max: 999, integer: true },
  { key: 'dex', label: 'DEX', min: 0, max: 999, integer: true },
  { key: 'luk', label: 'LUK', min: 0, max: 999, integer: true },
  { key: 'clawWatk', label: `${STAT_NAME.weapon} van je wapen`, min: 0, max: 999, integer: true },
  { key: 'accuracy', label: 'Accuracy', min: 0, max: 999, integer: true },
  { key: 'avoid', label: 'Avoid', min: 0, max: 999, integer: true },
  { key: 'wdef', label: STAT_NAME.armor, min: 0, max: 9_999, integer: true },
  { key: 'attackMs', label: 'Tijd per aanval (ms)', min: 100, max: 5_000, integer: false },
] as const

/**
/**
 * De weapon multiplier van je wapen, alleen voor een Warrior (de Thief heeft de vaste waarden van zijn aanval).
 * Een wapen uit de winkel vult hem in; kies je een ander wapen, dan staat hier wat je zelf invult.
 */
const WEAPON_MULT_FIELD = { key: 'weaponMult', label: 'Weapon multiplier van je wapen', min: 1, max: 5, integer: false } as const

/**
 * Je stars (issue #65): hun weapon attack en wat het herladen per ster kost. Geen kaart toont ze; de star die je bij
 * je equipment kiest, vult ze (zie applyEquipChange). Zonder keuze rekent de app met Subi. Een Warrior gooit niets:
 * voor hem tellen ze niet mee (zie toCharacter en suggestMonsters).
 */
const AMMO = [
  // Zo ruim als de claw: een eigen item in het star-slot kan elk getal tot 999 hebben, en een veld dat geen kaart
  // toont, mag de berekening niet blokkeren.
  { key: 'starWatk', label: `${STAT_NAME.weapon} van je stars`, min: 0, max: 999, integer: true },
  { key: 'starRecharge', label: 'Herladen per star (meso)', min: 0, max: 100, integer: false },
] as const

/** De gezette skillpunten: per skill van 0 (nog niet geleerd) tot het maximum uit de spelgegevens. */
const skillFields = (skills: readonly SkillInfo[]): readonly ProfileField[] =>
  skills.map((s) => ({ key: s.key, label: s.name, min: 0, max: s.max, integer: true }))
const SKILL_FIELDS = skillFields(THIEF_SKILLS)
const WARRIOR_SKILL_FIELDS = skillFields(WARRIOR_SKILLS)

export type ProfileKey = (typeof STATS)[number]['key'] | (typeof AMMO)[number]['key'] | typeof WEAPON_MULT_FIELD.key | SkillKey

/** De stats van je karakter; je skills hebben hun eigen kaart. */
export const STAT_FIELDS: readonly ProfileField[] = STATS

/** De velden van je stars; ze komen uit je equipment. */
export const AMMO_FIELDS: readonly ProfileField[] = AMMO

/** De getalvelden van een Thief: eerst de stats, dan je stars, dan de skills. */
export const PROFILE_FIELDS: readonly ProfileField[] = [...STAT_FIELDS, ...AMMO_FIELDS, ...SKILL_FIELDS]

/** De getalvelden van een Warrior: dezelfde stats plus de weapon multiplier (zonder stars), en de Beginner-skills met die van zijn 1e job. */
const WARRIOR_FIELDS: readonly ProfileField[] = [
  ...STAT_FIELDS,
  WEAPON_MULT_FIELD,
  ...skillFields(THIEF_SKILLS.filter((s) => s.job === 'Beginner')),
  ...WARRIOR_SKILL_FIELDS,
]

/** Elk veld dat een profiel bewaart, van elke job. */
export const DRAFT_FIELDS: readonly ProfileField[] = [...PROFILE_FIELDS, WEAPON_MULT_FIELD, ...WARRIOR_SKILL_FIELDS]
export type ProfileDraft = Record<ProfileKey, string>

/** Een ingevuld profiel, als getallen, met de job waarvoor het geldt (die bepaalt welk model rekent). */
export type Profile = Record<ProfileKey, number> & { job: Job }

/**
 * De velden die een job invult: elke job heeft de skills van zijn eigen 1e job, de Beginner-skills heeft elke job.
 * Een Warrior heeft ook de weapon multiplier. De getypte waarden blijven in het concept staan, zodat een
 * terugwissel niets kwijt is; parseProfile valideert een veld dat deze job niet invult niet en vult het met de
 * standaardwaarde. Een job zonder eigen skills (nog niet doorgerekend) ziet alleen de Beginner-skills.
 */
export const profileFieldsFor = (job: Job): readonly ProfileField[] =>
  job === 'thief'
    ? PROFILE_FIELDS
    : job === 'warrior'
      ? WARRIOR_FIELDS
      : PROFILE_FIELDS.filter((f) => !isSkillKey(f.key) || skillInfo(f.key).job !== 'Thief')

/** De stats (zonder skills en zonder je stars, die uit je equipment komen) die een job invult, voor de kaart "Je karakter". */
export const statFieldsFor = (job: Job): readonly ProfileField[] => profileFieldsFor(job).filter((f) => !isSkillKey(f.key) && !AMMO_FIELDS.includes(f))

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
  starWatk: String(SUBI.watk),
  starRecharge: String(SUBI.rechargePerStar),
  threeSnails: '0',
  nimbleFeet: '0',
  recovery: '0',
  nimbleBody: '0',
  keenEyes: '0',
  doubleStab: '0',
  disorder: '0',
  darkSight: '0',
  luckySeven: '1',
  weaponMult: '1.8',
  improvedHpRecovery: '0',
  maxHpIncrease: '0',
  ironBody: '0',
  powerStrike: '0',
  slashBlast: '0',
  preciseStrikes: '0',
}

/**
 * Het profiel als getallen, of een melding in gewoon Nederlands bij het eerste veld dat niet klopt (alleen de
 * velden die deze job invult). `key` zegt welk veld, zodat het scherm de melding toont bij de kaart waar dat
 * veld staat.
 */
export function parseProfile(d: ProfileDraft, job: Job = 'thief'): { profile: Profile } | { error: string; key: ProfileKey } {
  const out = { job } as Profile
  const shown = profileFieldsFor(job)
  for (const f of DRAFT_FIELDS) {
    if (!shown.includes(f)) {
      // Een veld dat deze job niet invult, telt niet mee: de standaardwaarde, en het concept zelf blijft zoals getypt.
      out[f.key] = Number(DEFAULT_PROFILE[f.key])
      continue
    }
    const text = d[f.key].trim()
    const n = text === '' ? NaN : Number(text)
    const where = isSkillKey(f.key) ? 'Skillpoints' : 'je karakter'
    if (!Number.isFinite(n)) return { error: `Vul bij ${where} "${f.label}" in.`, key: f.key }
    if (n < f.min || n > f.max) return { error: `"${f.label}" moet tussen ${f.min} en ${f.max} liggen.`, key: f.key }
    if (f.integer && !Number.isInteger(n)) return { error: `"${f.label}" moet een heel getal zijn.`, key: f.key }
    out[f.key] = n
  }
  return { profile: out }
}

/** Het profiel in de vorm van het mob-model: bij een Thief telt de weapon attack van je stars mee bij die van je claw; een Warrior gooit niets. */
export function toCharacter(p: Profile): Character {
  return {
    level: p.level,
    hp: p.hp,
    str: p.str,
    dex: p.dex,
    luk: p.luk,
    watk: p.job === 'warrior' ? p.clawWatk : p.clawWatk + p.starWatk,
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
    for (const f of DRAFT_FIELDS) {
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
    const fields = Object.fromEntries(DRAFT_FIELDS.map((f) => [f.key, d[f.key].slice(0, MAX_FIELD_LENGTH)]))
    storage.setItem(PROFILE_KEY, JSON.stringify({ version: VERSION, fields }))
    return true
  } catch {
    return false
  }
}

/** De hoofdstat voor schade en wapen-eisen: STR voor een Warrior, LUK voor een Thief. */
export const mainStatOf = (p: Profile): number => (p.job === 'warrior' ? p.str : p.luk)
