import { describe, expect, it } from 'vitest'
import { fitsGender, GENDER_KEY, GENDERS, loadGender, saveGender, type Gender } from './gender'

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

describe('fitsGender', () => {
  it('past een item zonder geslacht bij iedereen, ook zolang er niet gekozen is', () => {
    expect(fitsGender({}, 'male')).toBe(true)
    expect(fitsGender({}, 'female')).toBe(true)
    expect(fitsGender({}, null)).toBe(true)
  })

  it('past een mannenstuk alleen bij een man, en een vrouwenstuk alleen bij een vrouw', () => {
    expect(fitsGender({ gender: 'male' }, 'male')).toBe(true)
    expect(fitsGender({ gender: 'male' }, 'female')).toBe(false)
    expect(fitsGender({ gender: 'female' }, 'female')).toBe(true)
    expect(fitsGender({ gender: 'female' }, 'male')).toBe(false)
  })

  it('past een stuk voor één geslacht bij niemand zolang het geslacht niet gekozen is', () => {
    expect(fitsGender({ gender: 'male' }, null)).toBe(false)
    expect(fitsGender({ gender: 'female' }, null)).toBe(false)
  })
})

describe('GENDERS', () => {
  it('toont Man en dan Vrouw', () => {
    expect(GENDERS).toEqual([
      { gender: 'male', label: 'Man' },
      { gender: 'female', label: 'Vrouw' },
    ])
  })
})

describe('loadGender en saveGender', () => {
  it('geeft null zonder opslag, of zonder bewaarde waarde', () => {
    expect(loadGender(null)).toBeNull()
    expect(loadGender(undefined)).toBeNull()
    expect(loadGender(fakeStorage())).toBeNull()
  })

  it('bewaart en leest terug, onder de sleutel mesowise.gender.v1 met versie 1', () => {
    expect(GENDER_KEY).toBe('mesowise.gender.v1')
    for (const g of ['male', 'female'] as Gender[]) {
      const s = fakeStorage()
      expect(saveGender(s, g)).toBe(true)
      expect(JSON.parse(s.data.get('mesowise.gender.v1')!)).toEqual({ version: 1, gender: g })
      expect(loadGender(s)).toBe(g)
    }
  })

  it('overschrijft een eerdere keuze', () => {
    const s = fakeStorage()
    saveGender(s, 'male')
    saveGender(s, 'female')
    expect(loadGender(s)).toBe('female')
  })

  it('geeft null bij alles wat niet klopt: geen JSON, een andere versie, een onbekend geslacht, een verkeerd type', () => {
    const bad = [
      'geen json{',
      '',
      'null',
      '42',
      '"male"',
      '[]',
      JSON.stringify({ gender: 'male' }),
      JSON.stringify({ version: 2, gender: 'male' }),
      JSON.stringify({ version: '1', gender: 'male' }),
      JSON.stringify({ version: 1 }),
      JSON.stringify({ version: 1, gender: 'other' }),
      JSON.stringify({ version: 1, gender: 'Male' }),
      JSON.stringify({ version: 1, gender: 1 }),
      JSON.stringify({ version: 1, gender: null }),
    ]
    for (const raw of bad) expect(loadGender(fakeStorage({ [GENDER_KEY]: raw })), raw).toBeNull()
  })

  it('geeft false (en breekt niet) als bewaren mislukt of er geen opslag is', () => {
    const full = fakeStorage()
    full.setItem = () => {
      throw new Error('quota')
    }
    expect(saveGender(full, 'male')).toBe(false)
    expect(saveGender(null, 'male')).toBe(false)
    expect(saveGender(undefined, 'female')).toBe(false)
  })

  it('geeft null als lezen een fout geeft', () => {
    const s = fakeStorage()
    s.getItem = () => {
      throw new Error('geblokkeerd')
    }
    expect(loadGender(s)).toBeNull()
  })
})
