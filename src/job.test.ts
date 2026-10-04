import { describe, expect, it } from 'vitest'
import { DEFAULT_JOB, isComputed, isJobStored, JOB_KEY, jobChoices, JOBS, jobLabel, loadJob, notComputedText, saveJob, type Job } from './job'

function fakeStorage(initial: Record<string, string> = {}): Storage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const throwing = (): Storage =>
  ({
    getItem: () => {
      throw new Error('geblokkeerd')
    },
    setItem: () => {
      throw new Error('vol')
    },
  }) as unknown as Storage

const stored = (job: unknown, version: unknown = 1) => fakeStorage({ [JOB_KEY]: JSON.stringify({ version, job }) })
const ALL: Job[] = JOBS.map((j) => j.job)

describe('JOBS, DEFAULT_JOB en jobLabel', () => {
  it('kent vijf jobs, met de Thief als standaard', () => {
    expect(ALL).toEqual(['warrior', 'magician', 'bowman', 'thief'])
    expect(DEFAULT_JOB).toBe('thief')
  })

  it('geeft elke job een label', () => {
    expect(jobLabel('thief')).toBe('Thief')
    expect(jobLabel('warrior')).toBe('Warrior')
    for (const j of JOBS) expect(jobLabel(j.job)).toBe(j.label)
  })
})

describe('isComputed en notComputedText', () => {
  it('rekent alleen voor de Thief', () => {
    expect(isComputed('thief')).toBe(true)
    for (const j of ALL.filter((x) => x !== 'thief')) expect(isComputed(j), j).toBe(false)
  })

  it('noemt de job in de zin die het getal vervangt', () => {
    expect(notComputedText('warrior')).toBe('Nog niet doorgerekend voor Warrior.')
    expect(notComputedText('bowman')).toBe('Nog niet doorgerekend voor Bowman.')
  })
})

describe('loadJob en saveJob', () => {
  it('geeft elke job terug na bewaren en laden', () => {
    for (const j of ALL) {
      const storage = fakeStorage()
      expect(saveJob(storage, j), j).toBe(true)
      expect(loadJob(storage), j).toBe(j)
    }
  })

  it('valt terug op de Thief zonder opslag, zonder sleutel of met kapotte JSON', () => {
    expect(loadJob(null)).toBe('thief')
    expect(loadJob(undefined)).toBe('thief')
    expect(loadJob(fakeStorage())).toBe('thief')
    expect(loadJob(fakeStorage({ [JOB_KEY]: '' }))).toBe('thief')
    expect(loadJob(fakeStorage({ [JOB_KEY]: '{kapot' }))).toBe('thief')
  })

  it('valt terug op de Thief bij JSON van een verkeerde vorm', () => {
    for (const raw of ['null', '5', '"warrior"', '[]', 'true', '{}', JSON.stringify({ version: 1 })]) {
      expect(loadJob(fakeStorage({ [JOB_KEY]: raw })), raw).toBe('thief')
    }
  })

  it('valt terug op de Thief bij een verkeerde of ontbrekende versie, ook met een geldige job', () => {
    for (const v of [2, 0, '1', null]) expect(loadJob(stored('warrior', v)), String(v)).toBe('thief')
    expect(loadJob(fakeStorage({ [JOB_KEY]: JSON.stringify({ job: 'warrior' }) }))).toBe('thief')
  })

  it('valt terug op de Thief bij een onbekende job', () => {
    for (const j of ['priest', 'Warrior', '', 5, null, {}, '__proto__', 'constructor', 'toString']) expect(loadJob(stored(j)), String(j)).toBe('thief')
  })

  it('valt terug op de Thief als lezen een fout geeft', () => {
    expect(loadJob(throwing())).toBe('thief')
  })

  it('meldt of bewaren gelukt is en breekt niet op een storing', () => {
    expect(saveJob(null, 'warrior')).toBe(false)
    expect(saveJob(undefined, 'warrior')).toBe(false)
    expect(saveJob(throwing(), 'warrior')).toBe(false)
  })

  it('bewaart onder een eigen sleutel met een versie', () => {
    const storage = fakeStorage({ 'mesowise.profile.v1': 'x' })
    saveJob(storage, 'magician')
    expect(JOB_KEY).toBe('mesowise.job.v1')
    expect(JSON.parse(storage.data.get(JOB_KEY)!)).toEqual({ version: 1, job: 'magician' })
    expect(storage.data.get('mesowise.profile.v1')).toBe('x')
  })
})

describe('jobChoices', () => {
  it('wie nog niet koos, kiest uit alle vier jobs', () => {
    expect(jobChoices(false)).toEqual(ALL)
  })

  it('een gekozen job ligt vast', () => {
    expect(jobChoices(true)).toEqual([])
  })

  it('de Beginner is geen keuze (Dave, 4 oktober 2026)', () => {
    expect(jobChoices(false)).not.toContain('beginner')
  })

  it('een bewaarde Beginner telt niet als keuze: de app vraagt opnieuw en rekent als Thief', () => {
    expect(isJobStored(stored('beginner'))).toBe(false)
    expect(loadJob(stored('beginner'))).toBe('thief')
  })
})

describe('isJobStored', () => {
  it('is waar voor elke geldig bewaarde job', () => {
    for (const job of ALL) expect(isJobStored(stored(job))).toBe(true)
  })

  it('is onwaar zonder opslag, zonder sleutel, bij kapotte JSON, een verkeerde versie of een onbekende job', () => {
    expect(isJobStored(null)).toBe(false)
    expect(isJobStored(fakeStorage())).toBe(false)
    expect(isJobStored(fakeStorage({ [JOB_KEY]: '{kapot' }))).toBe(false)
    expect(isJobStored(fakeStorage({ [JOB_KEY]: 'null' }))).toBe(false)
    expect(isJobStored(stored('thief', 2))).toBe(false)
    expect(isJobStored(stored('pirate'))).toBe(false)
    expect(isJobStored(throwing())).toBe(false)
  })

  it('wordt waar na saveJob', () => {
    const s = fakeStorage()
    saveJob(s, 'thief')
    expect(isJobStored(s)).toBe(true)
  })
})