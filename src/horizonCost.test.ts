import { describe, expect, it } from 'vitest'
import { horizonCost, byNet } from './horizonCost'

// EXP naar het volgende level, met de hand uit de EXP-tabel: lv 15 = 7.050, lv 16 = 8.840, lv 17 = 11.040.
describe('horizonCost', () => {
  it('is voor één level de EXP gedeeld door de EXP per meso', () => {
    expect(horizonCost(15, 15, 2)).toBeCloseTo(7_050 / 2, 9)
  })

  it('telt de levels van from tot en met to op', () => {
    expect(horizonCost(15, 17, 4)).toBeCloseTo((7_050 + 8_840 + 11_040) / 4, 9)
  })

  it('is 0 als de plek niets kost (Infinity EXP per meso)', () => {
    expect(horizonCost(15, 17, Infinity)).toBe(0)
  })

  it('is null als de plek geen EXP geeft: elk level is dan onhaalbaar', () => {
    expect(horizonCost(15, 17, 0)).toBeNull()
  })

  it('neemt met een functie per level de EXP per meso van dat level (#145)', () => {
    expect(horizonCost(15, 16, (level) => (level === 15 ? 2 : 4))).toBeCloseTo(7_050 / 2 + 8_840 / 4, 9)
  })

  it('is undefined als de functie op een level geen EXP per meso kent, en null als een level onhaalbaar is', () => {
    expect(horizonCost(15, 17, (level) => (level === 16 ? undefined : 2))).toBeUndefined()
    expect(horizonCost(15, 17, (level) => (level === 16 ? 0 : 2))).toBeNull()
  })

  it('is 0 bij een lege horizon (from na to)', () => {
    expect(horizonCost(16, 15, 2)).toBe(0)
  })
})

describe('byNet', () => {
  it('sorteert van meeste naar minste netto, met null expliciet achteraan', () => {
    const rows = [{ net: null }, { net: -5 }, { net: 10 }, { net: null }, { net: 0 }, { net: 3 }]
    expect([...rows].sort(byNet).map((r) => r.net)).toEqual([10, 3, 0, -5, null, null])
  })

  it('zet null ook achter een zwaar negatieve netto', () => {
    expect([{ net: null }, { net: -1e9 }].sort(byNet).map((r) => r.net)).toEqual([-1e9, null])
  })
})
