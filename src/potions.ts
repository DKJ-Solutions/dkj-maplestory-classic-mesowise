// De potions die je job kan kopen, voor de Potions-kaart. Puur, zonder UI-import. Een potion heeft in Classic geen
// levelvereiste (MeowDB: "Lv 0"), dus op elk level kun je ze allemaal gebruiken; de kaart toont ze met wat ze per HP of MP
// kosten, hoeveel van je balk één potion vult, en welke de app in de berekening gebruikt (HP_POTION en mpPotionFor).
import { MAGICIAN_MP_POTIONS } from './data/magician'
import { POTIONS } from './data/spots'
import type { Potion } from './data/types'
import type { Job } from './job'
import { PROFILE_FIELDS } from './profile'
import { HP_POTION, mpPotionFor } from './suggest'

/** Eén potion op de kaart. */
export interface PotionOption {
  potion: Potion
  /** Wat hij herstelt, of HP of MP (de potions in de app herstellen er één van). */
  kind: 'hp' | 'mp'
  /** Wat hij herstelt, met het extra herstel van Improved HP of MP Recovery (factor 1 zonder punten). */
  restores: number
  /** Meso per punt herstel: de prijs gedeeld door `restores`. */
  mesoPerPoint: number
  /** Hoeveel procent van je Max HP of Max MP één potion vult, hoogstens 100; null zonder bruikbare max. */
  fillPct: number | null
  /** Of de berekening met deze potion rekent (de goedkoopste per punt). */
  used: boolean
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
 * De potions van deze job met hun prijs per punt en wat ze van je balk vullen. Een Magician heeft er de Orange en de Lemon
 * van Len the Fairy bij (data/magician.ts). `factor` is het extra herstel van Improved HP en MP Recovery (potionFactorOf).
 */
export function potionOptions(job: Job, maxHp: string, maxMp: string, factor: { hp: number; mp: number } = { hp: 1, mp: 1 }): PotionOptions {
  // Dezelfde volgorde als de keuze van de app (MAGICIAN_MP_POTION in suggest.ts), zodat een gelijkspel net zo uitvalt.
  const all = job === 'magician' ? [...MAGICIAN_MP_POTIONS, ...POTIONS] : POTIONS
  const usedMp = mpPotionFor(job)
  const list = (kind: 'hp' | 'mp', max: number | null, used: Potion): PotionOption[] =>
    all
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
          used: potion === used,
        }
      })
      // Op de prijs per punt zonder factor, net als cheapest in suggest.ts: de factor geldt voor elke potion en verandert de
      // volgorde niet, maar erin vermenigvuldigd breekt afronding een gelijkspel (Orange en Lemon bij factor 1,15).
      // Stabiel: bij gelijke prijs per punt blijft de volgorde van de data.
      .sort((a, b) => a.potion.price / a.potion[kind] - b.potion.price / b.potion[kind])
  return { hp: list('hp', maxOf(maxHp), HP_POTION), mp: list('mp', maxOf(maxMp), usedMp) }
}
