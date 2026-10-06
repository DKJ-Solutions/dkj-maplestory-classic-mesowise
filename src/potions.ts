// De potions die je gebruikt (Dave, 6 oktober 2026), net als de mob bij Monster: per soort kies je een potion, en daaronder
// staan zijn prijs en herstel uit de database; zegt de winkel of het spel iets anders, dan corrigeer je het getal. De berekening
// rekent met je keuze en je correcties, en het advies zegt wat de goedkoopste bespaart. Zonder keuze rekent de app met de
// goedkoopste per punt (HP_POTION en mpPotionFor). Een potion heeft in Classic geen levelvereiste (MeowDB: "Lv 0"), dus op elk
// level kun je ze allemaal kiezen. Puur, zonder UI-import.
import { bestVerdict } from './best'
import { MAGICIAN_MP_POTIONS } from './data/magician'
import { POTIONS } from './data/spots'
import type { Potion } from './data/types'
import type { Job } from './job'
import { levelCost } from './levelCost'
import { PROFILE_FIELDS, type Profile } from './profile'
import type { SpotDraft } from './spotDraft'
import { HP_POTION, mpPotionFor } from './suggest'

/** Wat herstelt: HP of MP (de potions in de app herstellen er één van). */
export type PotionKind = 'hp' | 'mp'
export const POTION_KINDS: readonly PotionKind[] = ['hp', 'mp']

/** De potions waarmee gerekend wordt, per soort. */
export interface PotionPair {
  hp: Potion
  mp: Potion
}

/** Een eigenschap van een potion die je kunt corrigeren: de prijs of wat hij herstelt. */
export type PotionStat = 'price' | 'restores'

/**
 * Je eigen getallen voor een potion van een soort; wat ontbreekt, komt uit de database. `name` is de potion waarvoor ze gelden: een
 * correctie telt alleen zolang je met die potion rekent, en gaat niet mee naar een andere (een Lemon van een Magician die nu Thief is
 * en met de Blue Potion rekent).
 */
export type PotionFix = { name?: string } & Partial<Record<PotionStat, number>>

/** De potions die je gekozen hebt, per soort bij naam (null is "nog niet gekozen": de goedkoopste), met je correcties. */
export interface PotionChoice {
  hp: string | null
  mp: string | null
  fix: Record<PotionKind, PotionFix>
}

export const NO_POTION_CHOICE: PotionChoice = { hp: null, mp: null, fix: { hp: {}, mp: {} } }

/** Een corrigeerbare eigenschap, met zijn label, grenzen en hoe het scherm hem toont: de prijs als kosten, het herstel als winst. */
export interface PotionField {
  key: PotionStat
  label: string
  min: number
  max: number
  integer: true
  tone: 'cost' | 'gain'
  /** Wat achter het getal staat (Dave, 6 oktober 2026): "−150 meso", "+250 HP". */
  unit: string
}

/** Het hoogste Max HP en Max MP dat het profiel toelaat (beide 30.000): meer kan een potion niet nuttig herstellen. */
const MAX_BAR = Math.min(...PROFILE_FIELDS.filter((f) => f.key === 'hp' || f.key === 'mp').map((f) => f.max))

/** De eigenschappen van een potion van deze soort, in de volgorde van het scherm. */
export const potionFields = (kind: PotionKind): readonly PotionField[] => [
  // Price en Recovery (Dave, 6 oktober 2026); de eenheid erachter zegt of het HP of MP is.
  { key: 'price', label: 'Price', min: 1, max: 9_999_999, integer: true, tone: 'cost', unit: 'meso' },
  { key: 'restores', label: 'Recovery', min: 1, max: MAX_BAR, integer: true, tone: 'gain', unit: kind === 'hp' ? 'HP' : 'MP' },
]

/** De waarde van een eigenschap van een potion. */
export const potionStat = (p: Potion, kind: PotionKind, stat: PotionStat): number => (stat === 'price' ? p.price : p[kind])

/**
 * De potions die deze job van een soort kan kopen, uit de database. Een Magician heeft er de Orange en de Lemon van Len the
 * Fairy bij (data/magician.ts), in dezelfde volgorde als de keuze van de app (MAGICIAN_MP_POTION in suggest.ts), zodat een
 * gelijkspel net zo uitvalt.
 */
export const potionsOf = (job: Job, kind: PotionKind): readonly Potion[] =>
  (job === 'magician' ? [...MAGICIAN_MP_POTIONS, ...POTIONS] : POTIONS).filter((p) => p[kind] > 0)

/** De goedkoopste per punt, waarmee de app rekent zolang je niets kiest. */
export const cheapestPotions = (job: Job): PotionPair => ({ hp: HP_POTION, mp: mpPotionFor(job) })

/**
 * De potion van een soort zoals de database hem kent: je keuze, of de goedkoopste als je niets koos of als je keuze niet bij
 * deze job of soort hoort (een Lemon van een Magician die nu Thief is).
 */
export const databasePotion = (job: Job, kind: PotionKind, name: string | null): Potion =>
  potionsOf(job, kind).find((p) => p.name === name) ?? cheapestPotions(job)[kind]

/** De potions waarmee gerekend wordt: je keuze uit de database, met je correcties erover. */
export function resolvePotions(job: Job, choice: PotionChoice): PotionPair {
  const one = (kind: PotionKind): Potion => {
    const db = databasePotion(job, kind, choice[kind])
    const fix = choice.fix[kind]
    if (fix.name !== db.name || (fix.price === undefined && fix.restores === undefined)) return db
    return { ...db, price: fix.price ?? db.price, [kind]: fix.restores ?? db[kind] }
  }
  return { hp: one('hp'), mp: one('mp') }
}

/** Een andere potion kiezen: je correcties hoorden bij de vorige en vallen weg, net als bij een andere mob. */
export const pickPotion = (choice: PotionChoice, kind: PotionKind, name: string): PotionChoice => ({
  ...choice,
  [kind]: name,
  fix: { ...choice.fix, [kind]: {} },
})

/**
 * Een getal van de gekozen potion corrigeren. Leeg of gelijk aan de database haalt de correctie weg; een getal dat geen heel getal
 * binnen de grenzen is, geeft null (en dan verandert er niets).
 */
export function fixPotion(choice: PotionChoice, job: Job, kind: PotionKind, stat: PotionStat, text: string): PotionChoice | null {
  const field = potionFields(kind).find((f) => f.key === stat)!
  const potion = databasePotion(job, kind, choice[kind])
  const db = potionStat(potion, kind, stat)
  const t = text.trim()
  const n = t === '' ? db : Number(t)
  if (!Number.isInteger(n) || n < field.min || n > field.max) return null
  // Correcties van een andere potion vallen weg: ze golden niet voor deze.
  const fix: PotionFix = choice.fix[kind].name === potion.name ? { ...choice.fix[kind] } : {}
  fix.name = potion.name
  if (n === db) delete fix[stat]
  else fix[stat] = n
  return { ...choice, fix: { ...choice.fix, [kind]: fix.price === undefined && fix.restores === undefined ? {} : fix } }
}

/** Een max uit het profiel als getal, of null als hij leeg, geen geheel getal, 0 of boven wat het profiel toelaat is. */
const maxOf = (text: string): number | null => {
  const t = text.trim()
  const n = t === '' ? NaN : Number(t)
  return Number.isInteger(n) && n > 0 && n <= MAX_BAR ? n : null
}

/**
 * Wat een potion per punt kost en hoeveel van je balk hij vult, met het extra herstel van Improved HP en MP Recovery (`factor`,
 * potionFactorOf). Niet afgerond, net als in de berekening; `fillPct` hoogstens 100, en null zonder bruikbare Max HP of MP.
 */
export function potionInfo(p: Potion, kind: PotionKind, max: string, factor = 1): { mesoPerPoint: number; fillPct: number | null } {
  const restores = p[kind] * factor
  const m = maxOf(max)
  return { mesoPerPoint: p.price / restores, fillPct: m === null ? null : Math.min(100, (restores / m) * 100) }
}

const perPoint = (p: Potion, kind: PotionKind) => p.price / p[kind]

export type PotionAdvice =
  /** Niet uit te rekenen: geen profiel of geen kosten voor dit level. */
  | { kind: 'none' }
  /**
   * Je keuze naast het goedkoopste alternatief. `switchTo` zijn de potions die per punt goedkoper zijn dan de jouwe (leeg: blijven);
   * `meso` is wat dit level kost met je keuze en met die wissel (undefined niet uit te rekenen, null geen EXP).
   */
  | { kind: 'advice'; switchTo: readonly Potion[]; mesoChosen: number | null; mesoCheapest: number | null | undefined }

/**
 * Loont een andere potion? Wat dit level kost met de potions in het profiel (met je correcties), tegenover de goedkoopste andere
 * potion per punt uit de database. Een wissel alleen als die per punt echt goedkoper is dan de jouwe: even goedkoop (de Lemon naast
 * de Orange van een Magician) is geen wissel, want afronding zou de kosten een fractie laten verschillen. Corrigeer je je eigen
 * potion naar een hogere prijs, dan kan een andere wel goedkoper worden (een duurdere Orange naast de White). De app rekent niet
 * met verspild herstel (#181).
 */
export function potionAdvice(drafts: readonly SpotDraft[], profile: Profile | null): PotionAdvice {
  if (!profile) return { kind: 'none' }
  const chosen = profile.potions ?? cheapestPotions(profile.job)
  const costWith = (potions: PotionPair) => {
    const p = { ...profile, potions }
    const c = levelCost(p, bestVerdict(drafts, p))
    return c.kind === 'cost' ? c.meso : undefined
  }
  const mesoChosen = costWith(chosen)
  if (mesoChosen === undefined) return { kind: 'none' }
  // Per soort de goedkoopste andere potion; bij gelijke prijs per punt de eerste, net als de keuze van de app.
  const other = (kind: PotionKind): Potion | undefined =>
    potionsOf(profile.job, kind)
      .filter((p) => p.name !== chosen[kind].name)
      .reduce<Potion | undefined>((best, p) => (best === undefined || perPoint(p, kind) < perPoint(best, kind) ? p : best), undefined)
  const better = (kind: PotionKind): Potion | undefined => {
    const o = other(kind)
    return o && perPoint(o, kind) < perPoint(chosen[kind], kind) ? o : undefined
  }
  const alternative: PotionPair = { hp: better('hp') ?? chosen.hp, mp: better('mp') ?? chosen.mp }
  const switchTo = POTION_KINDS.map(better).filter((p) => p !== undefined)
  return { kind: 'advice', switchTo, mesoChosen, mesoCheapest: switchTo.length === 0 ? mesoChosen : costWith(alternative) }
}

export const POTION_CHOICE_KEY = 'mesowise.potions.v1'
const VERSION = 1

/** Een bewaarde correctie: alleen een heel getal binnen de grenzen telt. */
function loadFix(kind: PotionKind, v: unknown): PotionFix {
  if (typeof v !== 'object' || v === null) return {}
  // Zonder de naam van zijn potion is een correctie niet toe te wijzen, en telt hij niet.
  const name = (v as { name?: unknown }).name
  if (typeof name !== 'string' || name.length > 60) return {}
  const out: PotionFix = { name }
  for (const f of potionFields(kind)) {
    const n = (v as Record<string, unknown>)[f.key]
    if (typeof n === 'number' && Number.isInteger(n) && n >= f.min && n <= f.max) out[f.key] = n
  }
  return out.price === undefined && out.restores === undefined ? {} : out
}

/** De bewaarde keuze; wat niet klopt is "nog niet gekozen". Of een naam bij je job hoort, beslist databasePotion. */
export function loadPotionChoice(storage: Storage | null | undefined): PotionChoice {
  try {
    const raw = storage?.getItem(POTION_CHOICE_KEY)
    if (!raw) return NO_POTION_CHOICE
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return NO_POTION_CHOICE
    const name = (v: unknown) => (typeof v === 'string' && v.length <= 60 ? v : null)
    const d = data as { hp?: unknown; mp?: unknown; fix?: { hp?: unknown; mp?: unknown } }
    const fix = typeof d.fix === 'object' && d.fix !== null ? d.fix : {}
    return { hp: name(d.hp), mp: name(d.mp), fix: { hp: loadFix('hp', fix.hp), mp: loadFix('mp', fix.mp) } }
  } catch {
    return NO_POTION_CHOICE
  }
}

/** Bewaar de keuze; true als het gelukt is. Mislukken breekt de app niet. */
export function savePotionChoice(storage: Storage | null | undefined, choice: PotionChoice): boolean {
  try {
    if (!storage) return false
    storage.setItem(POTION_CHOICE_KEY, JSON.stringify({ version: VERSION, hp: choice.hp, mp: choice.mp, fix: choice.fix }))
    return true
  } catch {
    return false
  }
}
