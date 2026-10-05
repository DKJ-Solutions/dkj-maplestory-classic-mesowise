// Het geslacht van het karakter (Dave, 4 oktober 2026, issue #55, beslissing 2): sommige winkelitems zijn alleen
// voor mannen of alleen voor vrouwen ("Male only", "Female only" op de itempagina). Zolang je niet kiest, telt
// alleen wat beide kunnen dragen: de app adviseert nooit een item dat je niet kunt dragen.
// Puur, zonder UI-import. Alles uit de opslag is onbetrouwbaar: wat niet klopt, is "nog niet gekozen".

import type { Gender } from './data/types'

export type { Gender }

export const GENDER_KEY = 'mesowise.gender.v1'
const VERSION = 1

/** De keuzes in de volgorde waarin het scherm ze toont. */
export const GENDERS: readonly { gender: Gender; label: string }[] = [
  { gender: 'male', label: 'Male' },
  { gender: 'female', label: 'Female' },
]

const isGender = (v: unknown): v is Gender => GENDERS.some((g) => g.gender === v)

/**
 * Of een item past bij het geslacht: een item zonder `gender` draagt iedereen; een item met `gender` alleen dat
 * geslacht, en niemand zolang het geslacht nog niet gekozen is (null).
 */
export const fitsGender = (item: { gender?: Gender }, gender: Gender | null): boolean => item.gender === undefined || item.gender === gender

/** Het bewaarde geslacht, of null als er (nog) geen geldig is. */
export function loadGender(storage: Storage | null | undefined): Gender | null {
  try {
    const raw = storage?.getItem(GENDER_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return null
    const gender = (data as { gender?: unknown }).gender
    return isGender(gender) ? gender : null
  } catch {
    return null
  }
}

/** Bewaar het geslacht; true als het gelukt is. Mislukken breekt de app niet. */
export function saveGender(storage: Storage | null | undefined, gender: Gender): boolean {
  try {
    if (!storage) return false
    storage.setItem(GENDER_KEY, JSON.stringify({ version: VERSION, gender }))
    return true
  } catch {
    return false
  }
}
