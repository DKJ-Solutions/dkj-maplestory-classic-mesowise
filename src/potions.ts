// De potions die je job kan kopen, en welke je gebruikt (Dave, 6 oktober 2026). Puur, zonder UI-import. Een potion heeft in
// Classic geen levelvereiste (MeowDB: "Lv 0"), dus op elk level kun je ze allemaal gebruiken. Je kiest per soort de potion die
// je gebruikt, net als de mob bij Monster; de berekening rekent met je keuze, en het advies zegt wat de goedkoopste bespaart.
// Zonder keuze rekent de app met de goedkoopste per punt (HP_POTION en mpPotionFor).
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

/** De potions waarmee gerekend wordt, per soort. */
export interface PotionPair {
  hp: Potion
  mp: Potion
}

/** De potions die je gekozen hebt, per soort bij naam; null is "nog niet gekozen" (de goedkoopste). */
export interface PotionChoice {
  hp: string | null
  mp: string | null
}

export const NO_POTION_CHOICE: PotionChoice = { hp: null, mp: null }

/**
 * De potions die deze job kan kopen. Een Magician heeft er de Orange en de Lemon van Len the Fairy bij (data/magician.ts), in
 * dezelfde volgorde als de keuze van de app (MAGICIAN_MP_POTION in suggest.ts), zodat een gelijkspel net zo uitvalt.
 */
const potionsOf = (job: Job): readonly Potion[] => (job === 'magician' ? [...MAGICIAN_MP_POTIONS, ...POTIONS] : POTIONS)

/** De goedkoopste per punt, waarmee de app rekent zolang je niets kiest. */
export const cheapestPotions = (job: Job): PotionPair => ({ hp: HP_POTION, mp: mpPotionFor(job) })

/**
 * De potions waarmee gerekend wordt: je keuze, of de goedkoopste als je niets koos, of als je keuze niet bij deze job hoort
 * (een Lemon van een Magician die nu Thief is) of niet herstelt wat de soort vraagt.
 */
export function resolvePotions(job: Job, choice: PotionChoice): PotionPair {
  const fallback = cheapestPotions(job)
  const find = (kind: PotionKind) => potionsOf(job).find((p) => p.name === choice[kind] && p[kind] > 0) ?? fallback[kind]
  return { hp: find('hp'), mp: find('mp') }
}

/** Eén potion op de kaart. */
export interface PotionOption {
  potion: Potion
  kind: PotionKind
  /** Wat hij herstelt, met het extra herstel van Improved HP of MP Recovery (factor 1 zonder punten). */
  restores: number
  /** Meso per punt herstel: de prijs gedeeld door `restores`. */
  mesoPerPoint: number
  /** Hoeveel procent van je Max HP of Max MP één potion vult, hoogstens 100; null zonder bruikbare max. */
  fillPct: number | null
  /** Of je deze potion gebruikt: de berekening rekent ermee. */
  used: boolean
  /** Of hij het goedkoopst is per punt herstel (waar de app mee rekent zolang je niets kiest). */
  cheapest: boolean
}

/** De potions op de kaart: eerst HP, dan MP, elk van goedkoop naar duur per punt herstel. */
export interface PotionOptions {
  hp: readonly PotionOption[]
  mp: readonly PotionOption[]
}

/** Het hoogste Max HP en Max MP dat het profiel toelaat (beide 30.000). */
const MAX_BAR = Math.min(...PROFILE_FIELDS.filter((f) => f.key === 'hp' || f.key === 'mp').map((f) => f.max))

/** Een max uit het profiel als getal, of null als hij leeg, geen geheel getal, 0 of boven wat het profiel toelaat is. */
const maxOf = (text: string): number | null => {
  const t = text.trim()
  const n = t === '' ? NaN : Number(t)
  return Number.isInteger(n) && n > 0 && n <= MAX_BAR ? n : null
}

/**
 * De potions van deze job met hun prijs per punt en wat ze van je balk vullen. `used` zijn de potions waarmee gerekend wordt
 * (resolvePotions; zonder: de goedkoopste). `factor` is het extra herstel van Improved HP en MP Recovery (potionFactorOf).
 */
export function potionOptions(
  job: Job,
  maxHp: string,
  maxMp: string,
  factor: { hp: number; mp: number } = { hp: 1, mp: 1 },
  used: PotionPair = cheapestPotions(job),
): PotionOptions {
  const cheapest = cheapestPotions(job)
  const list = (kind: PotionKind, max: number | null): PotionOption[] =>
    potionsOf(job)
      .filter((p) => p[kind] > 0)
      .map((potion) => {
        // Niet afgerond, net als in de berekening (suggest.ts); de kaart rondt alleen af bij het tonen.
        const restores = potion[kind] * factor[kind]
        return {
          potion,
          kind,
          restores,
          mesoPerPoint: potion.price / restores,
          fillPct: max === null ? null : Math.min(100, (restores / max) * 100),
          used: potion === used[kind],
          cheapest: potion === cheapest[kind],
        }
      })
      // Op de prijs per punt zonder factor, net als cheapest in suggest.ts: de factor geldt voor elke potion en verandert de
      // volgorde niet, maar erin vermenigvuldigd breekt afronding een gelijkspel (Orange en Lemon bij factor 1,15).
      // Stabiel: bij gelijke prijs per punt blijft de volgorde van de data.
      .sort((a, b) => a.potion.price / a.potion[kind] - b.potion.price / b.potion[kind])
  return { hp: list('hp', maxOf(maxHp)), mp: list('mp', maxOf(maxMp)) }
}

export type PotionAdvice =
  /** Niet uit te rekenen: geen profiel of geen kosten voor dit level. */
  | { kind: 'none' }
  /**
   * Je keuze naast de goedkoopste. `stay` als je per soort al de goedkoopste gebruikt. `meso` is wat dit level kost met je
   * keuze en met de goedkoopste (undefined niet uit te rekenen, null geen EXP).
   */
  | { kind: 'advice'; stay: boolean; chosen: PotionPair; cheapest: PotionPair; mesoChosen: number | null; mesoCheapest: number | null | undefined }

/**
 * Loont een andere potion? Wat dit level kost met de potions in het profiel, tegenover de goedkoopste per punt. Per punt herstel
 * kost de goedkoopste nooit meer, want de app rekent niet met verspild herstel (#181). Telt alleen bij een plek waar je de
 * potionkosten leeg laat, net als de rest van de berekening.
 */
export function potionAdvice(drafts: readonly SpotDraft[], profile: Profile | null): PotionAdvice {
  if (!profile) return { kind: 'none' }
  const cheapest = cheapestPotions(profile.job)
  const chosen = profile.potions ?? cheapest
  const costWith = (potions: PotionPair) => {
    const p = { ...profile, potions }
    const c = levelCost(p, bestVerdict(drafts, p))
    return c.kind === 'cost' ? c.meso : undefined
  }
  const mesoChosen = costWith(chosen)
  if (mesoChosen === undefined) return { kind: 'none' }
  const stay = chosen.hp === cheapest.hp && chosen.mp === cheapest.mp
  return { kind: 'advice', stay, chosen, cheapest, mesoChosen, mesoCheapest: stay ? mesoChosen : costWith(cheapest) }
}

export const POTION_CHOICE_KEY = 'mesowise.potions.v1'
const VERSION = 1

/** De bewaarde keuze; wat niet klopt is "nog niet gekozen". Of een naam bij je job hoort, beslist resolvePotions. */
export function loadPotionChoice(storage: Storage | null | undefined): PotionChoice {
  try {
    const raw = storage?.getItem(POTION_CHOICE_KEY)
    if (!raw) return NO_POTION_CHOICE
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return NO_POTION_CHOICE
    const name = (v: unknown) => (typeof v === 'string' && v.length <= 60 ? v : null)
    const d = data as { hp?: unknown; mp?: unknown }
    return { hp: name(d.hp), mp: name(d.mp) }
  } catch {
    return NO_POTION_CHOICE
  }
}

/** Bewaar de keuze; true als het gelukt is. Mislukken breekt de app niet. */
export function savePotionChoice(storage: Storage | null | undefined, choice: PotionChoice): boolean {
  try {
    if (!storage) return false
    storage.setItem(POTION_CHOICE_KEY, JSON.stringify({ version: VERSION, hp: choice.hp, mp: choice.mp }))
    return true
  } catch {
    return false
  }
}
