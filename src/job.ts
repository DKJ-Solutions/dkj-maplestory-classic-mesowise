// De job van het karakter (Dave, 4 oktober 2026, issue #41): bepaalt welke winkelitems de equipment-lijsten
// tonen en of de app het advies kan doorrekenen. De berekening kent de Thief, de Warrior, de Bowman en de Magician; voor een andere job
// zegt de app eerlijk "nog niet doorgerekend" in plaats van een getal met de verkeerde formule. Puur, zonder
// UI-import. Alles uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op de Thief.

export const JOB_KEY = 'mesowise.job.v1'
const VERSION = 1

export type Job = 'warrior' | 'magician' | 'bowman' | 'thief'

/** De jobs in de volgorde waarin het scherm ze toont. */
export const JOBS: readonly { job: Job; label: string }[] = [
  { job: 'warrior', label: 'Warrior' },
  { job: 'magician', label: 'Magician' },
  { job: 'bowman', label: 'Bowman' },
  { job: 'thief', label: 'Thief' },
]

/** Zo begint iedereen, ook wie de app al gebruikte: tot nu toe waren dat allemaal Thieves. */
export const DEFAULT_JOB: Job = 'thief'

const isJob = (v: unknown): v is Job => JOBS.some((j) => j.job === v)

export const jobLabel = (job: Job): string => JOBS.find((j) => j.job === job)!.label

/** Of de app voor deze job kan rekenen: de Thief (LUK-schade, Lucky Seven, Subi), de Warrior (STR-schade, Power Strike), de Bowman (DEX-schade, Arrow Blow, pijlen) en de Magician (INT-schade, Energy Bolt en Magic Claw). */
export const isComputed = (job: Job): boolean => job === 'thief' || job === 'warrior' || job === 'bowman' || job === 'magician'

/** De ene zin die bij elk advies staat in plaats van een getal. */
export const notComputedText = (job: Job): string => `Nog niet doorgerekend voor ${jobLabel(job)}.`

/**
 * De jobs waaruit je nog kunt kiezen (Dave, 4 oktober 2026): een job ligt vast zodra je hem kiest. Wie nog
 * niets koos, kiest uit alle vier; daarna is er geen keuze meer. De Beginner staat er niet in: niemand speelt
 * hem als job (Dave, 4 oktober 2026).
 */
export function jobChoices(chosen: boolean): readonly Job[] {
  return chosen ? [] : JOBS.map((j) => j.job)
}

/** De bewaarde job, of null als er geen geldige is. */
function storedJob(storage: Storage | null | undefined): Job | null {
  try {
    const raw = storage?.getItem(JOB_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return null
    const job = (data as { job?: unknown }).job
    return isJob(job) ? job : null
  } catch {
    return null
  }
}

/** Of er een geldige job bewaard is, dus of de speler al gekozen heeft. */
export const isJobStored = (storage: Storage | null | undefined): boolean => storedJob(storage) !== null

/** De bewaarde job; alles wat niet klopt, wordt de Thief. */
export const loadJob = (storage: Storage | null | undefined): Job => storedJob(storage) ?? DEFAULT_JOB

/** Bewaar de job; true als het gelukt is. Mislukken breekt de app niet. */
export function saveJob(storage: Storage | null | undefined, job: Job): boolean {
  try {
    if (!storage) return false
    storage.setItem(JOB_KEY, JSON.stringify({ version: VERSION, job }))
    return true
  } catch {
    return false
  }
}
