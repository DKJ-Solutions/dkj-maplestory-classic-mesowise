import { describe, expect, it } from 'vitest'
import { isInvalid, rankSpots, spotError, type Spot } from './rankSpots'

// Kosten van 10_000 per uur: EXP per uur gedeeld door 10_000 is dan de uitkomst.
const spot = (name: string, expPerHour: number, potions = 10_000): Spot => ({
  id: name,
  name,
  expPerHour,
  cost: { potions, ammo: 0, travel: 0 },
})

const names = (spots: Spot[]) => spots.map((s) => s.name)

describe('spotError', () => {
  const ok = (): Spot => ({ id: 'x', name: 'x', expPerHour: 1, cost: { potions: 1, ammo: 1, travel: 1 } })
  const withField = (field: 'expPerHour' | 'potions' | 'ammo' | 'travel', value: number): Spot => {
    const s = ok()
    if (field === 'expPerHour') s.expPerHour = value
    else s.cost[field] = value
    return s
  }
  const cases = [
    { field: 'expPerHour', fill: 'Vul EXP per uur in.', negative: 'EXP per uur kan niet negatief zijn.', tooBig: 'EXP per uur is te groot.' },
    { field: 'potions', fill: 'Vul de potionkosten in (0 als er geen zijn).', negative: 'De potionkosten kunnen niet negatief zijn.', tooBig: 'De potionkosten zijn te groot.' },
    { field: 'ammo', fill: 'Vul de ammokosten in (0 als er geen zijn).', negative: 'De ammokosten kunnen niet negatief zijn.', tooBig: 'De ammokosten zijn te groot.' },
    { field: 'travel', fill: 'Vul de reiskosten in (0 als er geen zijn).', negative: 'De reiskosten kunnen niet negatief zijn.', tooBig: 'De reiskosten zijn te groot.' },
  ] as const

  it('geeft null voor een geldige plek, ook met alles op 0', () => {
    expect(spotError(ok())).toBeNull()
    expect(spotError({ id: 'x', name: '', expPerHour: 0, cost: { potions: 0, ammo: 0, travel: 0 } })).toBeNull()
  })

  for (const c of cases) {
    it(`meldt ${c.field}: leeg (NaN), negatief en te groot`, () => {
      expect(spotError(withField(c.field, NaN))).toBe(c.fill)
      expect(spotError(withField(c.field, -1))).toBe(c.negative)
      expect(spotError(withField(c.field, Infinity))).toBe(c.tooBig)
    })
  }

  it('meldt de eerste fout als er meer zijn (EXP per uur voor kosten)', () => {
    const s = ok()
    s.expPerHour = NaN
    s.cost.potions = -1
    expect(spotError(s)).toBe('Vul EXP per uur in.')
  })
})

describe('rankSpots foutteksten', () => {
  it('gebruikt de tekst van spotError als error', () => {
    const bad: Spot = { id: 'b', name: 'b', expPerHour: 1, cost: { potions: NaN, ammo: 0, travel: 0 } }
    const [r] = rankSpots([bad])
    expect(isInvalid(r) && r.error).toBe(spotError(bad))
    expect(isInvalid(r) && r.error).toBe('Vul de potionkosten in (0 als er geen zijn).')
  })
})

describe('rankSpots', () => {
  it('zet de hoogste EXP per meso bovenaan', () => {
    const result = rankSpots([spot('laag', 30_000), spot('hoog', 60_000), spot('midden', 40_000)])
    expect(result.map((r) => r.spot.name)).toEqual(['hoog', 'midden', 'laag'])
    expect(result.map((r) => (isInvalid(r) ? NaN : r.expPerMeso))).toEqual([6, 4, 3])
  })

  it('rangschikt op EXP per meso en niet op EXP per uur', () => {
    // 100_000 / 50_000 = 2 ; 60_000 / 10_000 = 6
    const result = rankSpots([spot('veel exp, duur', 100_000, 50_000), spot('weinig exp, goedkoop', 60_000)])
    expect(result.map((r) => r.spot.name)).toEqual(['weinig exp, goedkoop', 'veel exp, duur'])
  })

  it('zet bij gelijke uitkomst de naam alfabetisch', () => {
    const result = rankSpots([spot('Cactus', 40_000), spot('Appel', 40_000), spot('Banaan', 40_000)])
    expect(result.map((r) => r.spot.name)).toEqual(['Appel', 'Banaan', 'Cactus'])
  })

  it('zet een plek die niets kost (Infinity) bovenaan, onderling op naam', () => {
    const gratis = (name: string) => spot(name, 5_000, 0)
    const result = rankSpots([spot('gewoon', 60_000), gratis('Zeta'), gratis('Alfa')])
    expect(result.map((r) => r.spot.name)).toEqual(['Alfa', 'Zeta', 'gewoon'])
    expect((result[0] as { expPerMeso: number }).expPerMeso).toBe(Infinity)
  })

  it('zet een plek zonder kosten en zonder EXP (0) onderaan de geldige', () => {
    const result = rankSpots([spot('niets', 0, 0), spot('iets', 10_000)])
    expect(names(result.map((r) => r.spot))).toEqual(['iets', 'niets'])
  })

  it('zet ongeldige plekken onderaan met een foutmelding en gooit niet', () => {
    const kapot = spot('kapot', 10_000, -5)
    const nan = spot('nan', Number.NaN)
    let result: ReturnType<typeof rankSpots> = []
    expect(() => {
      result = rankSpots([nan, kapot, spot('goed', 30_000), spot('gratis', 1, 0)])
    }).not.toThrow()
    expect(result.map((r) => r.spot.name)).toEqual(['gratis', 'goed', 'kapot', 'nan'])
    const [, , a, b] = result
    expect(isInvalid(a) && a.error.length > 0).toBe(true)
    expect(isInvalid(b) && b.error.length > 0).toBe(true)
    expect(isInvalid(result[1])).toBe(false)
  })

  it('zet ongeldige plekken onderling op naam', () => {
    const result = rankSpots([spot('B', Number.NaN), spot('A', -1)])
    expect(result.map((r) => r.spot.name)).toEqual(['A', 'B'])
    expect(result.every(isInvalid)).toBe(true)
  })

  it('geeft bij een lege lijst een lege lijst', () => {
    expect(rankSpots([])).toEqual([])
  })

  it('wijzigt de invoer niet', () => {
    const input = [spot('laag', 30_000), spot('hoog', 60_000), spot('kapot', 1, -1)]
    const before = JSON.stringify(input)
    const firstRef = input[0]
    rankSpots(input)
    expect(JSON.stringify(input)).toBe(before)
    expect(input[0]).toBe(firstRef)
  })

  it('geeft de oorspronkelijke plek terug in het resultaat', () => {
    const s = spot('hoog', 60_000)
    expect(rankSpots([s])[0].spot).toBe(s)
  })
})
