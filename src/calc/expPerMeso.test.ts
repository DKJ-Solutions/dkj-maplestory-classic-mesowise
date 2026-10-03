import { describe, expect, it } from 'vitest'
import { expPerMeso, totalCostPerHour } from './expPerMeso'

describe('totalCostPerHour', () => {
  it('telt potions, ammo en reizen op', () => {
    expect(totalCostPerHour({ potions: 12_000, ammo: 3_000, travel: 500 })).toBe(15_500)
  })

  it('weigert een negatieve of niet-eindige post', () => {
    expect(() => totalCostPerHour({ potions: -1, ammo: 0, travel: 0 })).toThrow(RangeError)
    expect(() => totalCostPerHour({ potions: 0, ammo: Number.NaN, travel: 0 })).toThrow(RangeError)
    expect(() => totalCostPerHour({ potions: 0, ammo: 0, travel: Infinity })).toThrow(RangeError)
  })
})

describe('expPerMeso', () => {
  it('deelt EXP per uur door de kosten per uur', () => {
    expect(expPerMeso(60_000, { potions: 10_000, ammo: 4_000, travel: 1_000 })).toBe(4)
  })

  it('geeft een gebroken getal waar de deling niet opgaat', () => {
    expect(expPerMeso(10_000, { potions: 3_000, ammo: 0, travel: 0 })).toBeCloseTo(3.3333, 4)
  })

  it('is onbegrensd als een plek met EXP niets kost', () => {
    expect(expPerMeso(5_000, { potions: 0, ammo: 0, travel: 0 })).toBe(Infinity)
  })

  it('is 0 als een plek niets kost en niets oplevert', () => {
    expect(expPerMeso(0, { potions: 0, ammo: 0, travel: 0 })).toBe(0)
  })

  it('weigert negatieve of niet-eindige EXP', () => {
    const cost = { potions: 1, ammo: 0, travel: 0 }
    expect(() => expPerMeso(-1, cost)).toThrow(RangeError)
    expect(() => expPerMeso(Number.NaN, cost)).toThrow(RangeError)
  })
})
