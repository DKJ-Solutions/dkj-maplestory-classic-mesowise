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
  potions: string
  ammo: string
  travel: string
  /** De id van een bekende plek uit src/data/, als de plek daaruit gekozen is. */
  known?: string
}

/** Tekst naar getal; een leeg veld is NaN (Number('') zou stilletjes 0 geven). */
export function parseAmount(text: string): number {
  return text.trim() === '' ? NaN : Number(text)
}

export function toSpot(d: SpotDraft): Spot {
  return {
    id: d.id,
    name: d.name.trim(),
    expPerHour: parseAmount(d.expPerHour),
    cost: { potions: parseAmount(d.potions), ammo: parseAmount(d.ammo), travel: parseAmount(d.travel) },
  }
}

export function toDraft(s: Spot): SpotDraft {
  return {
    id: s.id,
    name: s.name,
    expPerHour: String(s.expPerHour),
    potions: String(s.cost.potions),
    ammo: String(s.cost.ammo),
    travel: String(s.cost.travel),
  }
}

export function newDraft(id: string): SpotDraft {
  return { id, name: '', expPerHour: '', potions: '0', ammo: '0', travel: '0' }
}

/** Een id voor een nieuwe plek; randomUUID bestaat alleen in veilige contexten. */
export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
