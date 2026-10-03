import { describe, expect, it } from 'vitest'
import { expPerHour, potionCostPerHour } from './expPerHour'

describe('expPerHour', () => {
  it('is EXP per kill maal kills per uur', () => {
    expect(expPerHour(19, 600)).toBe(11_400)
    expect(expPerHour(28, 412.5)).toBe(11_550)
  })

  it('past een vermenigvuldiger toe', () => {
    expect(expPerHour(10, 100, 1.5)).toBe(1_500)
  })

  it('is 0 bij 0 kills', () => {
    expect(expPerHour(19, 0)).toBe(0)
  })

  it('weigert negatief, NaN en oneindig, in elk argument', () => {
    const cases: [number, number, number?][] = [[-1, 1], [1, -1], [NaN, 1], [1, NaN], [Infinity, 1], [1, Infinity], [1, 1, -1], [1, 1, NaN]]
    for (const args of cases) expect(() => expPerHour(...args)).toThrow(RangeError)
  })
})

describe('potionCostPerHour', () => {
  it('is potions per uur maal de prijs', () => {
    expect(potionCostPerHour(12, 150)).toBe(1_800)
    expect(potionCostPerHour(2.5, 220)).toBe(550)
  })

  it('is 0 bij 0 potions', () => {
    expect(potionCostPerHour(0, 350)).toBe(0)
  })

  it('weigert negatief, NaN en oneindig', () => {
    expect(() => potionCostPerHour(-1, 150)).toThrow(RangeError)
    expect(() => potionCostPerHour(1, -150)).toThrow(RangeError)
    expect(() => potionCostPerHour(NaN, 150)).toThrow(RangeError)
    expect(() => potionCostPerHour(1, Infinity)).toThrow(RangeError)
  })
})
