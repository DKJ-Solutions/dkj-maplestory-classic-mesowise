// De job van het karakter (Dave, 4 oktober 2026, issue #41): bepaalt welke winkelitems de equipment-lijsten
// tonen en of de app het advies kan doorrekenen. De berekening kent alleen de Thief; voor een andere job
// zegt de app eerlijk "nog niet doorgerekend" in plaats van een getal met de verkeerde formule. Puur, zonder
// UI-import. Alles uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op de Thief.

export const JOB_KEY = 'mesowise.job.v1'
const VERSION = 1

export type Job = 'beginner' | 'warrior' | 'magician' | 'bowman' | 'thief'

/** De jobs in de volgorde waarin het scherm ze toont. */
export const JOBS: readonly { job: Job; label: string }[] = [
  { job: 'beginner', label: 'Beginner' },
  { job: 'warrior', label: 'Warrior' },
  { job: 'magician', label: 'Magician' },
  { job: 'bowman', label: 'Bowman' },
  { job: 'thief', label: 'Thief' },
]

/** Zo begint iedereen, ook wie de app al gebruikte: tot nu toe waren dat allemaal Thieves. */
export const DEFAULT_JOB: Job = 'thief'

const isJob = (v: unknown): v is Job => JOBS.some((j) => j.job === v)

export const jobLabel = (job: Job): string => JOBS.find((j) => j.job === job)!.label

/** Of de app voor deze job kan rekenen: de formules en data (LUK-schade, Lucky Seven, Subi, HP/AP) zijn die van de Thief. */
export const isComputed = (job: Job): boolean => job === 'thief'

/** De ene zin die bij elk advies staat in plaats van een getal. */
export const notComputedText = (job: Job): string => `Nog niet doorgerekend voor ${jobLabel(job)}.`

/** De bewaarde job; alles wat niet klopt, wordt de Thief. */
export function loadJob(storage: Storage | null | undefined): Job {
  try {
    const raw = storage?.getItem(JOB_KEY)
    if (!raw) return DEFAULT_JOB
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return DEFAULT_JOB
    const job = (data as { job?: unknown }).job
    return isJob(job) ? job : DEFAULT_JOB
  } catch {
    return DEFAULT_JOB
  }
}

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
