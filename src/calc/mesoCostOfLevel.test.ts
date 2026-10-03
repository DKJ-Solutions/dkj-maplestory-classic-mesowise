import { describe, expect, it } from 'vitest'
import { mesoCostOfLevel } from './mesoCostOfLevel'

describe('mesoCostOfLevel', () => {
  it('deelt de EXP tot het volgende level door de EXP per meso', () => {
    expect(mesoCostOfLevel(1_716, 4)).toBe(429)
  })

  it('geeft een gebroken getal waar de deling niet opgaat', () => {
    expect(mesoCostOfLevel(20_216, 3)).toBeCloseTo(6_738.6667, 4)
  })

  it('is 0 op een plek die niets kost', () => {
    expect(mesoCostOfLevel(1_716, Infinity)).toBe(0)
  })

  it('is null (onhaalbaar) op een plek zonder EXP', () => {
    expect(mesoCostOfLevel(1_716, 0)).toBeNull()
  })

  it('weigert EXP tot het volgende level die niet groter dan 0 of niet eindig is', () => {
    for (const bad of [0, -1, Number.NaN, Infinity]) expect(() => mesoCostOfLevel(bad, 4)).toThrow(RangeError)
  })

  it('weigert negatieve of ontbrekende EXP per meso', () => {
    expect(() => mesoCostOfLevel(1_716, -1)).toThrow(RangeError)
    expect(() => mesoCostOfLevel(1_716, Number.NaN)).toThrow(RangeError)
  })
})
