// Het bewerkbare ontwerp van een plek: de velden blijven tekst zodat typen niets kwijtraakt.
// Een leeg of onleesbaar veld telt als NaN, en dus als ongeldig voor rankSpots.
import type { Spot } from './calc/rankSpots'

/** Grenzen tegen onbegrensde groei (invoer en opslag). */
export const MAX_SPOTS = 200
export const MAX_NAME_LENGTH = 100
export const MAX_KNOWN_LENGTH = 64

export interface SpotDraft {
  id: string
  name: string
  expPerHour: string
  travel: string
  /** De id van een bekende plek uit src/data/, als de plek daaruit gekozen is. */
  known?: string
  /** Bij een bekende plek: het monster waarop je traint (leeg = het voorstel). */
  monster?: string
  /** Bij een bekende plek: kills per uur (leeg = het voorstel). */
  kills?: string
  /** Bij een mob: je eigen getal voor een eigenschap, alleen als het afwijkt van de database (zie MOB_FIELDS). */
  mobHp?: string
  mobExp?: string
  mobTouchMin?: string
  mobTouchMax?: string
  mobWdef?: string
}

/** De velden waarin je de eigenschappen van een mob corrigeert (Dave, 4 oktober 2026). */
export const MOB_KEYS = ['mobHp', 'mobExp', 'mobTouchMin', 'mobTouchMax', 'mobWdef'] as const
export type MobKey = (typeof MOB_KEYS)[number]

/** Tekst naar getal; een leeg veld is NaN (Number('') zou stilletjes 0 geven). */
export function parseAmount(text: string): number {
  return text.trim() === '' ? NaN : Number(text)
}

/** Potions en munitie staan niet in de plek: bij een bekende plek komen ze uit het voorstel (resolveSpot), en een eigen plek heeft ze niet.
 * Let op: 0 leest hier als "gratis". Dat is veilig zolang de app nooit een EXP per uur invult (mobDraft en initialDrafts laten hem leeg, dus NaN),
 * want dan rangschikt een plek zonder voorstel ongeldig (#222). */
export function toSpot(d: SpotDraft): Spot {
  return {
    id: d.id,
    name: d.name.trim(),
    expPerHour: parseAmount(d.expPerHour),
    cost: { potions: 0, ammo: 0, travel: parseAmount(d.travel) },
  }
}

/** Een lege plek, alleen voor tests: de app maakt haar plekken met mobDraft. */
export function newDraft(id: string): SpotDraft {
  return { id, name: '', expPerHour: '', travel: '0' }
}

/** Een id voor een nieuwe plek; randomUUID bestaat alleen in veilige contexten. */
export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
