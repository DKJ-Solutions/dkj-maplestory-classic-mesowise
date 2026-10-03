import { describe, expect, it } from 'vitest'
import { MAX_KNOWN_LENGTH, MAX_NAME_LENGTH, MAX_SPOTS, type SpotDraft } from '../spotDraft'
import { exampleSpot, isDraftRow, loadSpots, saveSpots, STORAGE_KEY } from './spots'

/** Een kleine in-memory Storage; geen jsdom nodig. */
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

const spot = (id: string, over: Partial<SpotDraft> = {}): SpotDraft => ({
  id,
  name: `plek ${id}`,
  expPerHour: '60000',
  potions: '10000',
  ammo: '4000',
  travel: '1000',
  ...over,
})

const stored = (spots: unknown[], version: unknown = 1) =>
  fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version, spots }) })

describe('saveSpots en loadSpots', () => {
  it('geeft heen en terug dezelfde plekken, in dezelfde volgorde', () => {
    const storage = fakeStorage()
    const spots = [spot('b'), spot('a', { expPerHour: '0' })]
    expect(saveSpots(storage, spots)).toBe(true)
    expect(loadSpots(storage)).toEqual(spots)
  })

  it('geeft null als er nog nooit iets is bewaard', () => {
    expect(loadSpots(fakeStorage())).toBeNull()
  })

  it('geeft [] voor een bewust lege lijst, en dat is iets anders dan null', () => {
    const storage = fakeStorage()
    expect(saveSpots(storage, [])).toBe(true)
    expect(loadSpots(storage)).toEqual([])
  })

  it('geeft null zonder opslag (null of undefined) en bewaren meldt false', () => {
    expect(loadSpots(null)).toBeNull()
    expect(loadSpots(undefined)).toBeNull()
    expect(saveSpots(null, [spot('a')])).toBe(false)
    expect(saveSpots(undefined, [spot('a')])).toBe(false)
  })

  it('geeft null bij kapotte JSON', () => {
    expect(loadSpots(fakeStorage({ [STORAGE_KEY]: '{niet-json' }))).toBeNull()
  })

  it('geeft null bij een onbekende versie', () => {
    expect(loadSpots(stored([spot('a')], 2))).toBeNull()
    expect(loadSpots(stored([spot('a')], '1'))).toBeNull()
  })

  it('geeft null als de vorm niet klopt (geen object, spots geen lijst)', () => {
    expect(loadSpots(fakeStorage({ [STORAGE_KEY]: '[1,2]' }))).toBeNull()
    expect(loadSpots(fakeStorage({ [STORAGE_KEY]: 'null' }))).toBeNull()
    expect(loadSpots(fakeStorage({ [STORAGE_KEY]: '{"version":1,"spots":"x"}' }))).toBeNull()
  })

  it('geeft null en gooit niet als getItem gooit', () => {
    const storage = fakeStorage()
    storage.getItem = () => {
      throw new Error('geblokkeerd')
    }
    expect(loadSpots(storage)).toBeNull()
  })

  it('geeft false en gooit niet als setItem gooit (bv. opslag vol)', () => {
    const storage = fakeStorage()
    storage.setItem = () => {
      throw new DOMException('vol', 'QuotaExceededError')
    }
    expect(saveSpots(storage, [spot('a')])).toBe(false)
  })

  it('houdt een rij met een ongeldig getal (negatief, leeg, tekst) voor de foutmarkering', () => {
    const storage = stored([spot('a'), spot('neg', { expPerHour: '-1' }), spot('leeg', { potions: '' }), spot('t', { ammo: 'abc' })])
    expect(loadSpots(storage)?.map((s) => s.id)).toEqual(['a', 'neg', 'leeg', 't'])
    expect(loadSpots(storage)?.[2].potions).toBe('')
  })

  it('laat rijen weg zonder id of met verkeerd getypte velden', () => {
    const storage = stored([
      spot('ok'),
      { ...spot('getal'), expPerHour: 5 },
      { id: 'zonder-kosten', name: 'x', expPerHour: '1' },
      { ...spot('geen-id'), id: '' },
      { ...spot('naam'), name: 5 },
      null,
      'rommel',
    ])
    expect(loadSpots(storage)?.map((s) => s.id)).toEqual(['ok'])
  })

  it('ontdubbelt op id (de eerste wint)', () => {
    const rows = loadSpots(stored([spot('a', { name: 'eerste' }), spot('a', { name: 'tweede' }), spot('b')]))
    expect(rows?.map((r) => r.name)).toEqual(['eerste', 'plek b'])
  })

  it('kapt de naam af en begrenst het aantal rijen', () => {
    const lang = loadSpots(stored([spot('a', { name: 'x'.repeat(MAX_NAME_LENGTH + 50) })]))
    expect(lang?.[0].name).toHaveLength(MAX_NAME_LENGTH)
    const veel = Array.from({ length: MAX_SPOTS + 10 }, (_, i) => spot(String(i)))
    expect(loadSpots(stored(veel))).toHaveLength(MAX_SPOTS)
  })

  it('bewaart ook ongeldige plekken, zodat er niets kwijtraakt', () => {
    const storage = fakeStorage()
    const drafts = [spot('a'), spot('leeg', { expPerHour: '' })]
    saveSpots(storage, drafts)
    expect(loadSpots(storage)).toEqual(drafts)
  })

  it('laat extra velden weg, bij laden en bij bewaren', () => {
    const extra = { ...spot('a'), geheim: 'x', extra: 9 }
    const loaded = loadSpots(stored([extra]))
    expect(loaded).toEqual([spot('a')])

    const storage = fakeStorage()
    saveSpots(storage, [extra as SpotDraft])
    expect(storage.data.get(STORAGE_KEY)).not.toContain('geheim')
    expect(storage.data.get(STORAGE_KEY)).not.toContain('extra')
  })

  it('schrijft versie 1 weg', () => {
    const storage = fakeStorage()
    saveSpots(storage, [spot('a')])
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).version).toBe(1)
  })
})

describe('de verwijzing naar een bekende plek (known)', () => {
  it('gaat heen en terug mee', () => {
    const storage = fakeStorage()
    const drafts = [spot('a', { known: 'henesys-pigs' }), spot('b')]
    saveSpots(storage, drafts)
    expect(loadSpots(storage)).toEqual(drafts)
  })

  it('valt weg als hij leeg, undefined of geen tekst is, zonder de rij te verliezen', () => {
    for (const known of ['', undefined, 5, null, { id: 'x' }]) {
      expect(loadSpots(stored([{ ...spot('a'), known }]))).toEqual([spot('a')])
    }
    const storage = fakeStorage()
    saveSpots(storage, [spot('a', { known: undefined })])
    expect(storage.data.get(STORAGE_KEY)).not.toContain('known')
  })

  it('wordt begrensd in lengte', () => {
    const rows = loadSpots(stored([spot('a', { known: 'k'.repeat(MAX_KNOWN_LENGTH + 20) })]))
    expect(rows?.[0].known).toHaveLength(MAX_KNOWN_LENGTH)
  })
})

describe('grenzen bij bewaren', () => {
  it('bewaart hoogstens MAX_SPOTS plekken', () => {
    const storage = fakeStorage()
    saveSpots(storage, Array.from({ length: MAX_SPOTS + 5 }, (_, i) => spot(String(i))))
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).spots).toHaveLength(MAX_SPOTS)
  })

  it('houdt precies MAX_SPOTS en een naam van precies MAX_NAME_LENGTH heel', () => {
    const storage = fakeStorage()
    const naam = 'x'.repeat(MAX_NAME_LENGTH)
    saveSpots(storage, Array.from({ length: MAX_SPOTS }, (_, i) => spot(String(i), { name: naam })))
    const rows = loadSpots(storage)
    expect(rows).toHaveLength(MAX_SPOTS)
    expect(rows?.[0].name).toBe(naam)
  })

  it('kapt een te lange naam af bij bewaren', () => {
    const storage = fakeStorage()
    saveSpots(storage, [spot('a', { name: 'y'.repeat(MAX_NAME_LENGTH + 1) })])
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).spots[0].name).toHaveLength(MAX_NAME_LENGTH)
  })

  it('telt dubbele id\'s niet mee voor de grens bij laden', () => {
    const rows = [spot('a'), spot('a'), ...Array.from({ length: MAX_SPOTS }, (_, i) => spot(`n${i}`))]
    expect(loadSpots(stored(rows))).toHaveLength(MAX_SPOTS)
  })
})

describe('isDraftRow', () => {
  it('accepteert een volledige rij, ook met ongeldige getalteksten', () => {
    expect(isDraftRow(spot('a'))).toBe(true)
    expect(isDraftRow(spot('a', { expPerHour: '', potions: 'abc', ammo: '-1' }))).toBe(true)
  })

  it('weigert niet-objecten, lijsten, lege id, ontbrekende of verkeerd getypte velden', () => {
    for (const v of [null, undefined, 5, 'x', [], { ...spot('a'), id: '' }, { ...spot('a'), id: 3 }, { ...spot('a'), name: undefined }]) {
      expect(isDraftRow(v)).toBe(false)
    }
    for (const f of ['name', 'expPerHour', 'potions', 'ammo', 'travel'] as const) {
      const { [f]: _weg, ...rest } = spot('a')
      expect(isDraftRow(rest)).toBe(false)
      expect(isDraftRow({ ...spot('a'), [f]: 1 })).toBe(false)
    }
  })
})

describe('exampleSpot', () => {
  it('geeft de voorbeeldplek met de meegegeven id', () => {
    expect(exampleSpot('x').id).toBe('x')
    expect(exampleSpot('x').expPerHour).toBeGreaterThan(0)
  })
})
